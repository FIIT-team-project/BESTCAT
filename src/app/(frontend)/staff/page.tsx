import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { eventTypeLabels } from '@/lib/catStatus'
import { eventDay, eventTime, formatScheduleDate, groupEventsByStatus } from '@/lib/event-schedule'
import { requireStaff } from '@/lib/events/currentStaff'
import { getStaffRoles } from '@/lib/events/queue'
import { findActiveShow, findShowRoles, showRoleLinks } from '@/lib/shows'

export const metadata: Metadata = { title: 'My Events' }

export default async function StaffEventsPage() {
  const { payload, user } = await requireStaff()

  const show = await findActiveShow(payload)
  const roles = user.collection === 'users' ? await findShowRoles(payload, user, show?.id) : []
  const isChiefSteward = roles.includes('chief-steward')
  const isMyEvents = roles.includes('judge') || roles.includes('steward') || isChiefSteward

  if (user.collection === 'users' && !isMyEvents) {
    redirect(roles.includes('exhibitor') ? '/exhibitor' : '/')
  }

  const title = isMyEvents ? showRoleLinks.judge.label : 'Staff events'
  const { docs: events } = await payload.find({
    collection: 'events',
    user,
    overrideAccess: false,
    where:
      isMyEvents && show
        ? {
            show: { equals: show.id },
            ...(!isChiefSteward && {
              or: [{ judge: { equals: user.id } }, { steward: { equals: user.id } }],
            }),
          }
        : undefined,
    sort: '-start_time',
    pagination: false,
    depth: 1,
    select: {
      name: true,
      show: true,
      event_type: true,
      start_time: true,
      status: true,
      judge: true,
      steward: true,
    },
    populate: { shows: { show_name: true }, users: { name: true } },
  })

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </header>

      {groupEventsByStatus(events).map(({ status, label, events }) => (
        <section key={status} aria-labelledby={`events-${status}`} className="flex flex-col gap-2">
          <h2 id={`events-${status}`} className="text-lg font-semibold">
            {label}
          </h2>
          <ol className="flex flex-col gap-3">
            {events.map((event) => {
              const day = eventDay(event.start_time)
              const time = eventTime(event.start_time)

              const card = (
                <Card size="sm" className="transition-colors group-hover/event-link:bg-muted/50">
                  <CardHeader>
                    <CardTitle>
                      <h3>{event.name}</h3>
                    </CardTitle>
                    <CardDescription>
                      <time dateTime={day}>{formatScheduleDate(day)}</time>
                      {' · '}
                      {time ? (
                        <time dateTime={event.start_time}>{time}</time>
                      ) : (
                        'Time to be announced'
                      )}
                      {!isMyEvents && (
                        <>
                          {' · '}
                          {eventTypeLabels[event.event_type]}
                        </>
                      )}
                    </CardDescription>
                    {user.collection === 'admins' &&
                      typeof event.show === 'object' &&
                      event.show && <CardDescription>{event.show.show_name}</CardDescription>}
                    {isMyEvents && (
                      <CardDescription>
                        Judge:{' '}
                        {typeof event.judge === 'object'
                          ? (event.judge?.name ?? 'Unassigned')
                          : 'Unassigned'}
                        {' · Steward: '}
                        {typeof event.steward === 'object'
                          ? (event.steward?.name ?? 'Unassigned')
                          : 'Unassigned'}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              )

              return (
                <li key={event.id}>
                  {getStaffRoles(event, user).length > 0 ? (
                    <Link
                      aria-label={`Open queue for ${event.name}`}
                      href={`/staff/events/${event.id}/steward`}
                      className="group/event-link block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}

      {events.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No staff events available.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </>
  )
}
