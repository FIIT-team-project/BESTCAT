import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUser, getActiveShow, find, count } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getActiveShow: vi.fn(),
  find: vi.fn(),
  count: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ find, count }) }))
vi.mock('@/lib/getCurrentUser', () => ({ getCurrentUser }))
vi.mock('@/lib/getActiveShow', () => ({ getActiveShow }))

import { getFrontendLinks, getProfileLinks } from '@/lib/getFrontendLinks'

describe('active-show navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getCurrentUser.mockResolvedValue({ id: 7 })
    getActiveShow.mockResolvedValue({ id: 12 })
    find.mockResolvedValue({ docs: [] })
    count.mockResolvedValue({ totalDocs: 0 })
  })

  it('hides navigation for guests and show tools when no show is active', async () => {
    getCurrentUser.mockResolvedValueOnce(null)
    expect(await getFrontendLinks()).toEqual([])
    getActiveShow.mockResolvedValueOnce(undefined)
    expect(await getFrontendLinks()).toEqual([])
    expect(find).not.toHaveBeenCalled()
  })

  it('shows both tools when the user is a judge and steward in the active show', async () => {
    find.mockImplementation(async ({ collection }) => ({
      docs:
        collection === 'events'
          ? [
              { judgeId: 7, stewardId: 8 },
              { judgeId: 8, stewardId: 7 },
            ]
          : [],
    }))
    expect((await getFrontendLinks()).map(({ href }) => href)).toEqual([
      '/shows/12/judge/events',
      '/shows/12/steward/events',
    ])
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'events',
        where: {
          and: [
            { showId: { equals: 12 } },
            { or: [{ judgeId: { equals: 7 } }, { stewardId: { equals: 7 } }] },
          ],
        },
      }),
    )
  })

  it('shows only judging for a judge without a steward assignment', async () => {
    find.mockImplementation(async ({ collection }) => ({
      docs: collection === 'events' ? [{ judgeId: { id: 7 }, stewardId: 8 }] : [],
    }))
    expect(await getFrontendLinks()).toEqual([{ href: '/shows/12/judge/events', label: 'Judging' }])
  })

  it('shows only steward assignments for a steward and no tools for an unassigned user', async () => {
    expect(await getFrontendLinks()).toEqual([])
    find.mockImplementation(async ({ collection }) => ({
      docs: collection === 'events' ? [{ judgeId: 8, stewardId: 7 }] : [],
    }))
    expect(await getFrontendLinks()).toEqual([
      { href: '/shows/12/steward/events', label: 'Stewarding' },
    ])
  })

  it('requires an owned cat entered in the active show for exhibitor links', async () => {
    find.mockImplementation(async ({ collection }) => ({
      docs: collection === 'catOwners' ? [{ catId: 20 }] : [],
    }))
    expect((await getFrontendLinks()).map(({ href }) => href)).toEqual([])
    count.mockResolvedValue({ totalDocs: 1 })
    expect((await getFrontendLinks()).map(({ href }) => href)).toEqual([
      '/shows/12/exhibitor/entries',
      '/shows/12/exhibitor/alerts',
    ])
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { and: [{ 'eventId.showId': { equals: 12 } }, { catId: { in: [20] } }] },
      }),
    )
  })

  it('always offers My Cats to signed-in users regardless of shows or ownership', async () => {
    getActiveShow.mockResolvedValue(undefined)
    expect(await getProfileLinks()).toEqual([{ href: '/cats', label: 'My Cats' }])
    expect(count).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled()
    expect(getActiveShow).not.toHaveBeenCalled()
  })

  it('hides profile links from guests without querying ownership', async () => {
    getCurrentUser.mockResolvedValue(null)
    expect(await getProfileLinks()).toEqual([])
    expect(count).not.toHaveBeenCalled()
  })
})
