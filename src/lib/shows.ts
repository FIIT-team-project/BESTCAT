import type { Payload } from 'payload'

import type { Show, User } from '@/payload-types'

export async function findActiveShow(payload: Payload, user: User) {
  const { docs } = await payload.find({
    collection: 'shows',
    user,
    overrideAccess: false,
    depth: 0,
    limit: 1,
    select: { show_name: true, chief_steward: true, start_date: true, end_date: true },
    where: { is_active: { equals: true } },
  })

  return docs[0]
}

export async function isShowStaff(
  payload: Payload,
  user: User,
  show: Pick<Show, 'id' | 'chief_steward'>,
) {
  if (show.chief_steward === user.id) return true

  const { totalDocs } = await payload.count({
    collection: 'events',
    user,
    overrideAccess: false,
    where: {
      show: { equals: show.id },
      or: [{ judge: { equals: user.id } }, { steward: { equals: user.id } }],
    },
  })

  return totalDocs > 0
}

export async function findShowEvents(payload: Payload, user: User, showId: Show['id']) {
  const { docs } = await payload.find({
    collection: 'events',
    user,
    overrideAccess: false,
    depth: 0,
    pagination: false,
    select: { name: true, status: true, event_type: true, event_date: true, event_time: true },
    where: { show: { equals: showId } },
  })

  return docs.sort(
    (a, b) =>
      a.event_date.slice(0, 10).localeCompare(b.event_date.slice(0, 10)) ||
      (a.event_time ?? '24:00').localeCompare(b.event_time ?? '24:00') ||
      a.id - b.id,
  )
}
