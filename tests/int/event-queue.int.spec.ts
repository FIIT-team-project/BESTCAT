// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { Admin, CatEventEntry, Event, User } from '@/payload-types'
import {
  QueueError,
  callEntry,
  findEventEntries,
  findStaffEvent,
  markEntryAbsent,
  rateEntry,
  revertEntry,
} from '@/lib/events/queue'
import { normalizePhoneNumber } from '@/lib/sms'

type AsUser = User & { collection: 'users' }

describe('Event queue', () => {
  let payload: Payload
  let databaseDir: string
  let judge: AsUser
  let steward: AsUser
  let outsider: AsUser
  let admin: Admin & { collection: 'admins' }
  let event: Event
  let entry: CatEventEntry

  const asUser = (user: User): AsUser => ({ ...user, collection: 'users' })
  const createUser = async (email: string, name: string, phone_number?: string) =>
    asUser(
      await payload.create({
        collection: 'users',
        data: { email, password: 'test-password', name, phone_number },
      }),
    )
  const reload = () => payload.findByID({ collection: 'cat-event-entries', id: entry.id })

  beforeAll(async () => {
    databaseDir = await mkdtemp(path.join(tmpdir(), 'bestcat-queue-'))
    const payloadConfig = await config
    payload = await getPayload({
      key: databaseDir,
      config: {
        ...payloadConfig,
        secret: 'queue-test-secret',
        db: {
          ...payloadConfig.db,
          init: (args) => ({
            ...payloadConfig.db.init(args),
            clientConfig: { url: `file:${path.join(databaseDir, 'payload.db')}` },
          }),
        },
      },
    })

    judge = await createUser('judge@example.com', 'Judge')
    steward = await createUser('steward@example.com', 'Steward')
    outsider = await createUser('outsider@example.com', 'Outsider')
    const owner = await createUser('owner@example.com', 'Owner', '0900 123 456')
    admin = {
      ...(await payload.create({
        collection: 'admins',
        data: { email: 'admin@example.com', password: 'test-password' },
      })),
      collection: 'admins',
    }

    const show = await payload.create({
      collection: 'shows',
      data: {
        chief_steward: steward.id,
        organization: 'WCF',
        show_name: 'Test show',
        city: 'Bratislava',
        country: 'Slovakia',
        license_number: 'L#244205',
        is_active: true,
      },
    })
    event = await payload.create({
      collection: 'events',
      data: {
        show: show.id,
        judge: judge.id,
        steward: steward.id,
        name: 'Table 5',
        event_type: 'table',
        event_date: '2026-12-28',
      },
    })
    const cat = await payload.create({
      collection: 'cats',
      data: {
        name: 'Luna',
        breed: 'Maine Coon',
        color: 'Black',
        sex: 'female',
        birthday: '2024-03-18',
        owner: owner.id,
        wcf_id: 'WCF-254',
        catalog_number: 254,
      },
    })
    entry = await payload.create({
      collection: 'cat-event-entries',
      data: { cat: cat.id, event: event.id, queue_number: 1, cat_status: 'waiting' },
    })
  })

  beforeEach(async () => {
    await payload.update({
      collection: 'cat-event-entries',
      id: entry.id,
      data: { cat_status: 'waiting', called_at: null, title: null, score: null, place: null },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await payload?.destroy()
    if (databaseDir) await rm(databaseDir, { recursive: true, force: true })
  })

  it('gives access to the event only to its staff and admins', async () => {
    expect((await findStaffEvent(payload, judge, event.id))?.roles).toEqual(['judge'])
    expect((await findStaffEvent(payload, steward, event.id))?.roles).toEqual(['steward'])
    expect((await findStaffEvent(payload, admin, event.id))?.roles).toEqual(['judge', 'steward'])
    expect(await findStaffEvent(payload, outsider, event.id)).toBeNull()
    expect(await findStaffEvent(payload, judge, 999999)).toBeNull()
  })

  it('calls a cat, records the time and logs the SMS without a Brevo key', async () => {
    vi.stubEnv('BREVO_API_KEY', '')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const logSpy = vi.spyOn(payload.logger, 'info')

    await callEntry(payload, steward, entry.id)

    const called = await reload()
    expect(called.cat_status).toBe('called')
    expect(called.called_at).toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: '421900123456', text: expect.stringContaining('#254') }),
    )
  })

  it('lets the judge manage the queue but not outsiders', async () => {
    await expect(callEntry(payload, outsider, entry.id)).rejects.toBeInstanceOf(QueueError)
    await callEntry(payload, judge, entry.id)
    expect((await reload()).cat_status).toBe('called')
  })

  it('marks a called cat absent and reverts it to waiting', async () => {
    await callEntry(payload, steward, entry.id)
    await markEntryAbsent(payload, steward, entry.id)
    expect((await reload()).cat_status).toBe('absent')

    await revertEntry(payload, steward, entry.id)
    const reverted = await reload()
    expect(reverted.cat_status).toBe('waiting')
    expect(reverted.called_at).toBeNull()

    await expect(markEntryAbsent(payload, steward, entry.id)).rejects.toBeInstanceOf(QueueError)
  })

  it('lets only the judge rate a called cat', async () => {
    const rating = { title: 'EX1', score: 9, place: 1, text_rating: 'Beautiful coat.' }
    await expect(rateEntry(payload, judge, entry.id, rating)).rejects.toThrow('Only called cats')

    await callEntry(payload, steward, entry.id)
    await expect(rateEntry(payload, steward, entry.id, rating)).rejects.toBeInstanceOf(QueueError)
    await rateEntry(payload, judge, entry.id, rating)

    expect(await reload()).toMatchObject({ ...rating, cat_status: 'rated' })
  })

  it('rejects a score outside 0–10', async () => {
    await callEntry(payload, steward, entry.id)
    await expect(
      rateEntry(payload, judge, entry.id, {
        title: null,
        score: 11,
        place: null,
        text_rating: null,
      }),
    ).rejects.toThrow()
  })

  it('filters the queue by catalog number', async () => {
    expect(await findEventEntries(payload, event.id, 254)).toHaveLength(1)
    expect(await findEventEntries(payload, event.id, 1)).toHaveLength(0)
  })

  it('normalizes Slovak phone numbers for Brevo', () => {
    expect(normalizePhoneNumber('+421 900 123 456')).toBe('421900123456')
    expect(normalizePhoneNumber('00421900123456')).toBe('421900123456')
    expect(normalizePhoneNumber('0900 123 456')).toBe('421900123456')
  })
})
