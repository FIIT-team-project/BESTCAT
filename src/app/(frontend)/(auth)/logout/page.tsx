import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { AuthForm } from '../auth-form'

export const metadata: Metadata = { title: 'Log out' }

export default async function LogoutPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user?.collection !== 'users') redirect('/login')

  return <AuthForm mode="logout" />
}
