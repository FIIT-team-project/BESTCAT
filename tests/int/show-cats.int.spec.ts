import { beforeEach, describe, expect, it, vi } from 'vitest'

const { find, findDistinct, currentUser } = vi.hoisted(() => ({
  find: vi.fn(),
  findDistinct: vi.fn(),
  currentUser: vi.fn(),
}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ find, findDistinct }) }))
vi.mock('@/lib/getCurrentUser', () => ({ getCurrentUser: currentUser }))

import ShowPage from '@/app/(frontend)/shows/[id]/page'

describe('show cats', () => {
  beforeEach(() => vi.resetAllMocks())
  it.each([null, { id: 7 }])(
    'paginates distinct cats across all show events, independently of the event page for user %j',
    async (user) => {
      currentUser.mockResolvedValue(user)
      find
        .mockResolvedValueOnce({ docs: [{ id: 12 }] })
        .mockResolvedValueOnce({ docs: [], page: 2, totalPages: 2 })
        .mockResolvedValueOnce({ docs: [] })
      findDistinct.mockResolvedValue({
        values: [{ catId: 21 }, { catId: 22 }],
        page: 3,
        totalPages: 4,
      })
      await ShowPage({
        params: Promise.resolve({ id: '12' }),
        searchParams: Promise.resolve({ eventsPage: '2', catsPage: '3' }),
      })
      expect(findDistinct).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'catEventEntries',
          field: 'catId',
          where: { 'eventId.showId': { equals: 12 } },
          user,
          overrideAccess: false,
          limit: 12,
          page: 3,
        }),
      )
      expect(find).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ collection: 'events', page: 2, limit: 12 }),
      )
      expect(find).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          collection: 'cats',
          where: { id: { in: [21, 22] } },
          overrideAccess: false,
        }),
      )
    },
  )
})
