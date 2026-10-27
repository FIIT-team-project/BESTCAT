import type { ReactNode } from 'react'
import { EventWorkspaceDrafts } from '@/components/event-workspace-drafts'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { ShowBreadcrumbs } from '@/components/show-breadcrumbs'

export default async function EventLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ id: string; eventId: string }>
}) {
  const user = await getCurrentUser()
  const { id, eventId } = await params
  const showID = Number(id)
  const eventID = Number(eventId)
  if (
    ![id, eventId].every(
      (value) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0,
    )
  )
    notFound()
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'events',
    where: { and: [{ id: { equals: eventID } }, { showId: { equals: showID } }] },
    user,
    overrideAccess: false,
    depth: 0,
    limit: 1,
  })
  if (!docs[0]) notFound()
  return (
    <EventWorkspaceDrafts
      key={`${user?.id ?? 'guest'}:${eventID}`}
      eventPath={`/shows/${showID}/events/${eventID}`}
    >
      <ShowBreadcrumbs eventName={docs[0].name} />
      {children}
    </EventWorkspaceDrafts>
  )
}
