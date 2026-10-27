import React from 'react'
import './styles.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  description: 'BESTCAT cat show management.',
  title: 'BESTCAT',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
