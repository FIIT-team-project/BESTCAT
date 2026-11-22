import type { Payload } from 'payload'

import type { Admin, Cat, CatEventEntry, Event, Show, User } from '@/payload-types'
import { sendSms } from '@/lib/sms'

type StaffUser = (User & { collection: 'users' }) | (Admin & { collection: 'admins' })

export type QueueEvent = Event & { show: Show; judge: User; steward: User }
export type QueueEntry = CatEventEntry & { cat: Cat & { owner: User | number } }

export type StaffRole = 'judge' | 'steward'

const relationId = (value: number | { id: number }) =>
  typeof value === 'object' ? value.id : value

/** Admins can do everything; the judge can manage the queue and rate; the steward manages the queue. */
export function getStaffRoles(event: Event, user: StaffUser): StaffRole[] {
  if (user.collection === 'admins') return ['judge', 'steward']

  const roles: StaffRole[] = []
  if (relationId(event.judge) === user.id) roles.push('judge')
  if (relationId(event.steward) === user.id) roles.push('steward')
  return roles
}

export class QueueError extends Error {}

/** The event with its staff, or null when it does not exist or the user is not its judge or steward. */
export async function findStaffEvent(payload: Payload, user: StaffUser, eventId: Event['id']) {
  const event = (await payload
    .findByID({ collection: 'events', id: eventId, depth: 1 })
    .catch(() => null)) as QueueEvent | null
  if (!event) return null

  const roles = getStaffRoles(event, user)
  return roles.length > 0 ? { event, roles } : null
}

/** All entries of an event ordered by the judge's queue, optionally filtered by catalog number. */
export async function findEventEntries(
  payload: Payload,
  eventId: Event['id'],
  catalogNumber?: number,
): Promise<QueueEntry[]> {
  const { docs } = await payload.find({
    collection: 'cat-event-entries',
    where: {
      and: [
        { event: { equals: eventId } },
        ...(catalogNumber ? [{ 'cat.catalog_number': { equals: catalogNumber } }] : []),
      ],
    },
    depth: 2,
    limit: 0,
    sort: 'queue_number',
  })

  return docs as QueueEntry[]
}

/** Loads an entry and checks that the user has one of the roles on its event. */
async function findEntryForRole(
  payload: Payload,
  user: StaffUser,
  entryId: CatEventEntry['id'],
  allowed: StaffRole[],
) {
  const entry = (await payload
    .findByID({ collection: 'cat-event-entries', id: entryId, depth: 2 })
    .catch(() => null)) as (QueueEntry & { event: QueueEvent }) | null

  if (!entry || typeof entry.event !== 'object') throw new QueueError('Entry not found.')
  if (!getStaffRoles(entry.event, user).some((role) => allowed.includes(role))) {
    throw new QueueError('You are not allowed to change this entry.')
  }
  return entry
}

// Every judge also works as a steward, so both can manage the queue.
const queueRoles: StaffRole[] = ['judge', 'steward']

const callableStatuses: CatEventEntry['cat_status'][] = ['registered', 'waiting', 'absent']

/** Calls the cat to the judge and sends one SMS to its owner. */
export async function callEntry(payload: Payload, user: StaffUser, entryId: CatEventEntry['id']) {
  const entry = await findEntryForRole(payload, user, entryId, queueRoles)
  if (!callableStatuses.includes(entry.cat_status)) {
    throw new QueueError('Only waiting or absent cats can be called.')
  }

  const updated = await payload.update({
    collection: 'cat-event-entries',
    id: entry.id,
    data: { cat_status: 'called', called_at: new Date().toISOString() },
  })

  const owner = entry.cat.owner
  if (typeof owner === 'object' && owner.phone_number) {
    try {
      await sendSms(payload, {
        to: owner.phone_number,
        text: `BESTCAT: Please bring cat #${entry.cat.catalog_number} (${entry.cat.name}) to ${entry.event.name}.`,
      })
    } catch (error) {
      // The cat stays called even if the SMS fails; the steward can still call it out loud.
      payload.logger.error({ err: error, msg: 'Unable to send the call SMS.' })
    }
  }

  return updated
}

/** Puts a called or absent cat back into the waiting queue. */
export async function revertEntry(payload: Payload, user: StaffUser, entryId: CatEventEntry['id']) {
  const entry = await findEntryForRole(payload, user, entryId, queueRoles)
  if (entry.cat_status !== 'called' && entry.cat_status !== 'absent') {
    throw new QueueError('Only called or absent cats can be reverted.')
  }

  return payload.update({
    collection: 'cat-event-entries',
    id: entry.id,
    data: { cat_status: 'waiting', called_at: null },
  })
}

/** Marks a called cat that did not come as absent. */
export async function markEntryAbsent(
  payload: Payload,
  user: StaffUser,
  entryId: CatEventEntry['id'],
) {
  const entry = await findEntryForRole(payload, user, entryId, queueRoles)
  if (entry.cat_status !== 'called') throw new QueueError('Only called cats can be marked absent.')

  return payload.update({
    collection: 'cat-event-entries',
    id: entry.id,
    data: { cat_status: 'absent' },
  })
}

export type RatingInput = Pick<CatEventEntry, 'title' | 'score' | 'place' | 'text_rating'>

/** Loads an entry for the judge's rating page. */
export const findEntryForJudge = (
  payload: Payload,
  user: StaffUser,
  entryId: CatEventEntry['id'],
) => findEntryForRole(payload, user, entryId, ['judge'])

/** Saves the judge's rating and marks the cat as rated. */
export async function rateEntry(
  payload: Payload,
  user: StaffUser,
  entryId: CatEventEntry['id'],
  rating: RatingInput,
) {
  const entry = await findEntryForRole(payload, user, entryId, ['judge'])
  if (!['called', 'exhibited', 'rated'].includes(entry.cat_status)) {
    throw new QueueError('Only called cats can be rated.')
  }

  return payload.update({
    collection: 'cat-event-entries',
    id: entry.id,
    data: { ...rating, cat_status: 'rated' },
  })
}
