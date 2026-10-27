import type { PayloadRequest } from 'payload'

/** Returns the first accessible active show, ordered by its numeric ID. */
export async function getActiveShow(req: PayloadRequest) {
  const { docs } = await req.payload.find({
    collection: 'shows',
    where: { isActive: { equals: true } },
    sort: 'id',
    limit: 1,
    depth: 0,
    overrideAccess: false,
    req,
  })
  return docs[0] ?? null
}
