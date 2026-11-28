import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { eventTypeLabels, formatTime, getCatStatus } from '@/lib/catStatus'
import { requireStaff } from '@/lib/events/currentStaff'
import { type QueueEntry, findEventEntries, findStaffEvent } from '@/lib/events/queue'

import { absentAction, callAction, revertAction } from '../../actions'

export const metadata: Metadata = { title: 'Cat queue' }

type Section = {
  title: string
  entries: QueueEntry[]
}

function EntryActions({
  entry,
  eventId,
  isJudge,
}: {
  entry: QueueEntry
  eventId: number
  isJudge: boolean
}) {
  const hidden = (
    <>
      <input type="hidden" name="entryId" value={entry.id} />
      <input type="hidden" name="eventId" value={eventId} />
    </>
  )
  const details = isJudge && (
    <Link
      href={`/staff/events/${eventId}/judge/${entry.id}`}
      className={buttonVariants({ size: 'sm' })}
    >
      Details
    </Link>
  )

  switch (entry.cat_status) {
    case 'called':
      return (
        <div className="flex gap-1">
          <form action={revertAction}>
            {hidden}
            <Button type="submit" size="sm" variant="outline">
              Revert
            </Button>
          </form>
          <form action={absentAction}>
            {hidden}
            <Button type="submit" size="sm" variant="outline">
              Absent
            </Button>
          </form>
          {details}
        </div>
      )
    case 'registered':
    case 'waiting':
    case 'absent':
      return (
        <form action={callAction}>
          {hidden}
          <Button type="submit" size="sm">
            Call
          </Button>
        </form>
      )
    default:
      return details || null
  }
}

export default async function EventQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { eventId: rawEventId } = await params
  const eventId = Number(rawEventId)
  if (!Number.isInteger(eventId) || eventId < 1) notFound()

  const { payload, user } = await requireStaff()
  const staff = await findStaffEvent(payload, user, eventId)
  if (!staff) notFound()

  const { q } = await searchParams
  const catalogNumber = q && /^\d+$/.test(q.trim()) ? Number(q.trim()) : undefined
  const [entries, allEntries] = await Promise.all([
    findEventEntries(payload, eventId, catalogNumber),
    catalogNumber ? findEventEntries(payload, eventId) : null,
  ])
  const counted = allEntries ?? entries
  const count = (...statuses: QueueEntry['cat_status'][]) =>
    counted.filter((entry) => statuses.includes(entry.cat_status)).length

  const { event, roles } = staff
  const isJudge = roles.includes('judge')
  const byStatus = (...statuses: QueueEntry['cat_status'][]) =>
    entries.filter((entry) => statuses.includes(entry.cat_status))

  const sections: Section[] = [
    { title: 'Called', entries: byStatus('called') },
    { title: 'Waiting', entries: byStatus('registered', 'waiting') },
    { title: 'Absent', entries: byStatus('absent') },
    { title: 'Done', entries: byStatus('exhibited', 'rated') },
  ]

  const stats = [
    { label: 'Total', value: counted.length },
    { label: 'Called', value: count('called') },
    { label: 'Waiting', value: count('registered', 'waiting') },
    { label: 'Absent', value: count('absent') },
  ]

  return (
    <>
      <header className="text-center">
        <h1 className="text-2xl font-semibold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">
          {eventTypeLabels[event.event_type]} · {event.show.show_name}
        </p>
      </header>

      <dl className="grid grid-cols-4 gap-2 text-center">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-muted p-2">
            <dd className="text-xl font-semibold">{stat.value}</dd>
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <form role="search" className="flex gap-2">
        <Input
          name="q"
          type="search"
          inputMode="numeric"
          placeholder="Search cat by number…"
          defaultValue={q}
          aria-label="Search cat by catalog number"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {sections
        .filter((section) => section.entries.length > 0)
        .map((section) => (
          <section key={section.title} aria-labelledby={`section-${section.title}`}>
            <h2 id={`section-${section.title}`} className="mb-2 text-lg font-semibold">
              {section.title} ({section.entries.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {section.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">#{entry.cat.catalog_number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.cat.breed} · {entry.cat.sex}
                      {entry.called_at && entry.cat_status !== 'rated' && (
                        <> · {formatTime(entry.called_at)}</>
                      )}
                      {section.title === 'Done' && <> · {getCatStatus(entry.cat_status).label}</>}
                    </p>
                  </div>
                  <EntryActions entry={entry} eventId={eventId} isJudge={isJudge} />
                </li>
              ))}
            </ul>
          </section>
        ))}

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {catalogNumber ? 'No cat with this number in this event.' : 'No cats in this event yet.'}
        </p>
      )}
    </>
  )
}
