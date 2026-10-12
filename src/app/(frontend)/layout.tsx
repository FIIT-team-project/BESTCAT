import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '@/client/styles.css'

export const metadata: Metadata = {
  title: 'BESTCAT Exhibition System',
  description: 'Správa výstav, posudzovania a živého vyvolávania.',
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  )
}
