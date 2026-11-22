import config from '@payload-config'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

/** The logged-in regular user; anyone else is sent to the login page. */
export async function requireExhibitor() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user?.collection !== 'users') redirect('/login')

  return { payload, user }
}
