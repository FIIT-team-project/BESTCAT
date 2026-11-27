import type { Payload } from 'payload'

import type { Cat, CatEventEntry, Event, Show, User } from '@/payload-types'

export type ExhibitorEntry = CatEventEntry & {
  cat: Cat
  event: Event & { show: Show; judge: User | number }
}

const isPopulated = (entry: CatEventEntry): entry is ExhibitorEntry =>
  typeof entry.cat === 'object' &&
  typeof entry.event === 'object' &&
  typeof entry.event.show === 'object'

/**
 * Entries of the user's cats in the active show.
 *
 * Ownership is enforced by the query itself, so the result never contains
 * entries of cats that belong to another exhibitor.
 */
export async function findExhibitorEntries(
  payload: Payload,
  userId: User['id'],
): Promise<ExhibitorEntry[]> {
  const { docs } = await payload.find({
    collection: 'cat-event-entries',
    where: {
      and: [{ 'cat.owner': { equals: userId } }, { 'event.show.is_active': { equals: true } }],
    },
    depth: 2,
    limit: 0,
  })

  return docs
    .filter(isPopulated)
    .sort(
      (a, b) =>
        Date.parse(a.event.start_time) - Date.parse(b.event.start_time) ||
        a.queue_number - b.queue_number ||
        a.id - b.id,
    )
}

/** A single entry of the user's cat, or null when it does not exist or belongs to someone else. */
export async function findExhibitorEntry(
  payload: Payload,
  userId: User['id'],
  entryId: CatEventEntry['id'],
): Promise<ExhibitorEntry | null> {
  const { docs } = await payload.find({
    collection: 'cat-event-entries',
    where: {
      and: [{ id: { equals: entryId } }, { 'cat.owner': { equals: userId } }],
    },
    depth: 2,
    limit: 1,
  })

  const [entry] = docs
  return entry && isPopulated(entry) ? entry : null
}
