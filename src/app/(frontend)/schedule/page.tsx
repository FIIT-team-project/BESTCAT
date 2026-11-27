import type { Metadata } from 'next'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { formatScheduleDate, groupEventsByStatus } from '@/lib/event-schedule'
import { getFrontendSession } from '@/lib/frontend-session'
import { findActiveShow, findShowEvents } from '@/lib/shows'

export const metadata: Metadata = { title: 'Schedule' }

export default async function SchedulePage() {
  const { payload } = await getFrontendSession()
  const show = await findActiveShow(payload)
  const events = show ? await findShowEvents(payload, show.id) : []
  const sections = groupEventsByStatus(events)

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4 sm:p-6">
      <nav aria-label="Show views" className="flex flex-wrap gap-1">
        <Link href="/live-calling" className={buttonVariants({ variant: 'ghost' })}>
          Live Calling
        </Link>
        <Link
          href="/schedule"
          aria-current="page"
          className={buttonVariants({ variant: 'secondary' })}
        >
          Schedule
        </Link>
      </nav>

      {sections.length > 0 ? (
        sections.map(({ status, label, events: sectionEvents }) => (
          <section
            key={status}
            aria-labelledby={`events-${status}`}
            className="flex flex-col gap-2"
          >
            <h2 id={`events-${status}`} className="text-lg font-semibold">
              {label}
            </h2>
            <ol className="flex flex-col gap-3">
              {sectionEvents.map((event) => {
                const time = event.time

                return (
                  <li key={event.id}>
                    <Card size="sm">
                      <CardHeader>
                        <CardTitle>
                          <h3>{event.name}</h3>
                        </CardTitle>
                        <CardDescription>
                          <time dateTime={event.day}>{formatScheduleDate(event.day)}</time>
                          {' · '}
                          {time ? (
                            <time dateTime={event.start_time}>{time}</time>
                          ) : (
                            'Time to be announced'
                          )}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </li>
                )
              })}
            </ol>
          </section>
        ))
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {show ? 'No events are scheduled.' : 'No show is currently active.'}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
