import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'
import { getCurrentUser } from './getCurrentUser'

export const getActiveShow = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return undefined

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'shows',
    where: { isActive: { equals: true } },
    sort: 'id',
    limit: 1,
    depth: 0,
  })
  return docs[0]
})
