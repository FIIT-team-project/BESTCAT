// @vitest-environment node

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createLocalReq, getPayload, handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Show, User } from '@/payload-types'
import { importShow, ShowImportError } from '@/lib/show-import/importShow'
import { mapRows, type SheetTable } from '@/lib/show-import/mapRows'
import { readSpreadsheet } from '@/lib/show-import/readSpreadsheet'
import type { ShowImportData, ShowImportOptions } from '@/lib/show-import/types'

const fixture = path.resolve('tests/fixtures/show-import-hrnciarovce-2024.xlsx')

const sessions = ['Sobota 1', 'Sobota 2', 'Nedeľa 1', 'Nedeľa 2']

const table = (headers: string[], ...rows: string[][]): SheetTable => ({
  headers,
  rows: rows.map((cells, index) => ({ row: index + 2, cells })),
})

const headers = ['No', 'Breed', 'Colour', 'Sex', 'Show Class', 'Kategória', 'WCF Skupina']

describe('Show import spreadsheet mapping', () => {
  let data: ShowImportData

  beforeAll(async () => {
    data = mapRows(await readSpreadsheet(await readFile(fixture)))
  })

  it('reads every cat of the organizer spreadsheet', () => {
    expect(data.errors).toEqual([])
    expect(data.cats).toHaveLength(110)
    expect(data.sessions).toEqual(sessions)
    expect(data.judgeCodes).toEqual(['A', 'B', 'C', 'D'])
    expect(data.cats[0]).toEqual({
      row: 2,
      catalogNumber: 1,
      breed: 'BLH',
      color: 'a',
      sex: 'Female',
      showClass: 'CACE',
      wcfGroup: 'Adult',
      category: 1,
      name: undefined,
      birthday: undefined,
      wcfId: undefined,
      judges: { 'Sobota 1': 'B', 'Sobota 2': 'C', 'Nedeľa 1': 'A', 'Nedeľa 2': 'D' },
    })
  })

  it('matches the per-judge totals of the summary sheet', () => {
    const count = (session: string, code: string) =>
      data.cats.filter((cat) => cat.judges[session] === code).length
    expect(
      sessions.map((session) => ['A', 'B', 'C', 'D'].map((code) => count(session, code))),
    ).toEqual([
      [29, 28, 28, 25],
      [29, 28, 28, 25],
      [27, 25, 28, 30],
      [25, 29, 26, 30],
    ])
  })

  it('matches columns by header, in any order, and takes the group from ticks', () => {
    const result = mapRows(
      table(
        ['Sobota 1', 'Breed', 'No.', 'Color', 'Sex', 'Show Class', 'Category', 'Adult', 'Veteran'],
        ['a', 'MCO', '7', 'n', 'Male', 'CAC', '2', 'X', ''],
      ),
    )
    expect(result.errors).toEqual([])
    expect(result.cats[0]).toMatchObject({
      catalogNumber: 7,
      color: 'n',
      wcfGroup: 'Adult',
      judges: { 'Sobota 1': 'A' },
    })
  })

  it('imports optional name, birthday and WCF ID columns', () => {
    const result = mapRows(
      table(
        [...headers, 'Name', 'Birthday', 'WCF ID', 'Sobota 1'],
        [
          '1',
          'BLH',
          'a',
          'Female',
          'CACE',
          '1',
          'Adult',
          'Aristo Cats Luna',
          '28-05-2021',
          '406222',
          'B',
        ],
      ),
    )
    expect(result.cats[0]).toMatchObject({
      name: 'Aristo Cats Luna',
      birthday: '2021-05-28',
      wcfId: '406222',
    })
  })

  it('reports missing columns and invalid rows', () => {
    expect(mapRows(table(['No', 'Breed', 'Sobota 1'], ['1', 'BLH', 'A'])).errors).toEqual(
      expect.arrayContaining([{ message: 'Required column "Colour" is missing.' }]),
    )

    const result = mapRows(
      table(
        [...headers, 'Sobota 1'],
        ['1', 'BLH', 'a', 'Female', 'CACE', '1', 'Adult', 'A'],
        ['1', 'BLH', 'a', 'Female', 'CACE', 'x', 'Adult', 'B'],
        ['', '', '', '', '', '', '', ''],
      ),
    )
    expect(result.errors).toEqual([
      { row: 3, message: 'Catalog number 1 is already used in row 2.' },
      { row: 3, message: '"Kategória" must be a positive whole number, got "x".' },
    ])
  })

  it('ignores unknown columns that do not hold judge codes', () => {
    const result = mapRows(
      table(
        [...headers, 'Sobota 1', 'Poznámka'],
        ['1', 'BLH', 'a', 'Female', 'CACE', '1', 'Adult', 'A', 'late arrival'],
      ),
    )
    expect(result.sessions).toEqual(['Sobota 1'])
    expect(result.warnings).toEqual([
      { message: 'Column "Poznámka" is not recognized and was ignored.' },
    ])
  })
})

