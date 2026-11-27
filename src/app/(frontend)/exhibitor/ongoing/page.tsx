import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireExhibitor } from '@/lib/exhibitor/currentUser'
import { formatTime, getCatStatus } from '@/lib/catStatus'
import { eventDay, eventTime, formatScheduleDate } from '@/lib/event-schedule'
import { type ExhibitorEntry, findExhibitorEntries } from '@/lib/exhibitor/entries'

export const metadata: Metadata = { title: 'My Entries · Ongoing' }

type EventGroup = { event: ExhibitorEntry['event']; entries: ExhibitorEntry[] }

const views = [
  { href: '/exhibitor/ongoing', label: 'Ongoing' },
  { href: '/exhibitor/upcoming', label: 'Upcoming' },
  { href: '/exhibitor/results', label: 'Results' },
]

function groupEntriesByEvent(entries: ExhibitorEntry[]): EventGroup[] {
  const groups = new Map<number, EventGroup>()
  for (const entry of entries) {
    const group = groups.get(entry.event.id)
    if (group) group.entries.push(entry)
    else groups.set(entry.event.id, { event: entry.event, entries: [entry] })
  }

  return [...groups.values()].sort(
    (a, b) =>
      Date.parse(a.event.start_time) - Date.parse(b.event.start_time) || a.event.id - b.event.id,
  )
}

export default async function OngoingEntriesPage() {
  const { payload, user } = await requireExhibitor()
  const entries = await findExhibitorEntries(payload, user.id)
  const ongoingEntries = entries.filter(
    (entry) =>
      entry.event.status === 'ongoing' &&
      ['called', 'registered', 'waiting'].includes(entry.cat_status),
  )
  const calledGroups = groupEntriesByEvent(
    ongoingEntries.filter((entry) => entry.cat_status === 'called'),
  )
  const waitingGroups = groupEntriesByEvent(
    ongoingEntries.filter((entry) => ['registered', 'waiting'].includes(entry.cat_status)),
  )

  return (
    <>
      <nav aria-label="My Entries views" className="flex flex-wrap gap-1">
        {views.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={href === '/exhibitor/ongoing' ? 'page' : undefined}
            className={buttonVariants({
              variant: href === '/exhibitor/ongoing' ? 'secondary' : 'ghost',
            })}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-6">
        <section aria-labelledby="called-heading" className="flex flex-col gap-2">
          <h1 id="called-heading" className="text-lg font-semibold">
            Called now
          </h1>
          {calledGroups.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {calledGroups.map(({ event, entries: eventEntries }) => (
                <li key={event.id}>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>
                        <h2 className="text-base font-semibold">{event.name}</h2>
                      </CardTitle>
                      <CardDescription>
                        <time dateTime={event.start_time}>
                          {formatScheduleDate(eventDay(event.start_time))}
                          {' · '}
                          {eventTime(event.start_time) ?? 'Time to be announced'}
                        </time>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col">
                        {eventEntries.map((entry) => (
                          <li key={entry.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                            <Link
                              href={`/exhibitor/entries/${entry.id}`}
                              className="flex items-center justify-between gap-3 pb-3"
                            >
                              <span className="min-w-0">
                                <span className="block font-medium">
                                  #{entry.cat.catalog_number} {entry.cat.name}
                                </span>
                                <span className="block text-sm text-muted-foreground">
                                  {entry.cat.breed} ·{' '}
                                  {entry.called_at
                                    ? `Called at ${formatTime(entry.called_at)}`
                                    : 'Called now'}
                                </span>
                              </span>
                              <Badge className="shrink-0">Called</Badge>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No entries are currently called.</p>
          )}
        </section>

        <section aria-labelledby="waiting-heading" className="flex flex-col gap-2">
          <h2 id="waiting-heading" className="text-lg font-semibold">
            Waiting
          </h2>
          {waitingGroups.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {waitingGroups.map(({ event, entries: eventEntries }) => (
                <li key={event.id}>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>
                        <h3 className="text-base font-semibold">{event.name}</h3>
                      </CardTitle>
                      <CardDescription>
                        <time dateTime={event.start_time}>
                          {formatScheduleDate(eventDay(event.start_time))}
                          {' · '}
                          {eventTime(event.start_time) ?? 'Time to be announced'}
                        </time>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-col">
                        {eventEntries.map((entry) => (
                          <li key={entry.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                            <Link
                              href={`/exhibitor/entries/${entry.id}`}
                              className="flex items-center justify-between gap-3 pb-3"
                            >
                              <span className="min-w-0">
                                <span className="block font-medium">
                                  #{entry.cat.catalog_number} {entry.cat.name}
                                </span>
                                <span className="block text-sm text-muted-foreground">
                                  {entry.cat.breed} ·{' '}
                                  {entry.queue_number != null
                                    ? `Queue number ${entry.queue_number}`
                                    : getCatStatus(entry.cat_status).description}
                                </span>
                              </span>
                              <Badge className="shrink-0" variant="secondary">
                                {getCatStatus(entry.cat_status).label}
                              </Badge>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No cats are waiting at ongoing events.</p>
          )}
        </section>
      </div>
    </>
  )
}
