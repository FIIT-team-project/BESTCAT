import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { ShowBreadcrumbs } from '@/components/show-breadcrumbs'

export default async function ShowLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  const { id } = await params
  const showId = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(showId) || showId <= 0) notFound()
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'shows',
    where: { id: { equals: showId } },
    user,
    overrideAccess: false,
    depth: 0,
    limit: 1,
  })
  if (!docs[0]) notFound()
  return (
    <>
      <ShowBreadcrumbs hideEvents />
      {children}
    </>
  )
}