describe('Show import into the database', () => {
  let payload: Payload
  let databaseDir: string
  let data: ShowImportData
  let show: Show
  let judges: User[]
  let options: ShowImportOptions

  const countShowData = async () => {
    const events = await payload.find({
      collection: 'events',
      where: { show: { equals: show.id } },
      limit: 0,
      depth: 0,
    })
    const entries = await payload.count({
      collection: 'cat-event-entries',
      where: { event: { in: events.docs.map((event) => event.id) } },
    })
    const cats = await payload.count({ collection: 'cats' })
    return { events: events.totalDocs, entries: entries.totalDocs, cats: cats.totalDocs }
  }

  beforeAll(async () => {
    databaseDir = await mkdtemp(path.join(tmpdir(), 'bestcat-import-'))
    const payloadConfig = await config
    payload = await getPayload({
      key: databaseDir,
      disableOnInit: true,
      config: {
        ...payloadConfig,
        secret: 'import-test-secret',
        db: {
          ...payloadConfig.db,
          init: (args) => ({
            ...payloadConfig.db.init(args),
            clientConfig: { url: `file:${path.join(databaseDir, 'payload.db')}` },
          }),
        },
      },
    })

    judges = []
    for (const code of ['A', 'B', 'C', 'D']) {
      judges.push(
        await payload.create({
          collection: 'users',
          data: { email: `judge-${code}@example.com`, password: 'test-password', name: code },
        }),
      )
    }
    show = await payload.create({
      collection: 'shows',
      data: {
        chief_steward: judges[0].id,
        organization: 'Terra Felis Slovakia',
        show_name: 'Jubilee Show',
        city: 'Hrnčiarovce nad Parnou',
        country: 'Slovakia',
        license_number: 'L#244205',
        start_date: '2024-12-28',
        end_date: '2024-12-29',
        is_active: false,
      },
    })

    data = mapRows(await readSpreadsheet(await readFile(fixture)))
    options = {
      judges: Object.fromEntries(judges.map((judge, index) => ['ABCD'[index], judge.id])),
      stewards: { A: judges[1].id },
      sessionDates: {
        'Sobota 1': '2024-12-28',
        'Sobota 2': '2024-12-28',
        'Nedeľa 1': '2024-12-29',
        'Nedeľa 2': '2024-12-29',
      },
    }
  })

  afterAll(async () => {
    await payload?.destroy()
    if (databaseDir) await rm(databaseDir, { recursive: true, force: true })
  })

  it('refuses to import without a judge for every code and a date for every session', async () => {
    const error = await importShow(payload, {
      show,
      data,
      options: { ...options, judges: { A: judges[0].id }, sessionDates: {} },
    }).catch((error) => error)

    expect(error).toBeInstanceOf(ShowImportError)
    expect(error.problems).toEqual(
      expect.arrayContaining(['Choose a judge for code B.', 'Choose a date for "Sobota 1".']),
    )
    expect(await countShowData()).toEqual({ events: 0, entries: 0, cats: 0 })
  })

  it('creates cats, one table event per session and judge, and ordered queue entries', async () => {
    expect(await importShow(payload, { show, data, options })).toEqual({
      cats: 110,
      events: 16,
      entries: 440,
      replacedEvents: 0,
    })

    const { docs } = await payload.find({
      collection: 'events',
      where: { name: { equals: 'Sobota 1 – Judge A' } },
      depth: 0,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({
      show: show.id,
      judge: judges[0].id,
      steward: judges[1].id,
      event_type: 'table',
    })
    expect(docs[0].event_date.slice(0, 10)).toBe('2024-12-28')

    const { docs: entries } = await payload.find({
      collection: 'cat-event-entries',
      where: { event: { equals: docs[0].id } },
      sort: 'queue_number',
      depth: 1,
      limit: 0,
    })
    expect(entries).toHaveLength(29)
    expect(entries.slice(0, 3).map((entry) => [entry.queue_number, entry.cat_status])).toEqual([
      [1, 'registered'],
      [2, 'registered'],
      [3, 'registered'],
    ])
    expect(entries[0].cat).toMatchObject({
      catalog_number: 2,
      breed: 'BLH',
      show_class: 'CAC',
      wcf_group: 'Adult',
      category: 1,
      name: null,
      owner: null,
    })
  }, 60_000)

  it('replaces previously imported data instead of duplicating it', async () => {
    const result = await importShow(payload, { show, data, options })
    expect(result.replacedEvents).toBe(16)
    expect(await countShowData()).toEqual({ events: 16, entries: 440, cats: 110 })
  }, 60_000)

  it('does not replace a show whose judging has started', async () => {
    const { docs } = await payload.find({ collection: 'cat-event-entries', limit: 1, depth: 0 })
    await payload.update({
      collection: 'cat-event-entries',
      id: docs[0].id,
      data: { cat_status: 'called' },
    })

    await expect(importShow(payload, { show, data, options })).rejects.toBeInstanceOf(
      ShowImportError,
    )
    expect(await countShowData()).toEqual({ events: 16, entries: 440, cats: 110 })
  })

  it('previews the file through the endpoint for administrators only', async () => {
    const admin = await payload.create({
      collection: 'admins',
      data: { email: 'admin@example.com', password: 'test-password' },
      req: await createLocalReq({}, payload),
    })
    const login = (collection: 'admins' | 'users', email: string) =>
      payload.login({ collection, data: { email, password: 'test-password' } })

    const post = async (token: string) => {
      const body = new FormData()
      body.append(
        'file',
        new Blob([await readFile(fixture)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        'show.xlsx',
      )
      body.append('_payload', JSON.stringify({ mode: 'preview' }))
      return handleEndpoints({
        config: payload.config,
        payloadInstanceCacheKey: databaseDir,
        request: new Request(`http://localhost:3000/api/shows/${show.id}/import`, {
          method: 'POST',
          headers: { Authorization: `JWT ${token}` },
          body,
        }),
      })
    }

    const { token: adminToken } = await login('admins', admin.email)
    const response = await post(adminToken!)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      cats: 110,
      sessions,
      judgeCodes: ['A', 'B', 'C', 'D'],
      counts: { 'Sobota 1': { A: 29, B: 28, C: 28, D: 25 } },
      errors: [],
      existingEvents: 16,
    })

    const { token: userToken } = await login('users', judges[0].email)
    expect((await post(userToken!)).status).toBe(403)
  })
})
