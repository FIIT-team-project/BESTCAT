import { redirect } from 'next/navigation'

import { getFrontendSession } from '@/lib/frontend-session'

/** The logged-in user or admin; anyone else is sent to the login page. */
export async function requireStaff() {
  const { payload, user } = await getFrontendSession()
  if (user?.collection !== 'users' && user?.collection !== 'admins') redirect('/login')

  return { payload, user }
}
