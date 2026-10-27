import Link from 'next/link'
import { CatDetailLink } from '@/components/cat-detail-link'
import { ListPagination } from '@/components/list-pagination'
import { PAGE_SIZE, pageNumber, paginated, type BrowseProps } from '@/lib/pagination'
import { CatPhoto } from '@/components/cat-photo'
import { requireUser } from '@/lib/getCurrentUser'
import { relationshipID } from '@/collections/access/shows'
import config from '@payload-config'
import { getPayload } from 'payload'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default async function Page({
  params,
  searchParams,
}: { params: Promise<{ id: string }> } & BrowseProps) {
  const search = (await searchParams) ?? {}
  const user = await requireUser()
  const { id } = await params
  const payload = await getPayload({ config })
  // Ownership records are admin-only; look up only the authenticated user's cats.
  const { docs: ownerships } = await payload.find({
    collection: 'catOwners',
    where: { userId: { equals: user.id } },
    select: { catId: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const catIds = ownerships.map(({ catId }) => relationshipID(catId))
  const showFilter = { 'eventId.showId': { equals: Number(id) } }
  // Paginate cats, then fetch all of their events so one cat is never split across pages.
  const result = await paginated(pageNumber(search.page), (page) =>
    payload.findDistinct({
      collection: 'catEventEntries',
      field: 'catId',
      where: { and: [showFilter, { catId: { in: catIds } }] },
      depth: 0,
      limit: PAGE_SIZE,
      page,
      sort: 'catId',
      user,
      overrideAccess: false,
    }),
  )
  const pageCatIds = result.values.map(({ catId }) => relationshipID(catId))
  const { docs: entries } = await payload.find({
    collection: 'catEventEntries',
    where: { and: [showFilter, { catId: { in: pageCatIds } }] },
    select: { catId: true, eventId: true, rating: true, status: true },
    depth: 1,
    pagination: false,
    sort: ['catId', 'eventId', 'id'],
    user,
    overrideAccess: false,
  })
  const groups = result.values.map(({ catId }) => {
    const catEntries = entries.filter(
      (entry) => relationshipID(entry.catId) === relationshipID(catId),
    )
    const populated = catEntries.find((entry) => typeof entry.catId === 'object')?.catId
    return {
      id: relationshipID(catId),
      cat: typeof populated === 'object' ? populated : undefined,
      entries: catEntries,
    }
  })

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">My Entries</h1>
      {groups.length === 0 ? (
        <p className="text-muted-foreground">
          You have no cats entered in this show.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(({ id: catId, cat, entries: catEntries }) => {
            return (
              <Card key={catId}>
                <CardHeader className="relative">
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
                    <dt>WCF ID</dt>
                    <dd>{cat?.wcfId || '—'}</dd>
                    <dt>Breed</dt>
                    <dd>{cat?.breed || '—'}</dd>
                    <dt>Sex</dt>
                    <dd>{cat?.sex || '—'}</dd>
                    <dt>Color</dt>
                    <dd>{cat?.color || '—'}</dd>
                  </dl>
                  <h2 className="mt-4 font-medium">Events and scores</h2>
                  <ul className="mt-2 flex flex-col gap-3">
                    {catEntries.map((entry) => {
                      const event = typeof entry.eventId === 'object' ? entry.eventId : undefined
                      return (
                        <li
                          key={entry.id}
                          className="flex flex-wrap items-start justify-between gap-2 border-t pt-3 text-sm"
                        >
                          <div>
                            <Link
                              href={`/shows/${id}/events/${relationshipID(entry.eventId)}`}
                              className="underline underline-offset-4"
                            >
                              {event?.name || `Event ${relationshipID(entry.eventId)}`}
                            </Link>
                            <p className="text-muted-foreground">{entry.status || 'queued'}</p>
                          </div>
                          <p>
                            {entry.rating?.trim() ? `Score: ${entry.rating}` : 'Not scored yet'}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      <ListPagination
        result={result}
        path={`/shows/${id}/exhibitor/entries`}
        search={search}
        label="Cats"
      />
    </div>
  )
}
