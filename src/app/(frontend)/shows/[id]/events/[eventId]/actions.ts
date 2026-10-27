'use server'

import config from '@payload-config'
import { getPayload } from 'payload'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/getCurrentUser'
import { requireEventAssignment } from '@/lib/requireEventAssignment'
import { relationshipID } from '@/collections/access/shows'
import { isWaiting } from '@/lib/event-workspace'

class WorkspaceError extends Error {}

export async function updateEventWorkspace(
  eventID: number,
  operation:
    | { type: 'reorder'; ids: number[] }
    | { type: 'call'; entryID: number }
    | { type: 'rate'; entryID: number; rating: string },
): Promise<{ error?: string }> {
  if (!operation || !['reorder', 'call', 'rate'].includes(operation.type)) {
    return { error: 'Unknown event action.' }
  }
  const event = await requireEventAssignment(
    String(eventID),
    operation.type === 'rate' ? 'judge' : 'steward',
  )
  const user = await requireUser()
  const payload = await getPayload({ config })
  const transactionID = await payload.db.beginTransaction({ isolationLevel: 'serializable' })
  if (!transactionID) return { error: 'Unable to start saving. Please try again.' }
  const req = { transactionID, user }

  try {
    const { docs } = await payload.find({
      collection: 'catEventEntries',
      where: { eventId: { equals: eventID } },
      depth: 0,
      pagination: false,
      user,
      overrideAccess: false,
      req,
    })
    if (operation.type === 'reorder') {
      const waiting = docs.filter(isWaiting)
      if (
        !Array.isArray(operation.ids) ||
        new Set(operation.ids).size !== waiting.length ||
        operation.ids.length !== waiting.length ||
        waiting.some(({ id }) => !operation.ids.includes(id))
      ) {
        throw new WorkspaceError('The queue has changed. Refresh before reordering.')
      }
      for (const [index, id] of operation.ids.entries()) {
        await payload.update({
          collection: 'catEventEntries',
          id,
          data: { queuePosition: index + 1 },
          user,
          overrideAccess: false,
          req,
        })
      }
    } else {
      const entry = docs.find(({ id }) => id === operation.entryID)
      if (!entry) throw new WorkspaceError('This cat is no longer in this event.')
      if (operation.type === 'call') {
        if (!isWaiting(entry) || docs.some(({ status }) => status === 'judging')) {
          throw new WorkspaceError('Finish the current cat before sending another to the table.')
        }
        await payload.update({
          collection: 'catEventEntries',
          id: entry.id,
          data: { status: 'judging' },
          user,
          overrideAccess: false,
          req,
        })
      } else {
        if (entry.status !== 'judging')
          throw new WorkspaceError('The current cat has changed. Refresh the page.')
        if (
          typeof operation.rating !== 'string' ||
          !operation.rating.trim() ||
          operation.rating.length > 200
        ) {
          throw new WorkspaceError('Enter a rating of up to 200 characters.')
        }
        await payload.update({
          collection: 'catEventEntries',
          id: entry.id,
          data: { rating: operation.rating.trim(), status: 'completed' },
          user,
          overrideAccess: false,
          req,
        })
      }
    }
    await payload.db.commitTransaction(transactionID)
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    payload.logger.error(error)
    return {
      error: error instanceof WorkspaceError ? error.message : 'Unable to save. Please try again.',
    }
  }
  revalidatePath(`/shows/${relationshipID(event.showId)}/events/${eventID}`, 'layout')
  return {}
}
