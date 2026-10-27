import type { CollectionConfig, FieldAccess, PayloadRequest, Where } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { CatEventEntries } from '@/collections/CatEventEntries'
import { Cats } from '@/collections/Cats'
import { Events } from '@/collections/Events'
import { Shows } from '@/collections/Shows'
import { Users } from '@/collections/Users'
import { getActiveShow } from '../helpers/getActiveShow'
import type { User } from '@/payload-types'

const showA = { id: 10, chiefStewardId: 2 }
const showB = { id: 11, chiefStewardId: 3 }
const eventA = { id: 100, showId: showA, judgeId: 4, stewardId: 5 }
const eventB = { id: 101, showId: showB, judgeId: 5, stewardId: 4 }
const entryA = { id: 200, eventId: eventA, catId: 300 }
const entryB = { id: 201, eventId: eventB, catId: 301 }

type RecordData = Record<string, unknown>

// Apply Payload's equality/in/and/or constraints to two independent show fixtures.
function matches(doc: RecordData, where: Where): boolean {
  return Object.entries(where).every(([path, condition]) => {
    if (path === 'and') return (condition as Where[]).every((item) => matches(doc, item))
    if (path === 'or') return (condition as Where[]).some((item) => matches(doc, item))

    let value: unknown = doc
    for (const part of path.split('.')) value = (value as RecordData)?.[part]
    if (value && typeof value === 'object') value = (value as RecordData).id
    const filter = condition as { equals?: unknown; in?: unknown[] }
    return filter.in ? filter.in.includes(value) : value === filter.equals
  })
}

function request(id?: number): PayloadRequest {
  const user = id ? ({ id, collection: 'users', role: id === 1 ? 'admin' : 'user' } as User) : null
  return {
    user,
    payload: {
      count: vi.fn(async ({ collection, where }) => {
        const docs = collection === 'shows' ? [showA, showB] : [eventA, eventB]
        return { totalDocs: docs.filter((doc) => matches(doc, where)).length }
      }),
      find: vi.fn(async ({ collection, where }) => {
        const docs = collection === 'events' ? [eventA, eventB] : []
        return { docs: docs.filter((doc) => matches(doc, where)) }
      }),
    },
  } as unknown as PayloadRequest
}

async function allowed(
  collection: CollectionConfig,
  operation: 'read' | 'update' | 'delete',
  req: PayloadRequest,
  doc: RecordData,
): Promise<boolean> {
  const result = await collection.access![operation]!({ req, id: doc.id as number })
  return typeof result === 'boolean' ? result : matches(doc, result)
}

function fieldUpdate(collection: CollectionConfig, name: string): FieldAccess {
  const field = collection.fields.find((field) => 'name' in field && field.name === name)
  if (!field || !('access' in field) || !field.access?.update) {
    throw new Error(`Missing update access for ${name}`)
  }
  return field.access.update
}

describe('Show administration boundaries', () => {
  it('allows admins to manage both shows and chief stewards only their assigned show', async () => {
    for (const [collection, docs] of [
      [Shows, [showA, showB]],
      [Events, [eventA, eventB]],
      [CatEventEntries, [entryA, entryB]],
    ] as const) {
      expect(await allowed(collection, 'update', request(1), docs[0])).toBe(true)
      expect(await allowed(collection, 'update', request(1), docs[1])).toBe(true)
      expect(await allowed(collection, 'update', request(2), docs[0])).toBe(true)
      expect(await allowed(collection, 'update', request(2), docs[1])).toBe(false)
    }
  })

  it('gives a chief steward admin panel access without allowing global user changes', async () => {
    expect(await Users.access!.admin!({ req: request(2) })).toBe(true)
    expect(await Users.access!.admin!({ req: request(4) })).toBe(false)
    expect(await Users.access!.update!({ req: request(2) })).toBe(false)
    // Shared user records are readable for judge and steward assignment.
    expect(await Users.access!.read!({ req: request(2) })).toBe(true)
  })

  it('checks the target show when creating events', async () => {
    const create = Events.access!.create!
    expect(await create({ req: request(2), data: { showId: 10 } })).toBe(true)
    expect(await create({ req: request(2), data: { showId: 11 } })).toBe(false)
    expect(await create({ req: request(4), data: { showId: 10 } })).toBe(false)
    expect(await create({ req: request(), data: { showId: 10 } })).toBe(false)
    expect(await create({ req: request(2), data: {} })).toBe(false)
    expect(await create({ req: request(2) })).toBe(true)
  })

  it('checks the event show when registering cats', async () => {
    const create = CatEventEntries.access!.create!
    expect(await create({ req: request(2), data: { eventId: 100 } })).toBe(true)
    expect(await create({ req: request(2), data: { eventId: 101 } })).toBe(false)
    expect(await create({ req: request(4), data: { eventId: 100 } })).toBe(false)
    expect(await create({ req: request(2), data: {} })).toBe(false)
    expect(await create({ req: request(2) })).toBe(true)
  })

  it('blocks chiefs from moving events or entries into another show or replacing chiefs', async () => {
    for (const [collection, name, doc] of [
      [Shows, 'chiefStewardId', showA],
      [Events, 'showId', eventA],
      [CatEventEntries, 'eventId', entryA],
    ] as const) {
      const check = fieldUpdate(collection, name)
      expect(await check({ req: request(2), doc })).toBe(false)
      expect(await check({ req: request(1), doc })).toBe(true)
    }
  })

  it('denies unassigned users and anonymous visitors access to events and entries', async () => {
    for (const req of [request(), request(6)]) {
      expect(await allowed(Events, 'read', req, eventA)).toBe(false)
      expect(await allowed(CatEventEntries, 'read', req, entryA)).toBe(false)
      expect(await allowed(CatEventEntries, 'update', req, entryA)).toBe(false)
      expect(await allowed(CatEventEntries, 'delete', req, entryA)).toBe(false)
    }
  })
})

