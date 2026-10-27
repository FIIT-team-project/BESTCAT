'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { TableRow } from '@/components/ui/table'

export function EventTableRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter()

  return (
    <TableRow
      onClick={(event) => {
        // Keep the link's native keyboard, new-tab, and modifier-click behavior.
        if (
          (event.target as HTMLElement).closest('a') ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return
        router.push(href)
      }}
    >
      {children}
    </TableRow>
  )
}
