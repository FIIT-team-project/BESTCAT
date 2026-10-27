import { beforeEach, describe, expect, it, vi } from 'vitest'

const { find } = vi.hoisted(() => ({ find: vi.fn() }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ find }) }))
vi.mock('@/lib/getCurrentUser', () => ({ requireUser: async () => ({ id: 7 }) }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND') } }))

import { requireEventAssignment } from '@/lib/requireEventAssignment'

describe('event workspace access', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each(['judge', 'steward'] as const)('scopes the %s workspace to the correct assignments', async (view) => {
    find.mockResolvedValue({ docs: [{ id: 12 }] })
    expect(await requireEventAssignment('12', view)).toEqual({ id: 12 })
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'events',
      user: { id: 7 },
      overrideAccess: false,
      where: {
        and: [
          { id: { equals: 12 } },
          view === 'judge'
            ? { judgeId: { equals: 7 } }
            : { or: [{ judgeId: { equals: 7 } }, { stewardId: { equals: 7 } }] },
        ],
      },
    }))
  })

  it('rejects missing or unassigned events', async () => {
    find.mockResolvedValue({ docs: [] })
    await expect(requireEventAssignment('12', 'judge')).rejects.toThrow('NOT_FOUND')
  })

  it.each(['abc', '0', '-1', '1.5'])('rejects invalid event ID %s before querying', async (id) => {
    await expect(requireEventAssignment(id, 'steward')).rejects.toThrow('NOT_FOUND')
    expect(find).not.toHaveBeenCalled()
  })
})
