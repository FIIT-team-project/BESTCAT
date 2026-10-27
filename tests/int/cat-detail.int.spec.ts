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

import CatPage from '@/app/(frontend)/cats/[id]/page'

describe('cat detail access', () => {
  beforeEach(() => vi.resetAllMocks())

  it('loads the requested cat using the authenticated user’s permissions', async () => {
    find.mockResolvedValue({ docs: [{ id: 21, name: 'Luna' }] })
    await CatPage({ params: Promise.resolve({ id: '21' }) })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'cats',
        where: { id: { equals: 21 } },
        user: { id: 7 },
        overrideAccess: false,
      }),
    )
  })

  it('returns not found for missing or inaccessible cats', async () => {
    find.mockResolvedValue({ docs: [] })
    await expect(CatPage({ params: Promise.resolve({ id: '21' }) })).rejects.toThrow('NOT_FOUND')
  })

  it.each(['abc', '-1', '0', '9007199254740992'])('rejects invalid ID %s', async (id) => {
    await expect(CatPage({ params: Promise.resolve({ id }) })).rejects.toThrow('NOT_FOUND')
    expect(find).not.toHaveBeenCalled()
  })
})
