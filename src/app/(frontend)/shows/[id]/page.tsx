import { CatGrid } from '@/components/cat-grid'
import { ListPagination } from '@/components/list-pagination'
import { relationshipID } from '@/collections/access/shows'
import { PAGE_SIZE, pageNumber, paginated, type BrowseProps } from '@/lib/pagination'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { EventGrid } from '@/components/event-grid'
import { getCurrentUser } from '@/lib/getCurrentUser'

export default async function ShowPage({
  params,
  searchParams,
}: { params: Promise<{ id: string }> } & BrowseProps) {
  const search = (await searchParams) ?? {}
  const user = await getCurrentUser()
  const { id } = await params
  const showID = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(showID) || showID <= 0) notFound()

  const payload = await getPayload({ config })
  const { docs: shows } = await payload.find({
    collection: 'shows',
    where: { id: { equals: showID } },
    user,
    overrideAccess: false,
    depth: 0,
    limit: 1,
  })
  const show = shows[0]
  if (!show) notFound()

  const eventResult = await paginated(pageNumber(search.eventsPage), (page) =>
    payload.find({
      collection: 'events',
      where: { showId: { equals: show.id } },
      user,
      overrideAccess: false,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      sort: 'id',
    }),
  )
  const { docs: events } = eventResult

  // Distinct IDs are paginated in the database before loading cat details.
  const catResult = await paginated(pageNumber(search.catsPage), (page) =>
    payload.findDistinct({
      collection: 'catEventEntries',
      field: 'catId',
      where: { 'eventId.showId': { equals: show.id } },
      user,
      overrideAccess: false,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      sort: 'catId',
    }),
  )
  const catIds = catResult.values.map(({ catId }) => relationshipID(catId))
  const { docs: cats } = await payload.find({
    collection: 'cats',
    where: { id: { in: catIds } },
    user,
    overrideAccess: false,
    depth: 0,
    limit: PAGE_SIZE,
    sort: 'id',
  })

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Show {show.id}</h1>
      <p className="text-muted-foreground">{show.isActive ? 'Active' : 'Inactive'}</p>
      <h2 className="text-lg font-medium">Events</h2>
      <EventGrid events={events} />
      <ListPagination
        result={eventResult}
        path={`/shows/${show.id}`}
        search={search}
        pageKey="eventsPage"
        label="Events"
      />
      <h2 className="text-lg font-medium">Cats</h2>
      <CatGrid cats={cats} />
      {cats.length === 0 && <p>No cats entered in this show.</p>}
      <ListPagination
        result={catResult}
        path={`/shows/${show.id}`}
        search={search}
        pageKey="catsPage"
        label="Cats"
      />
    </div>
  )
}
