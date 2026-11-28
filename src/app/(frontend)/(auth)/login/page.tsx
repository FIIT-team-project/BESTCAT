import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getFrontendSession } from '@/lib/frontend-session'
import { getShowLandingPath } from '@/lib/shows'

import { AuthForm } from '../auth-form'

export const metadata: Metadata = { title: 'Log in' }

export default async function LoginPage() {
  const { payload, user } = await getFrontendSession()
  if (user?.collection === 'users') redirect(await getShowLandingPath(payload, user))

  return <AuthForm mode="login" />
}
