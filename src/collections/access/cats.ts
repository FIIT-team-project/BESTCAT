import type { Access } from 'payload'
import { isShowAdministrator, relationshipID } from './shows'

export const readCats: Access = async ({ req }) => {
  // Show administrators need the shared cat catalogue to register entries.
  if (req.user && (await isShowAdministrator(req))) return true

  const [ownerships, entries] = await Promise.all([
    req.user
      ? req.payload.find({
          collection: 'catOwners',
          where: { userId: { equals: req.user.id } },
          select: { catId: true },
          depth: 0,
          limit: 0,
          pagination: false,
          overrideAccess: true,
          req,
        })
      : Promise.resolve({ docs: [] }),
    req.payload.find({
      collection: 'catEventEntries',
      // Only cats entered in a show are public; unentered cats stay private.
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
