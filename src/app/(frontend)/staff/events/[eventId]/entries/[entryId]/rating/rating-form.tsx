'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { CatEventEntry } from '@/payload-types'

import { rateAction } from '../../../../actions'

type Props = {
  entry: Pick<CatEventEntry, 'id' | 'title' | 'score' | 'place' | 'text_rating'>
  eventId: number
}

export function RatingForm({ entry, eventId }: Props) {
  const [state, formAction, pending] = useActionState(rateAction, {})

  return (
    <form action={formAction}>
      <input type="hidden" name="entryId" value={entry.id} />
      <input type="hidden" name="eventId" value={eventId} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input id="title" name="title" defaultValue={entry.title ?? ''} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="score">Rating (0–10)</FieldLabel>
            <Input
              id="score"
              name="score"
              type="number"
              min={0}
              max={10}
              step={1}
              defaultValue={entry.score ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="place">Place</FieldLabel>
            <Input
              id="place"
              name="place"
              type="number"
              min={1}
              step={1}
              defaultValue={entry.place ?? ''}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="text_rating">Text rating</FieldLabel>
          <textarea
            id="text_rating"
            name="text_rating"
            rows={8}
            placeholder="Enter text rating of the current cat…"
            defaultValue={entry.text_rating ?? ''}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </Field>
        <FieldError>{state.error}</FieldError>
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Submit'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
