import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { getFrontendSession } from '@/lib/frontend-session'

import { AuthForm } from './(auth)/auth-form'
import './styles.css'

export const metadata: Metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const { user } = await getFrontendSession()

  return (
    <html lang="en">
      <body>
        <header className="flex justify-end px-4 py-2">
          {user?.collection === 'users' && <AuthForm mode="logout" />}
          {!user && (
            <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
              Log in
            </Link>
          )}
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
