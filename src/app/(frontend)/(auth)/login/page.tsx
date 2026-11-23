import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { AuthForm } from '../auth-form'

export const metadata: Metadata = { title: 'Log in' }

export default async function LoginPage() {
  const requestHeaders = await headers()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: requestHeaders })
  if (user?.collection === 'users') redirect('/')

  return <AuthForm mode="login" />
}
