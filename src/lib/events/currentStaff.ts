import config from '@payload-config'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import type { Admin, User } from '@/payload-types'

/** The logged-in user or admin; anyone else is sent to the login page. */
export async function requireStaff() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user?.collection !== 'users' && user?.collection !== 'admins') redirect('/login')

  return {
    payload,
    user: user as (User & { collection: 'users' }) | (Admin & { collection: 'admins' }),
  }
}
