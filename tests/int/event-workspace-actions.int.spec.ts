import { beforeEach, describe, expect, it, vi } from 'vitest'

const { find, update, begin, commit, rollback, assignment, revalidate } = vi.hoisted(() => ({
  find: vi.fn(),
  update: vi.fn(),
  begin: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  assignment: vi.fn(),
  revalidate: vi.fn(),
}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: async () => ({
    find,
    update,
    logger: { error: vi.fn() },
    db: { beginTransaction: begin, commitTransaction: commit, rollbackTransaction: rollback },
  }),
}))
vi.mock('@/lib/getCurrentUser', () => ({ requireUser: async () => ({ id: 7 }) }))
vi.mock('@/lib/requireEventAssignment', () => ({ requireEventAssignment: assignment }))
vi.mock('next/cache', () => ({ revalidatePath: revalidate }))

import { updateEventWorkspace } from '@/app/(frontend)/shows/[id]/events/[eventId]/actions'

describe('event workspace changes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    assignment.mockResolvedValue({ id: 10, showId: 12 })
    begin.mockResolvedValue('transaction')
    find.mockResolvedValue({
      docs: [
        { id: 1, status: 'queued' },
        { id: 2, status: 'queued' },
      ],
    })
  })

  it('saves the exact waiting queue with permissions and a shared transaction', async () => {
    expect(await updateEventWorkspace(10, { type: 'reorder', ids: [2, 1] })).toEqual({})
    expect(assignment).toHaveBeenCalledWith('10', 'steward')
    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 2,
        data: { queuePosition: 1 },
        overrideAccess: false,
        user: { id: 7 },
        req: { transactionID: 'transaction', user: { id: 7 } },
      }),
    )
    expect(update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 1, data: { queuePosition: 2 } }),
    )
    expect(commit).toHaveBeenCalledWith('transaction')
    expect(revalidate).toHaveBeenCalledWith('/shows/12/events/10', 'layout')
  })

  it.each([[1], [1, 1], [1, 99]])(
    'rejects incomplete, duplicate or foreign entry IDs: %j',
    async (...ids) => {
      const result = await updateEventWorkspace(10, { type: 'reorder', ids })
      expect(result.error).toBeTruthy()
      expect(update).not.toHaveBeenCalled()
      expect(rollback).toHaveBeenCalled()
    },
  )

  it('rolls back all positions when an update fails', async () => {
    update.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('failed'))
    expect((await updateEventWorkspace(10, { type: 'reorder', ids: [2, 1] })).error).toBeTruthy()
    expect(rollback).toHaveBeenCalledWith('transaction')
    expect(commit).not.toHaveBeenCalled()
  })

  it('does not send a second cat while another is being judged', async () => {
    find.mockResolvedValue({
      docs: [
        { id: 1, status: 'judging' },
        { id: 2, status: 'queued' },
      ],
    })
    expect((await updateEventWorkspace(10, { type: 'call', entryID: 2 })).error).toBeTruthy()
    expect(update).not.toHaveBeenCalled()
  })

  it('sends a waiting cat to the table', async () => {
    expect(await updateEventWorkspace(10, { type: 'call', entryID: 2 })).toEqual({})
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, data: { status: 'judging' } }),
    )
  })

  it('requires a judge and finishes only the current cat with a nonempty rating', async () => {
    find.mockResolvedValue({ docs: [{ id: 1, status: 'judging' }] })
    expect(
      await updateEventWorkspace(10, { type: 'rate', entryID: 1, rating: ' Excellent ' }),
    ).toEqual({})
    expect(assignment).toHaveBeenCalledWith('10', 'judge')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, data: { rating: 'Excellent', status: 'completed' } }),
    )
    update.mockClear()
    expect(
      (await updateEventWorkspace(10, { type: 'rate', entryID: 1, rating: ' ' })).error,
    ).toBeTruthy()
    expect(
      (await updateEventWorkspace(10, { type: 'rate', entryID: 99, rating: 'Excellent' })).error,
    ).toBeTruthy()
    expect(update).not.toHaveBeenCalled()
  })

  it('does not query entries or start a transaction for unauthorized users', async () => {
    assignment.mockRejectedValue(new Error('NOT_FOUND'))
    await expect(updateEventWorkspace(10, { type: 'call', entryID: 1 })).rejects.toThrow(
      'NOT_FOUND',
    )
    expect(find).not.toHaveBeenCalled()
    expect(begin).not.toHaveBeenCalled()
  })
})
