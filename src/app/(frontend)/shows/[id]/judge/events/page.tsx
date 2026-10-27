import { ListPagination } from '@/components/list-pagination'
import { PAGE_SIZE, pageNumber, paginated, type BrowseProps } from '@/lib/pagination'
import { EventGrid } from '@/components/event-grid'
import { requireUser } from '@/lib/getCurrentUser'
import config from '@payload-config'
import { getPayload } from 'payload'

export default async function Page({
  params,
  searchParams,
}: { params: Promise<{ id: string }> } & BrowseProps) {
  const search = (await searchParams) ?? {}
  const user = await requireUser()
  const { id } = await params
  const payload = await getPayload({ config })
  const result = await paginated(pageNumber(search.page), (page) =>
    payload.find({
      collection: 'events',
      where: { and: [{ showId: { equals: Number(id) } }, { judgeId: { equals: user.id } }] },
      user,
      overrideAccess: false,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      sort: 'id',
    }),
  )
  const { docs: events } = result
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Judging</h1>
      <EventGrid events={events} view="judge" />
      <ListPagination
        result={result}
        path={`/shows/${id}/judge/events`}
        search={search}
        label="Events"
      />
    </div>
  )
}
