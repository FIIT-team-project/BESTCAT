import { ListPagination } from '@/components/list-pagination'
import { PAGE_SIZE, pageNumber, paginated, type BrowseProps } from '@/lib/pagination'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/getCurrentUser'

export default async function ShowsPage({ searchParams }: BrowseProps) {
  const search = (await searchParams) ?? {}
  const user = await getCurrentUser()
  const payload = await getPayload({ config })
  const result = await paginated(pageNumber(search.page), (page) =>
    payload.find({
      collection: 'shows',
      user,
      overrideAccess: false,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      sort: '-id',
    }),
  )
  const { docs: shows } = result

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Shows</h1>
      <p className="text-muted-foreground">
        Browse active and inactive shows, their events, and entered cats.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shows.map((show) => (
          <Card key={show.id} className="relative">
            <CardHeader>
              <CardTitle>
                <Link
                  href={`/shows/${show.id}`}
                  className="underline underline-offset-4 after:absolute after:inset-0"
                >
                  Show {show.id}
                </Link>
              </CardTitle>
              <CardDescription>{show.isActive ? 'Active' : 'Inactive'}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      {shows.length === 0 && <p>No shows available.</p>}
      <ListPagination result={result} path={`/shows`} search={search} label="Shows" />
    </div>
  )
}
