import { ListPagination } from '@/components/list-pagination'
import { PAGE_SIZE, pageNumber, paginated, type BrowseProps } from '@/lib/pagination'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { EventGrid } from '@/components/event-grid'
import { getActiveShow } from '@/lib/getActiveShow'
import { getCurrentUser } from '@/lib/getCurrentUser'
import config from '@payload-config'
import { getPayload, type Where } from 'payload'

export default async function HomePage({ searchParams }: BrowseProps) {
  const search = (await searchParams) ?? {}
  const user = await getCurrentUser()
  const activeShow = await getActiveShow()

  const payload = await getPayload({ config })
  const lists: [string, Where][] = [
    [
      'judgingPage',
      {
        and: [{ showId: { equals: activeShow?.id ?? 0 } }, { judgeId: { equals: user?.id ?? 0 } }],
      },
    ],
    [
      'stewardingPage',
      {
        and: [
          { showId: { equals: activeShow?.id ?? 0 } },
          { stewardId: { equals: user?.id ?? 0 } },
        ],
      },
    ],
    ['eventsPage', { showId: { equals: activeShow?.id ?? 0 } }],
  ]
  const [judging, stewarding, showEvents] = await Promise.all(
    lists.map(([key, where]) =>
      paginated(pageNumber(search[key]), (page) =>
        payload.find({
          collection: 'events',
          where,
          user,
          overrideAccess: false,
          depth: 0,
          limit: PAGE_SIZE,
          page,
          sort: 'id',
        }),
      ),
    ),
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      {judging.totalDocs > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Judging</h2>
          <EventGrid events={judging.docs} view="judge" />
          <ListPagination
            result={judging}
            path="/"
            search={search}
            pageKey="judgingPage"
            label="Judging"
          />
        </section>
      )}
      {stewarding.totalDocs > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Stewarding</h2>
          <EventGrid events={stewarding.docs} view="steward" />
          <ListPagination
            result={stewarding}
            path="/"
            search={search}
            pageKey="stewardingPage"
            label="Stewarding"
          />
        </section>
      )}
      <h1 className="text-lg font-medium">Show events</h1>
      <EventGrid events={showEvents.docs} />
      <ListPagination
        result={showEvents}
        path="/"
        search={search}
        pageKey="eventsPage"
        label="All show events"
      />
      <Separator />
      <h1 className="text-lg font-medium">Past shows and other information</h1>
      <Link href="/shows" className="underline underline-offset-4">
        Browse all shows
      </Link>
    </div>
  )
}
