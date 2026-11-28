import type { Metadata } from 'next'
import React from 'react'

import { getFrontendSession } from '@/lib/frontend-session'
import { findActiveShow, getShowNavigation } from '@/lib/shows'

import { TopBar } from './top-bar'
import './styles.css'

export const metadata: Metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const { payload, user } = await getFrontendSession()
  const show = await findActiveShow(payload)
  const navigation = await getShowNavigation(payload, user, show?.id)

  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col">
        <TopBar {...navigation} activeShowName={show?.show_name} />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  )
}
