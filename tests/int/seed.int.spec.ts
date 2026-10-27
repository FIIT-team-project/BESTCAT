import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import type { Where } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { down, up } from '@/migrations/seed'

type Document = { id: number; [field: string]: unknown }
type Operation = { collection: string; data: Record<string, unknown>; req: unknown }
const relationships: Record<string, Record<string, string>> = {
  catOwners: { userId: 'users', catId: 'cats' },
  shows: { chiefStewardId: 'users' },
  events: { showId: 'shows', judgeId: 'users', stewardId: 'users' },
  catEventEntries: { catId: 'cats', eventId: 'events' },
}

function fixture() {
  const records: Record<string, Document[]> = Object.fromEntries(
    ['users', 'cats', 'catOwners', 'shows', 'events', 'catEventEntries'].map((name) => [name, []]),
  )
  const req = { transactionID: 'seed-test-transaction' }

  function matches(collection: string, doc: Document, where: Where): boolean {
    return Object.entries(where).every(([path, condition]) => {
      if (path === 'and')
        return (condition as Where[]).every((item) => matches(collection, doc, item))
      let value: unknown = doc
      let currentCollection = collection
      for (const part of path.split('.')) {
        value = (value as Document)[part]
        const relation = relationships[currentCollection]?.[part]
        if (relation) {
          currentCollection = relation
          value = records[relation].find((record) => record.id === value)
        }
      }
      if (value && typeof value === 'object') value = (value as Document).id
      return (condition as { in: unknown[] }).in.includes(value)
    })
  }

  const create = vi.fn(async ({ collection, data, req: operationReq }: Operation) => {
    expect(operationReq).toBe(req)
    // Enforce required references before accepting an insert.
    for (const [field, target] of Object.entries(relationships[collection] ?? {})) {
      if (!records[target].some((doc) => doc.id === data[field])) {
        throw new Error(`Missing reference ${collection}.${field}`)
      }
    }
    const doc = { id: records[collection].length + 1, ...data }
    records[collection].push(doc)
    return doc
  })
  const payload = {
    create,
    logger: { info: vi.fn() },
    find: vi.fn(async ({ collection, where }: { collection: string; where: Where }) => ({
      docs: records[collection].filter((doc) => matches(collection, doc, where)),
    })),
    delete: vi.fn(
      async ({
        collection,
        where,
        req: operationReq,
      }: {
        collection: string
        where: Where
        req: unknown
      }) => {
        expect(operationReq).toBe(req)
        const removed = records[collection].filter((doc) => matches(collection, doc, where))
        for (const [source, fields] of Object.entries(relationships)) {
          for (const [field, target] of Object.entries(fields)) {
            if (target === collection) {
              expect(
                records[source].some((doc) => removed.some((item) => item.id === doc[field])),
              ).toBe(false)
            }
          }
        }
        records[collection] = records[collection].filter((doc) => !removed.includes(doc))
      },
    ),
  }
  return { records, payload, args: { payload, req } as unknown as MigrateUpArgs & MigrateDownArgs }
}

