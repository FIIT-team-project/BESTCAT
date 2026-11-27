import config from '@payload-config'
import { headers } from 'next/headers.js'
import { getPayload } from 'payload'
import { cache } from 'react'

export const getFrontendSession = cache(async () => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return { payload, user }
})
