'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export function ShowBreadcrumbs({
  eventName,
  hideEvents = false,
}: {
  eventName?: string | null
  hideEvents?: boolean
}) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const view = segments[2] === 'events' ? segments[4] : segments[2]
  if (hideEvents && segments[2] === 'events') return null

  const showId = segments[1]
  const items = [
    { label: 'Shows', href: '/shows' },
    { label: `Show ${showId}`, href: `/shows/${showId}` },
  ]

  if (segments[2] === 'events' && segments[3]) {
    const eventPath = `/shows/${showId}/events/${segments[3]}`
    items.push({ label: eventName || `Event ${segments[3]}`, href: eventPath })
    if (view === 'judge' || view === 'steward') {
      items.push({ label: view === 'judge' ? 'Judging' : 'Stewarding', href: pathname })
    }
  } else if (segments[2]) {
    const labels: Record<string, string> = {
      judge: 'Judging',
      steward: 'Stewarding',
      entries: 'My Entries',
      alerts: 'Alerts',
    }
    const label = labels[segments[2] === 'exhibitor' ? segments[3] : segments[2]]
    if (label) items.push({ label, href: pathname })
  }

  return (
    <Breadcrumb className="px-4 pt-4">
      <BreadcrumbList>
        {items.map(({ label, href }, index) => (
          <Fragment key={href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === items.length - 1 ? (
                <BreadcrumbPage>{label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={href} />}>{label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
