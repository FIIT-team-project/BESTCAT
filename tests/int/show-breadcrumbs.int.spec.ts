import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { pathname } = vi.hoisted(() => ({ pathname: vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname: pathname }))

import { ShowBreadcrumbs } from '@/components/show-breadcrumbs'

afterEach(cleanup)

describe('show breadcrumbs', () => {
  it('links an event to its show, with the current page marked', () => {
    pathname.mockReturnValue('/shows/12/events/10')
    render(createElement(ShowBreadcrumbs))
    const nav = within(screen.getByRole('navigation', { name: 'breadcrumb' }))
    expect(nav.getByRole('link', { name: 'Shows' }).getAttribute('href')).toBe('/shows')
    expect(nav.getByRole('link', { name: 'Show 12' }).getAttribute('href')).toBe('/shows/12')
    expect(nav.getByText('Event 10').getAttribute('aria-current')).toBe('page')
  })

  it('uses the event name and avoids duplicate breadcrumbs in the show layout', () => {
    pathname.mockReturnValue('/shows/12/events/10')
    const { rerender } = render(createElement(ShowBreadcrumbs, { hideEvents: true }))
    expect(screen.queryByRole('navigation', { name: 'breadcrumb' })).toBeNull()
    rerender(createElement(ShowBreadcrumbs, { eventName: 'Adult ring' }))
    expect(screen.getByText('Adult ring').getAttribute('aria-current')).toBe('page')
  })

  it.each([
    ['/shows/12', 'Show 12'],
    ['/shows/12/exhibitor/entries', 'My Entries'],
  ])('marks the current page on %s', (path, label) => {
    pathname.mockReturnValue(path)
    render(createElement(ShowBreadcrumbs))
    expect(screen.getByText(label).getAttribute('aria-current')).toBe('page')
  })

  it.each([
    '/shows/12/judge/events',
    '/shows/12/steward/events',
    '/shows/12/events/10/judge',
    '/shows/12/events/10/steward',
  ])('shows show context on %s', (path) => {
    pathname.mockReturnValue(path)
    render(createElement(ShowBreadcrumbs))
    expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeTruthy()
    expect(
      screen
        .getByText(
          path.endsWith('steward') || path.includes('/steward/') ? 'Stewarding' : 'Judging',
        )
        .getAttribute('aria-current'),
    ).toBe('page')
  })
})
