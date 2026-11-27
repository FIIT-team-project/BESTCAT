import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCatStatus } from '@/lib/catStatus'
import { requireStaff } from '@/lib/events/currentStaff'
import { QueueError, findEntryForJudge } from '@/lib/events/queue'

import { RatingForm } from './rating-form'

export const metadata: Metadata = { title: 'Rate cat' }

const ageInYears = (birthday: string) => {
  const born = new Date(birthday)
  const now = new Date()
  const age = now.getFullYear() - born.getFullYear()
  const hadBirthday =
    now.getMonth() > born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate())
  return hadBirthday ? age : age - 1
}

export default async function RateEntryPage({
  params,
}: {
  params: Promise<{ eventId: string; entryId: string }>
}) {
  const { eventId: rawEventId, entryId: rawEntryId } = await params
  const eventId = Number(rawEventId)
  const entryId = Number(rawEntryId)
  if (![eventId, entryId].every((id) => Number.isInteger(id) && id > 0)) notFound()

  const { payload, user } = await requireStaff()
  const entry = await findEntryForJudge(payload, user, entryId).catch((error) => {
    if (error instanceof QueueError) return null
    throw error
  })
  if (!entry || entry.event.id !== eventId) notFound()

  const { cat } = entry

  return (
    <>
      <Link
        href={`/staff/events/${eventId}/steward`}
        className="text-sm underline-offset-4 hover:underline"
      >
        ← {entry.event.name}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-semibold">Cat #{cat.catalog_number}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>Breed: {cat.breed}</p>
          {cat.birthday && <p>Age: {ageInYears(cat.birthday)}</p>}
          <p>Sex: {cat.sex}</p>
          {cat.show_class && <p>Class: {cat.show_class}</p>}
          <Badge variant="secondary" className="mt-2">
            {getCatStatus(entry.cat_status).label}
          </Badge>
        </CardContent>
      </Card>

      {/* Pass only the rating fields: the entry also holds the owner's contact details. */}
      <RatingForm
        entry={{
          id: entry.id,
          title: entry.title,
          score: entry.score,
          place: entry.place,
          text_rating: entry.text_rating,
        }}
        eventId={eventId}
      />
    </>
  )
}
