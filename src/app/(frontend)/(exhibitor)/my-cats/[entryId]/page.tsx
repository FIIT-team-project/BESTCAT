import { CheckCircle2, Circle } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireExhibitor } from '@/lib/exhibitor/currentUser'
import {
  catStatusSteps,
  eventTypeLabels,
  findExhibitorEntry,
  getCatStatusStep,
} from '@/lib/exhibitor/entries'

export const metadata: Metadata = { title: 'Cat progress' }

export default async function CatProgressPage({
  params,
}: {
  params: Promise<{ entryId: string }>
}) {
  const { entryId } = await params
  const id = Number(entryId)
  if (!Number.isInteger(id) || id < 1) notFound()

  const { payload, user } = await requireExhibitor()
  const entry = await findExhibitorEntry(payload, user.id, id)
  if (!entry) notFound()

  const { cat, event } = entry
  const judgeName = typeof event.judge === 'object' ? event.judge.name : undefined
  const currentStep = catStatusSteps.findIndex((step) => step.value === entry.cat_status)

  return (
    <>
      <Link href="/my-cats" className="text-sm underline-offset-4 hover:underline">
        ← My cats
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">
          #{cat.catalog_number} {cat.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {cat.breed} · {cat.color} · {cat.sex}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>
              {event.name} ({eventTypeLabels[event.event_type]})
            </h2>
          </CardTitle>
          <CardDescription>
            {event.show.show_name}
            {judgeName && <> · Judge: {judgeName}</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2">
          <Badge variant={entry.cat_status === 'called' ? 'default' : 'secondary'}>
            {getCatStatusStep(entry.cat_status).label}
          </Badge>
          <span className="text-sm text-muted-foreground">Queue number {entry.queue_number}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Rating</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {/* TODO: show place and title once they are added to cat-event-entries. */}
          {entry.cat_status === 'rated' ? 'Your cat has been rated.' : 'Not rated yet.'}
        </CardContent>
      </Card>

      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="mb-3 text-sm font-medium text-muted-foreground">
          Timeline
        </h2>
        <ol className="flex flex-col gap-4">
          {catStatusSteps.map((step, index) => {
            const reached = index <= currentStep
            const Icon = reached ? CheckCircle2 : Circle

            return (
              <li
                key={step.value}
                aria-current={index === currentStep ? 'step' : undefined}
                className={reached ? 'flex gap-3' : 'flex gap-3 text-muted-foreground'}
              >
                <Icon aria-hidden className="mt-1 size-5 shrink-0" />
                <div>
                  <p className="font-medium">{step.label}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}
