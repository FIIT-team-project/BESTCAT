'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'

export function CatDetailLink({ id, children }: { id: number; children: ReactNode }) {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const returnTo = `${pathname}${search ? `?${search}` : ''}`
  return (
    <Link
      href={`/cats/${id}?returnTo=${encodeURIComponent(returnTo)}`}
      className="underline underline-offset-4 after:absolute after:inset-0"
    >
      {children}
    </Link>
  )
}
