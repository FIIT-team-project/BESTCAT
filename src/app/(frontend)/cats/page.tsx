import { ListPagination } from '@/components/list-pagination'
import { PAGE_SIZE, pageNumber, paginated, type BrowseProps } from '@/lib/pagination'
import { CatGrid } from '@/components/cat-grid'
import { requireUser } from '@/lib/getCurrentUser'
import config from '@payload-config'
import { getPayload } from 'payload'

export default async function HomePage({ searchParams }: BrowseProps) {
  const search = (await searchParams) ?? {}
  const user = await requireUser()

  const payload = await getPayload({ config })

  const { docs: ownerships } = await payload.find({
    collection: 'catOwners',
    where: { userId: { equals: user.id } },
    depth: 0,
    pagination: false,
    // catOwners is admin-only; this server-side lookup is scoped to the authenticated user.
    overrideAccess: true,
  })

  const catIds = ownerships.map(({ catId }) => (typeof catId === 'object' ? catId.id : catId))

  const result = await paginated(pageNumber(search.page), (page) =>
    payload.find({
      collection: 'cats',
      where: { id: { in: catIds } },
      user,
      overrideAccess: false,
      sort: 'id',
      limit: PAGE_SIZE,
      page,
      depth: 0,
    }),
  )
  const { docs: cats } = result

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">My Cats</h1>
      <CatGrid cats={cats} />
      {cats.length === 0 && <p>You have no cats yet.</p>}
      <ListPagination result={result} path={`/cats`} search={search} label="Cats" />
    </div>
  )
}
