import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { find, findDistinct } = vi.hoisted(() => ({ find: vi.fn(), findDistinct: vi.fn() }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ find, findDistinct }) }))
vi.mock('@/lib/getCurrentUser', () => ({ requireUser: async () => ({ id: 7 }) }))
vi.mock('@/components/cat-detail-link', () => ({
  CatDetailLink: ({ children }: { children: string }) => createElement('span', {}, children),
}))

import Page from '@/app/(frontend)/shows/[id]/exhibitor/entries/page'

describe('exhibitor entries', () => {
  beforeEach(() => vi.resetAllMocks())
  afterEach(cleanup)

  it.each([{ ownerships: [] }, { ownerships: [{ catId: 20 }] }])(
    'scopes cats to ownership and show: %j',
    async ({ ownerships }) => {
      find.mockResolvedValueOnce({ docs: ownerships }).mockResolvedValueOnce({ docs: [] })
      findDistinct.mockResolvedValue({ values: [], page: 1, totalPages: 1 })
      await Page({ params: Promise.resolve({ id: '12' }) })
      expect(findDistinct).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'catEventEntries',
          field: 'catId',
          limit: 12,
          user: { id: 7 },
          overrideAccess: false,
          where: {
            and: [
              { 'eventId.showId': { equals: 12 } },
              { catId: { in: ownerships.map(({ catId }) => catId) } },
            ],
          },
        }),
      )
      expect(find).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { and: [{ 'eventId.showId': { equals: 12 } }, { catId: { in: [] } }] },
          select: { catId: true, eventId: true, rating: true, status: true },
        }),
      )
    },
  )

  it('shows each cat once with all its events and recorded scores', async () => {
    const cat = { id: 20, name: 'Luna' }
    find.mockResolvedValueOnce({ docs: [{ catId: 20 }] }).mockResolvedValueOnce({
      docs: [
        {
          id: 1,
          catId: cat,
          eventId: { id: 100, name: 'Traditional table' },
          status: 'completed',
          rating: 'Excellent 1',
        },
        {
          id: 2,
          catId: cat,
          eventId: { id: 101, name: 'Adult ring' },
          status: 'queued',
          rating: null,
        },
      ],
    })
    findDistinct.mockResolvedValue({ values: [{ catId: 20 }], page: 1, totalPages: 1 })
    render(await Page({ params: Promise.resolve({ id: '12' }) }))
    expect(screen.getAllByText('Luna')).toHaveLength(1)
    const scored = within(screen.getByRole('link', { name: 'Traditional table' }).closest('li')!)
    expect(scored.getByText('Score: Excellent 1')).toBeTruthy()
    const waiting = within(screen.getByRole('link', { name: 'Adult ring' }).closest('li')!)
    expect(waiting.getByText('Not scored yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Adult ring' }).getAttribute('href')).toBe(
      '/shows/12/events/101',
    )
  })
})
