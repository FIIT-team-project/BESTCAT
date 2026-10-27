import Link from 'next/link'
import { relationshipID } from '@/collections/access/shows'
import type { Event } from '@/payload-types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function EventGrid({
  events,
  view,
  assignedUserId,
}: {
  events: Event[]
  view?: 'judge' | 'steward'
  assignedUserId?: number
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const eventView =
            view ??
            (assignedUserId === undefined
              ? undefined
              : relationshipID(event.judgeId) === assignedUserId
                ? 'judge'
                : relationshipID(event.stewardId) === assignedUserId
                  ? 'steward'
                  : undefined)
          return (
            <Card key={event.id} className="relative">
              <CardHeader>
                <CardTitle>
                  <Link
                    href={`/shows/${relationshipID(event.showId)}/events/${event.id}${eventView ? `/${eventView}` : ''}`}
                    className="underline underline-offset-4 after:absolute after:inset-0"
                  >
                    {event.name || `Event ${event.id}`}
                  </Link>
                </CardTitle>
                <CardDescription>{event.eventType || 'No event type'}</CardDescription>
              </CardHeader>
              <CardContent>Rating: {event.eventRating || '—'}</CardContent>
            </Card>
          )
        })}
      </div>
      {events.length === 0 && <p>No events available for this show.</p>}
    </>
  )
}
