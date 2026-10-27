import { beforeEach, describe, expect, it, vi } from 'vitest'

const { find } = vi.hoisted(() => ({ find: vi.fn() }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ find }) }))
vi.mock('@/lib/getCurrentUser', () => ({ getCurrentUser: async () => ({ id: 7 }) }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))

import EventLayout from '@/app/(frontend)/shows/[id]/events/[eventId]/layout'

describe('nested event access', () => {
  beforeEach(() => vi.resetAllMocks())

  it('requires a readable event belonging to the show in the URL', async () => {
    find.mockResolvedValue({ docs: [{ id: 10, showId: 12 }] })
    expect(
      await EventLayout({
        children: 'event',
        params: Promise.resolve({ id: '12', eventId: '10' }),
      }),
    ).toEqual(
      expect.objectContaining({
        props: expect.objectContaining({
          children: [expect.anything(), 'event'],
          eventPath: '/shows/12/events/10',
        }),
      }),
    )
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { and: [{ id: { equals: 10 } }, { showId: { equals: 12 } }] },
        user: { id: 7 },
        overrideAccess: false,
      }),
    )
  })

  it('rejects events missing from the requested parent show', async () => {
    find.mockResolvedValue({ docs: [] })
    await expect(
      EventLayout({ children: 'event', params: Promise.resolve({ id: '99', eventId: '10' }) }),
    ).rejects.toThrow('NOT_FOUND')
  })

  it.each([
    { id: 'abc', eventId: '10' },
    { id: '12', eventId: '-1' },
  ])('rejects invalid parent or event IDs: %j', async (params) => {
    await expect(
      EventLayout({ children: 'event', params: Promise.resolve(params) }),
    ).rejects.toThrow('NOT_FOUND')
    expect(find).not.toHaveBeenCalled()
  })
})
