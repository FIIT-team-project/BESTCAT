import type { Payload } from 'payload'
import { cache } from 'react'

import type { Show, User } from '@/payload-types'

// The public schedule reads only the active show's display fields.
export const findActiveShow = cache(async (payload: Payload) => {
  const { docs } = await payload.find({
    collection: 'shows',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    select: { show_name: true, start_date: true, end_date: true },
    where: { is_active: { equals: true } },
  })

  return docs[0]
})

const myEventsLink = { href: '/staff', label: 'My Events', sectionHref: '/staff/events' }

export const showRoleLinks = {
  exhibitor: { href: '/exhibitor/ongoing', label: 'My Entries', sectionHref: '/exhibitor' },
  judge: myEventsLink,
  steward: myEventsLink,
  'chief-steward': myEventsLink,
} as const

export type ShowRole = keyof typeof showRoleLinks

export const findShowRoles = cache(async (payload: Payload, user: User, showId?: Show['id']) => {
  const roles: ShowRole[] = []
  if (showId === undefined) return roles

  const [entries, assignments, chief] = await Promise.all([
    payload.count({
      collection: 'cat-event-entries',
      user,
      overrideAccess: false,
      where: { 'event.show': { equals: showId }, 'cat.owner': { equals: user.id } },
    }),
    payload.find({
      collection: 'events',
      user,
      overrideAccess: false,
      depth: 0,
      pagination: false,
      select: { judge: true, steward: true },
      where: {
        show: { equals: showId },
        or: [{ judge: { equals: user.id } }, { steward: { equals: user.id } }],
      },
    }),
    payload.count({
      collection: 'shows',
      user,
      overrideAccess: false,
      where: { id: { equals: showId }, chief_steward: { equals: user.id } },
    }),
  ])

  if (entries.totalDocs > 0) roles.push('exhibitor')
  if (assignments.docs.some((event) => event.judge === user.id)) roles.push('judge')
  if (assignments.docs.some((event) => event.steward === user.id)) roles.push('steward')
  if (chief.totalDocs > 0) roles.push('chief-steward')
  return roles
})

export async function getShowLandingPath(payload: Payload, user: User) {
  const show = await findActiveShow(payload)
  const [primaryRole] = await findShowRoles(payload, user, show?.id)
  return primaryRole ? showRoleLinks[primaryRole].href : '/'
}

// The public schedule passes the active show ID and reads only event display fields.
export async function findShowEvents(payload: Payload, showId: Show['id']) {
  const { docs } = await payload.find({
    collection: 'events',
    overrideAccess: true,
    depth: 0,
    pagination: false,
    select: { name: true, status: true, event_type: true, event_date: true, event_time: true },
    where: { show: { equals: showId } },
  })

  const events = docs.map((event) => ({
    ...event,
    day: event.event_date.slice(0, 10),
    time: event.event_time,
  }))
  return events.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      (a.time ?? '24:00').localeCompare(b.time ?? '24:00') ||
      a.id - b.id,
  )
}
