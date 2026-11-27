import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireExhibitor } from '@/lib/exhibitor/currentUser'
import { getCatStatus } from '@/lib/catStatus'
import { formatScheduleDate } from '@/lib/event-schedule'
import { type ExhibitorEntry, findExhibitorEntries } from '@/lib/exhibitor/entries'

export const metadata: Metadata = { title: 'My Entries · Upcoming' }

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
      Date.parse(a.event.event_date) - Date.parse(b.event.event_date) || a.event.id - b.event.id,
  )
}

export default async function UpcomingEntriesPage() {
  const { payload, user } = await requireExhibitor()
  const entries = await findExhibitorEntries(payload, user.id)
  const upcomingGroups = groupEntriesByEvent(
    entries.filter((entry) => entry.event.status === 'planned'),
  )

  return (
    <>
      <nav aria-label="My Entries views" className="flex flex-wrap gap-1">
        {views.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={href === '/exhibitor/upcoming' ? 'page' : undefined}
            className={buttonVariants({
              variant: href === '/exhibitor/upcoming' ? 'secondary' : 'ghost',
            })}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section aria-label="Upcoming entries" className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold">Upcoming events</h1>
        {upcomingGroups.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {upcomingGroups.map(({ event, entries: eventEntries }) => (
              <li key={event.id}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>
                      <h2 className="text-base font-semibold">{event.name}</h2>
                    </CardTitle>
                    <CardDescription>
                      <time dateTime={event.event_date}>
                        {formatScheduleDate(event.event_date.slice(0, 10))}
                        {' · '}
                        {event.event_time ?? 'Time to be announced'}
                      </time>
                      {' · Upcoming'}
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
                                {entry.cat.breed}
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
          <p className="text-sm text-muted-foreground">You have no upcoming entries.</p>
        )}
      </section>
    </>
  )
}
