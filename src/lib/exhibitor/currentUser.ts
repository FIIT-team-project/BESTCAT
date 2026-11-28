import { redirect } from 'next/navigation'

import { getFrontendSession } from '@/lib/frontend-session'

/** The logged-in regular user; anyone else is sent to the login page. */
export async function requireExhibitor() {
  const { payload, user } = await getFrontendSession()
  if (user?.collection !== 'users') redirect('/login')

  return { payload, user }
}