describe('Event assignments and entry fields', () => {
  it('accepts optional integer queue positions and rejects negative or fractional values', async () => {
    const field = CatEventEntries.fields.find(
      (field) => 'name' in field && field.name === 'queuePosition',
    )
    if (!field || field.type !== 'number' || !field.validate) {
      throw new Error('Queue position validation is missing')
    }
    const validate = field.validate as (value: number | null | undefined) => boolean | string
    expect(validate(null)).toBe(true)
    expect(validate(undefined)).toBe(true)
    expect(validate(0)).toBe(true)
    expect(validate(10)).toBe(true)
    expect(validate(-1)).toBeTypeOf('string')
    expect(validate(1.5)).toBeTypeOf('string')
  })

  it('allows judges and stewards to read their assigned event and its show', async () => {
    for (const id of [4, 5]) {
      expect(await allowed(Events, 'read', request(id), eventA)).toBe(true)
      expect(await allowed(Shows, 'read', request(id), showA)).toBe(true)
      expect(await allowed(CatEventEntries, 'read', request(id), entryA)).toBe(true)
      expect(await allowed(Events, 'update', request(id), eventA)).toBe(false)
      expect(await allowed(CatEventEntries, 'delete', request(id), entryA)).toBe(false)
    }
  })

  it('permits rating only for the assigned judge or show administrators', async () => {
    const rate = fieldUpdate(CatEventEntries, 'rating')
    expect(await rate({ req: request(4), doc: entryA })).toBe(true)
    expect(await rate({ req: request(5), doc: entryA })).toBe(false)
    expect(await rate({ req: request(2), doc: entryA })).toBe(true)
    expect(await rate({ req: request(3), doc: entryA })).toBe(false)
    expect(await rate({ req: request(1), doc: entryA })).toBe(true)
    // The same person is a judge in A and a steward in B.
    expect(await rate({ req: request(4), doc: entryB })).toBe(false)
  })

  it.each(['status', 'queuePosition'])(
    'permits %s changes only for the steward or show administrators',
    async (name) => {
      const queue = fieldUpdate(CatEventEntries, name)
      expect(await queue({ req: request(5), doc: entryA })).toBe(true)
      expect(await queue({ req: request(4), doc: entryA })).toBe(false)
      expect(await queue({ req: request(2), doc: entryA })).toBe(true)
      expect(await queue({ req: request(3), doc: entryA })).toBe(false)
    },
  )

  it('does not let a forged event ID grant rating access', async () => {
    const rate = fieldUpdate(CatEventEntries, 'rating')
    expect(
      await rate({
        req: request(5),
        doc: entryA,
        data: { eventId: 101 },
        siblingData: { eventId: 101 },
      }),
    ).toBe(false)
  })

  it('prevents judges and stewards from replacing the cat being judged', async () => {
    const edit = fieldUpdate(CatEventEntries, 'catId')
    expect(await edit({ req: request(4), doc: entryA })).toBe(false)
    expect(await edit({ req: request(5), doc: entryA })).toBe(false)
    expect(await edit({ req: request(2), doc: entryA })).toBe(true)
  })
})

describe('Cat visibility and active shows', () => {
  it('allows show administrators to read the shared cat catalogue', async () => {
    expect(await Cats.access!.read!({ req: request(2) })).toBe(true)
    expect(await Cats.access!.read!({ req: request() })).toBe(false)
  })

  it('restricts ordinary users to owned cats and cats in assigned events', async () => {
    const req = request(4)
    vi.mocked(req.payload.find)
      .mockResolvedValueOnce({ docs: [{ catId: 302 }] } as never)
      .mockResolvedValueOnce({ docs: [{ catId: 300 }] } as never)
    const scope = await Cats.access!.read!({ req })
    expect(scope).toEqual({ id: { in: [302, 300] } })
    expect(req.payload.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'catOwners',
        where: { userId: { equals: 4 } },
        req,
      }),
    )
    expect(req.payload.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'catEventEntries',
        req,
      }),
    )
  })

  it('selects active shows deterministically while enforcing the caller permissions', async () => {
    const req = request(1)
    vi.mocked(req.payload.find).mockResolvedValueOnce({ docs: [showA] } as never)
    expect(await getActiveShow(req)).toEqual(showA)
    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'shows',
        where: { isActive: { equals: true } },
        sort: 'id',
        limit: 1,
        overrideAccess: false,
        req,
      }),
    )
    vi.mocked(req.payload.find).mockResolvedValueOnce({ docs: [] } as never)
    expect(await getActiveShow(req)).toBeNull()
  })
})
