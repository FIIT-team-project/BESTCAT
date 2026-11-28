import type { Payload } from 'payload'

import type { Event } from '@/payload-types'

type PublicQueue = { current: number | null; upcoming: number[] }

export async function findPublicTableQueues(payload: Payload, tableIds: Event['id'][]) {
  const queues = new Map<Event['id'], PublicQueue>()
  for (const id of tableIds) queues.set(id, { current: null, upcoming: [] })
  if (queues.size === 0) return queues

  // Only the public catalog number is populated. Owner and rating data stay private.
  const { docs: entries } = await payload.find({
    collection: 'cat-event-entries',
    overrideAccess: true,
    depth: 1,
    pagination: false,
    sort: ['queue_number', 'id'],
    select: { cat: true, cat_status: true, event: true },
    populate: { cats: { catalog_number: true }, events: { name: true } },
    where: {
      event: { in: tableIds },
      cat_status: { in: ['called', 'registered', 'waiting'] },
    },
  })

  for (const entry of entries) {
    const eventId = typeof entry.event === 'number' ? entry.event : entry.event?.id
    const queue = eventId === undefined ? undefined : queues.get(eventId)
    if (!queue || typeof entry.cat !== 'object' || !entry.cat) continue

    const number = entry.cat.catalog_number
    if (entry.cat_status === 'called') {
      queue.current ??= number
    } else if (queue.upcoming.length < 3) {
      queue.upcoming.push(number)
    }
  }

  return queues
}
