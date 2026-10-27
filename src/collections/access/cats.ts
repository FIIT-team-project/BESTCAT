import type { Access } from 'payload'
import { eventScope, isShowAdministrator, relationshipID } from './shows'

export const readCats: Access = async ({ req }) => {
  if (!req.user) return false
  // Show administrators need the shared cat catalogue to register entries.
  if (await isShowAdministrator(req)) return true

  const [ownerships, entries] = await Promise.all([
    req.payload.find({
      collection: 'catOwners',
      where: { userId: { equals: req.user.id } },
      select: { catId: true },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
    req.payload.find({
      collection: 'catEventEntries',
      where: eventScope(req.user.id, 'eventId.'),
      select: { catId: true },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  ])

  const catIDs = [...ownerships.docs, ...entries.docs].map((doc) => relationshipID(doc.catId))
  return { id: { in: catIDs } }
}
