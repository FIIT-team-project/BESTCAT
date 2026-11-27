// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Cat, CatEventEntry, User } from '@/payload-types'
import { findExhibitorEntries, findExhibitorEntry } from '@/lib/exhibitor/entries'

describe('Exhibitor cat entries', () => {
  let payload: Payload
  let databaseDir: string
  let owner: User
  let otherOwner: User
  let ownEntry: CatEventEntry
  let otherEntry: CatEventEntry
  let inactiveShowEntry: CatEventEntry

  const createUser = (email: string, name: string) =>
    payload.create({ collection: 'users', data: { email, password: 'test-password', name } })

  const createCat = (owner: User, name: string, catalogNumber: number) =>
    payload.create({
      collection: 'cats',
      data: {
        name,
        breed: 'Maine Coon',
        color: 'Black',
        sex: 'female',
        birthday: '2024-03-18',
        owner: owner.id,
        wcf_id: `WCF-${catalogNumber}`,
        catalog_number: catalogNumber,
      },
    })

  const createEvent = async (isActive: boolean, judge: User) => {
    const show = await payload.create({
      collection: 'shows',
      data: {
        chief_steward: judge.id,
        organization: 'WCF',
        show_name: isActive ? 'Active show' : 'Old show',
        city: 'Bratislava',
        country: 'Slovakia',
        license_number: 'L#244205',
        is_active: isActive,
      },
    })
    return payload.create({
      collection: 'events',
      data: {
        show: show.id,
        judge: judge.id,
        steward: judge.id,
        name: 'Table 1',
        event_type: 'table',
        start_time: '2026-12-28T12:00:00.001Z',
        status: 'planned',
      },
    })
  }

  const createEntry = (cat: Cat, event: { id: number }, queueNumber: number) =>
    payload.create({
      collection: 'cat-event-entries',
      data: { cat: cat.id, event: event.id, queue_number: queueNumber, cat_status: 'waiting' },
    })

  beforeAll(async () => {
    databaseDir = await mkdtemp(path.join(tmpdir(), 'bestcat-exhibitor-'))
    const payloadConfig = await config
    payload = await getPayload({
      key: databaseDir,
      config: {
        ...payloadConfig,
        secret: 'exhibitor-test-secret',
        db: {
          ...payloadConfig.db,
          init: (args) => ({
            ...payloadConfig.db.init(args),
            clientConfig: { url: `file:${path.join(databaseDir, 'payload.db')}` },
          }),
        },
      },
    })

    owner = await createUser('owner@example.com', 'Owner')
    otherOwner = await createUser('other@example.com', 'Other owner')
    const judge = await createUser('judge@example.com', 'Judge')

    // The old show is created first, so it is inactive when the active one is added.
    const oldEvent = await createEvent(false, judge)
    const activeEvent = await createEvent(true, judge)

    const ownCat = await createCat(owner, 'Luna', 128)
    const otherCat = await createCat(otherOwner, 'Bella', 135)

    ownEntry = await createEntry(ownCat, activeEvent, 2)
    otherEntry = await createEntry(otherCat, activeEvent, 1)
    inactiveShowEntry = await createEntry(ownCat, oldEvent, 1)
  })

  afterAll(async () => {
    await payload?.destroy()
    if (databaseDir) await rm(databaseDir, { recursive: true, force: true })
  })

  it("lists only the user's own cats in the active show", async () => {
    const entries = await findExhibitorEntries(payload, owner.id)

    expect(entries.map(({ id }) => id)).toEqual([ownEntry.id])
    expect(entries[0]).toMatchObject({
      cat: { name: 'Luna', catalog_number: 128 },
      event: { name: 'Table 1', show: { show_name: 'Active show' } },
    })
  })

  it('returns an own entry and hides entries of other exhibitors', async () => {
    expect(await findExhibitorEntry(payload, owner.id, ownEntry.id)).toMatchObject({
      id: ownEntry.id,
      cat: { name: 'Luna' },
    })
    expect(await findExhibitorEntry(payload, owner.id, otherEntry.id)).toBeNull()
    expect(await findExhibitorEntry(payload, otherOwner.id, ownEntry.id)).toBeNull()
  })

  it('still shows own entries from older shows in the detail', async () => {
    expect(await findExhibitorEntry(payload, owner.id, inactiveShowEntry.id)).not.toBeNull()
  })
})
