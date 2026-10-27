import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ListPagination } from '@/components/list-pagination'
import { pageNumber, paginated } from '@/lib/pagination'

afterEach(cleanup)

describe('browse pagination', () => {
  it.each([undefined, '', '0', '-1', '2.5', 'abc', ['2'], '9007199254740992'])(
    'defaults malformed page %j to the first page',
    (value) => {
      expect(pageNumber(value)).toBe(1)
    },
  )

  it('keeps other list pages and filters when following a page link', () => {
    render(
      createElement(ListPagination, {
        result: { page: 2, totalPages: 20 },
        path: '/shows/12',
        search: { eventsPage: '3', catsPage: '2', filter: ['a', 'b'] },
        pageKey: 'catsPage',
        label: 'Cats',
      }),
    )
    const nav = within(screen.getByRole('navigation', { name: 'Cats pagination' }))
    const next = new URL(
      nav.getByRole('link', { name: 'Go to next page' }).getAttribute('href')!,
      'https://example.com',
    )
    expect(next.searchParams.get('eventsPage')).toBe('3')
    expect(next.searchParams.get('catsPage')).toBe('3')
    expect(next.searchParams.getAll('filter')).toEqual(['a', 'b'])
    expect(nav.getByRole('link', { name: 'Page 2' }).getAttribute('aria-current')).toBe('page')
    expect(nav.getAllByRole('link').length).toBeLessThan(10)
  })

  it('omits previous navigation on the first page', () => {
    render(
      createElement(ListPagination, {
        result: { page: 1, totalPages: 3 },
        path: '/cats',
        search: {},
        label: 'Cats',
      }),
    )
    expect(screen.queryByRole('link', { name: 'Go to previous page' })).toBeNull()
  })

  it('loads the last available page for a stale URL', async () => {
    const find = vi.fn(async (page: number) => ({ page, totalPages: 3 }))
    expect(await paginated(99, find)).toEqual({ page: 3, totalPages: 3 })
    expect(find.mock.calls).toEqual([[99], [3]])
  })
})
