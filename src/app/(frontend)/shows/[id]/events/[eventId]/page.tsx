import { CatDetailLink } from '@/components/cat-detail-link'
import { ListPagination } from '@/components/list-pagination'
import { PAGE_SIZE, pageNumber, paginated, type BrowseProps } from '@/lib/pagination'
import { CatPhoto } from '@/components/cat-photo'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/getCurrentUser'

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; eventId: string }>
} & BrowseProps) {
  const search = (await searchParams) ?? {}
  const user = await getCurrentUser()
  const { id, eventId } = await params
  const eventID = Number(eventId)
  if (!/^\d+$/.test(eventId) || !Number.isSafeInteger(eventID) || eventID <= 0) notFound()

  const payload = await getPayload({ config })
  const { docs: events } = await payload.find({
    collection: 'events',
    where: { id: { equals: eventID } },
    user,
    overrideAccess: false,
    depth: 0,
    limit: 1,
  })
  const event = events[0]
  if (!event) notFound()

  const result = await paginated(pageNumber(search.page), (page) =>
    payload.find({
      collection: 'catEventEntries',
      where: { eventId: { equals: event.id } },
      user,
      overrideAccess: false,
      depth: 1,
      limit: PAGE_SIZE,
      page,
      sort: ['queuePosition', 'id'],
    }),
  )
  const { docs: entries } = result

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">{event.name || `Event ${event.id}`}</h1>
      <p className="text-muted-foreground">
        {event.eventType || 'No event type'} · {event.eventRating || 'No event rating'}
      </p>
      <p className="text-muted-foreground">Cats entered in this event.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const cat = typeof entry.catId === 'object' ? entry.catId : undefined
          return (
            <Card key={entry.id} className="relative">
              <CardHeader>
                <CardTitle>
                  {cat ? (
                    <CatDetailLink id={cat.id}>{cat.name || `Cat ${cat.id}`}</CatDetailLink>
                  ) : (
                    'Cat unavailable'
                  )}
                </CardTitle>
                <CardDescription>WCF ID: {cat?.wcfId || '—'}</CardDescription>
              </CardHeader>
              <CardContent>
                <CatPhoto cat={cat} />
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <dt>Queue position</dt>
                  <dd>{entry.queuePosition ?? '—'}</dd>
                  <dt>Breed</dt>
                  <dd>{cat?.breed || '—'}</dd>
                  <dt>Sex</dt>
                  <dd>{cat?.sex || '—'}</dd>
                  <dt>Color</dt>
                  <dd>{cat?.color || '—'}</dd>
                  <dt>Status</dt>
                  <dd>{entry.status || '—'}</dd>
                  <dt>Rating</dt>
                  <dd>{entry.rating || '—'}</dd>
                </dl>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {entries.length === 0 && <p>No cats entered in this event.</p>}
      <ListPagination
        result={result}
        path={`/shows/${id}/events/${eventId}`}
        search={search}
        label="Entries"
      />
    </div>
  )
}
