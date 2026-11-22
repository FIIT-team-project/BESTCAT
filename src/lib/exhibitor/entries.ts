import type { Payload } from 'payload'

import type { Cat, CatEventEntry, Event, Show, User } from '@/payload-types'

export type ExhibitorEntry = CatEventEntry & {
  cat: Cat
  event: Event & { show: Show; judge: User | number }
}

export const catStatusSteps = [
  {
    value: 'registered',
    label: 'Registered',
    description: 'Your cat was accepted',
  },
  {
    value: 'waiting',
    label: 'Waiting',
    description: 'Wait until you are called',
  },
  {
    value: 'called',
    label: 'Called',
    description: 'Bring your cat to the judge',
  },
  {
    value: 'exhibited',
    label: 'Exhibited',
    description: 'Wait for the rating',
  },
  {
    value: 'rated',
    label: 'Rated',
    description: 'Your cat received a rating',
  },
] as const satisfies {
  value: CatEventEntry['cat_status']
  label: string
  description: string
}[]

export const getCatStatusStep = (status: CatEventEntry['cat_status']) =>
  catStatusSteps.find((step) => step.value === status) ?? catStatusSteps[0]

export const eventTypeLabels: Record<Event['event_type'], string> = {
  table: 'Table judging',
  ring: 'Ring',
  bis: 'Best in Show',
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
    sort: ['event.event_date', 'queue_number'],
  })

  return docs.filter(isPopulated)
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
