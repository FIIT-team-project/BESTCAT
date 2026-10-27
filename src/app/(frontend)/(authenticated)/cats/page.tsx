import { requireUser } from '@/lib/getCurrentUser'
import config from '@payload-config'
import { getPayload } from 'payload'

export default async function HomePage() {
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

  const { docs: cats } = await payload.find({
    collection: 'cats',
    where: { id: { in: catIds } },
    user,
    overrideAccess: false,
    sort: 'id',
    pagination: false,
    depth: 0,
  })

  return (
    <div>
      {cats.map((cat) => (
        <div key={cat.id}>{cat.name}</div>
      ))}
    </div>
  )
}
