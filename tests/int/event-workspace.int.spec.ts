import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CatEventEntry } from '@/payload-types'

const { update, refresh } = vi.hoisted(() => ({ update: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/app/(frontend)/shows/[id]/events/[eventId]/actions', () => ({
  updateEventWorkspace: update,
}))

import { EventWorkspace } from '@/components/event-workspace'
import { EventWorkspaceDrafts } from '@/components/event-workspace-drafts'

const entries = [
  {
    id: 1,
    catId: { id: 11, name: 'Luna', breed: 'British Shorthair' },
    status: 'queued',
    queuePosition: 1,
  },
  {
    id: 2,
    catId: { id: 12, name: 'Milo', breed: 'Maine Coon' },
    status: 'queued',
    queuePosition: 2,
  },
] as CatEventEntry[]

describe('event workspaces', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    update.mockResolvedValue({})
  })
  afterEach(cleanup)

  it('moves cats with keyboard-accessible buttons and saves their new order', async () => {
    render(createElement(EventWorkspace, { eventID: 10, entries, view: 'steward' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move Milo up' }))
    const rows = within(screen.getByRole('list', { name: 'Waiting cats' })).getAllByRole('listitem')
    expect(rows[0].textContent).toContain('Milo')
    fireEvent.click(screen.getByRole('button', { name: 'Save queue' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(10, { type: 'reorder', ids: [2, 1] }))
  })

  it('reorders by dragging the handle onto another row', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    HTMLElement.prototype.setPointerCapture = vi.fn()
    render(createElement(EventWorkspace, { eventID: 10, entries, view: 'steward' }))
    const rows = within(screen.getByRole('list', { name: 'Waiting cats' })).getAllByRole('listitem')
    document.elementFromPoint = vi.fn(() => rows[0])
    const handle = screen.getByRole('button', { name: 'Drag Milo' })
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 20, clientY: 200 })
    fireEvent.pointerUp(handle, { clientX: 20, clientY: 200 })
    expect(
      within(screen.getByRole('list', { name: 'Waiting cats' })).getAllByRole('listitem')[0]
        .textContent,
    ).toContain('Milo')
    vi.unstubAllGlobals()
  })

  it('shows only the current cat rating form to the judge', async () => {
    render(
      createElement(EventWorkspace, {
        eventID: 10,
        entries: [{ ...entries[0], status: 'judging' }, entries[1]],
        view: 'judge',
      }),
    )
    expect(screen.queryByRole('button', { name: 'Drag Milo' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'Waiting cats' })).toBeNull()
    expect(screen.queryByText('Up next')).toBeNull()
    expect(screen.queryByText('Completed cats')).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByText('Milo')).toBeNull()
    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: 'Excellent' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save & finish judging' }))
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(10, { type: 'rate', entryID: 1, rating: 'Excellent' }),
    )
  })

  it('keeps queue changes available after a failed save', async () => {
    update.mockResolvedValue({ error: 'Save failed' })
    render(createElement(EventWorkspace, { eventID: 10, entries, view: 'steward' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move Milo up' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save queue' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Save failed'))
    expect(refresh).not.toHaveBeenCalled()
    expect(
      within(screen.getByRole('list', { name: 'Waiting cats' })).getAllByRole('listitem')[0]
        .textContent,
    ).toContain('Milo')
  })
})

describe('judge workspace navigation', () => {
  afterEach(cleanup)
  const eventPath = '/shows/12/events/10'
  function workspace(view: 'judge' | 'steward', cats = entries) {
    return createElement(
      EventWorkspaceDrafts,
      null,
      createElement(EventWorkspace, {
        key: view,
        eventID: 10,
        entries: cats,
        view,
        eventPath,
        canJudge: true,
      }),
    )
  }

  it('keeps the rating draft when switching to the queue and back', () => {
    const cats = [{ ...entries[0], status: 'judging' }, entries[1]] as CatEventEntry[]
    const result = render(workspace('judge', cats))
    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: 'Excellent draft' } })
    result.rerender(workspace('steward', cats))
    expect(screen.getByRole('link', { name: 'Stewarding' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Go to judging' }).getAttribute('href')).toBe(
      `${eventPath}/judge`,
    )
    result.rerender(workspace('judge', cats))
    expect((screen.getByLabelText('Rating') as HTMLInputElement).value).toBe('Excellent draft')
  })

  it('keeps unsaved queue ordering when switching views', () => {
    const result = render(workspace('steward'))
    fireEvent.click(screen.getByRole('button', { name: 'Move Milo up' }))
    result.rerender(workspace('judge'))
    expect(screen.getByRole('link', { name: 'Open queue' }).getAttribute('href')).toBe(
      `${eventPath}/steward`,
    )
    result.rerender(workspace('steward'))
    expect(
      within(screen.getByRole('list', { name: 'Waiting cats' })).getAllByRole('listitem')[0]
        .textContent,
    ).toContain('Milo')
  })

  it('does not offer judging navigation to a steward', () => {
    render(createElement(EventWorkspace, { eventID: 10, entries, view: 'steward', eventPath }))
    expect(screen.queryByRole('navigation', { name: 'Event workspace' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Go to judging' })).toBeNull()
  })
})