describe('Sample data seed', () => {
  const images = Array.from({ length: 150 }, (_, i) => ({
    url: `https://cdn2.thecatapi.com/images/demo-${i}.jpg`,
  }))

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = new URL(input)
        const page = Number(url.searchParams.get('page'))
        return { ok: true, json: async () => images.slice(page * 10, (page + 1) * 10) }
      }),
    )
    vi.stubEnv('CAT_API_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('assigns a distinct API image to every cat across authenticated pages', async () => {
    vi.stubEnv('CAT_API_KEY', 'test-key')
    const { records, args } = fixture()
    await up(args)

    expect(fetch).toHaveBeenCalledTimes(15)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.thecatapi.com/v1/images/search?limit=100&mime_types=jpg,png&order=ASC&page=0',
      expect.objectContaining({ headers: { 'x-api-key': 'test-key' } }),
    )
    expect(records.cats.every((cat) => images.some((image) => image.url === cat.imageUrl))).toBe(
      true,
    )
    expect(new Set(records.cats.map((cat) => cat.imageUrl)).size).toBe(150)
  })

  it('rejects repeated API pages instead of silently reusing photos', async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json([images[0]]))
    const { payload, args } = fixture()
    await expect(up(args)).rejects.toThrow('too few distinct')
    expect(payload.create).not.toHaveBeenCalled()
  })

  it.each([
    { ok: false, status: 429 },
    { ok: true, json: async () => [] },
    { ok: true, json: async () => [{ url: 'javascript:alert(1)' }, null] },
  ])(
    'rejects failed or unusable image responses before inserting records: %j',
    async (response) => {
      vi.mocked(fetch).mockResolvedValue(
        Response.json(response.json ? await response.json() : null, {
          status: response.status ?? 200,
        }),
      )
      const { payload, args } = fixture()
      await expect(up(args)).rejects.toThrow('The Cat API')
      expect(payload.create).not.toHaveBeenCalled()
    },
  )

  it('creates the requested counts and complete relationships in one migration request', async () => {
    const { records, args } = fixture()
    await up(args)

    expect(
      Object.fromEntries(Object.entries(records).map(([name, docs]) => [name, docs.length])),
    ).toEqual({
      users: 34,
      cats: 150,
      catOwners: 160,
      shows: 3,
      events: 18,
      catEventEntries: 540,
    })
    expect(records.shows.filter((show) => show.isActive)).toHaveLength(1)
    expect(records.shows.filter((show) => !show.isActive)).toHaveLength(2)
    expect(new Set(records.cats.map((cat) => cat.wcfId)).size).toBe(150)
    expect(new Set(records.cats.map((cat) => cat.name)).size).toBe(150)
    expect(new Set(records.cats.map((cat) => cat.breed)).size).toBe(10)
    expect(records.cats.every((cat) => String(cat.wcfId).startsWith('DEMO-'))).toBe(true)
    expect(
      records.cats.every((cat) => records.catOwners.some((link) => link.catId === cat.id)),
    ).toBe(true)
    expect(new Set(records.catOwners.map((link) => `${link.userId}:${link.catId}`)).size).toBe(160)
    expect(
      new Set(records.catEventEntries.map((entry) => `${entry.catId}:${entry.eventId}`)).size,
    ).toBe(540)
    expect(records.users.filter((user) => user.role === 'admin')).toMatchObject([
      { email: 'admin@example.com', password: 'admin' },
    ])
    expect(records.users.filter((user) => user.role === 'user')).toHaveLength(33)
  })

  it('seeds coherent judging queues, results, and optional ring entries for every show', async () => {
    const { records, args } = fixture()
    await up(args)

    for (const show of records.shows) {
      const events = records.events.filter((event) => event.showId === show.id)
      const tables = events.filter((event) => event.eventType === 'traditionalJudging')
      const ring = events.find((event) => event.eventType === 'wcfRingAdults')!
      expect(tables).toHaveLength(5)
      const traditionalCatIDs = tables.flatMap((event) => {
        const entries = records.catEventEntries.filter((entry) => entry.eventId === event.id)
        expect(entries).toHaveLength(30)
        expect(entries.map((entry) => entry.queuePosition)).toEqual(
          Array.from({ length: 30 }, (_, i) => i + 1),
        )
        expect(
          entries
            .filter((entry) => entry.status !== 'completed')
            .every((entry) => entry.rating === null),
        ).toBe(true)
        return entries.map((entry) => entry.catId)
      })
      expect(new Set(traditionalCatIDs).size).toBe(150)
      const ringEntries = records.catEventEntries.filter((entry) => entry.eventId === ring.id)
      expect(ringEntries).toHaveLength(30)
      expect(ringEntries.every((entry) => traditionalCatIDs.includes(entry.catId))).toBe(true)
    }

    const statuses = new Set(records.catEventEntries.map((entry) => entry.status))
    expect(statuses).toEqual(new Set(['completed', 'judging', 'called', 'queued']))
    const rankings = records.catEventEntries.filter((entry) => /^\d+$/.test(String(entry.rating)))
    expect(rankings.map((entry) => entry.rating)).toEqual(
      Array.from({ length: 10 }, (_, i) => String(i + 1)),
    )
  })

  it('rolls back the sample records in dependency order and preserves unrelated records', async () => {
    const { records, args } = fixture()
    await up(args)
    const unrelatedUser = { id: 999, email: 'unrelated@example.com', role: 'user' }
    const unrelatedCat = { id: 999, wcfId: 'UNRELATED-001' }
    records.users.push(unrelatedUser)
    records.cats.push(unrelatedCat)

    await down(args)

    expect(records.users).toEqual([unrelatedUser])
    expect(records.cats).toEqual([unrelatedCat])
    for (const collection of ['catOwners', 'shows', 'events', 'catEventEntries']) {
      expect(records[collection]).toEqual([])
    }
  })
})
