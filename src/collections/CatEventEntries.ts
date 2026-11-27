import { sql } from '@payloadcms/db-sqlite'
import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import type { CatEventEntry } from '@/payload-types'

const updateEventStatus: CollectionAfterChangeHook<CatEventEntry> = async ({ data, doc, previousDoc, req }) => {
  const status = doc.cat_status ?? data.cat_status ?? previousDoc?.cat_status
  const started = status === 'called' || status === 'exhibited' || status === 'rated'
  const resolved = status === 'rated' || status === 'absent'
  if (!started && !resolved) return doc

  const event = doc.event ?? data.event ?? previousDoc?.event
  const eventId = typeof event === 'number' ? event : event?.id
  if (eventId == null) return doc

  const adapter = req.payload.db
  const transactionId = await req.transactionID
  const transaction = transactionId == null ? undefined : adapter.sessions?.[transactionId]?.db
  const db = (transaction ?? adapter.drizzle) as Parameters<typeof adapter.execute>[0]['db']
  const updatedAt = new Date().toISOString()

  if (started) {
    await adapter.execute({
      db,
      sql: sql`
        UPDATE events SET status = 'ongoing', updated_at = ${updatedAt}
        WHERE id = ${eventId} AND status = 'planned'
      `,
    })
  }

  if (resolved) {
    // Check the entire queue in the same statement as the transition so parallel
    // ratings and absences cannot finish an event with an unresolved entry.
    await adapter.execute({
      db,
      sql: sql`
        UPDATE events SET status = 'finished', updated_at = ${updatedAt}
        WHERE id = ${eventId} AND status = 'ongoing'
          AND EXISTS (
            SELECT 1 FROM cat_event_entries WHERE event_id = ${eventId} AND cat_status = 'rated'
          )
          AND NOT EXISTS (
            SELECT 1 FROM cat_event_entries
            WHERE event_id = ${eventId} AND cat_status NOT IN ('rated', 'absent')
          )
      `,
    })
  }

  return doc
}

export const CatEventEntries: CollectionConfig = {
  slug: 'cat-event-entries',
  hooks: { afterChange: [updateEventStatus] },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'cat', 'event', 'queue_number', 'cat_status'],
  },
  fields: [
    {
      name: 'cat',
      type: 'relationship',
      relationTo: 'cats',
      required: true,
      index: true,
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    {
      name: 'queue_number',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'cat_status',
      type: 'select',
      required: true,
      defaultValue: 'registered',
      options: [
        {
          label: 'Registered',
          value: 'registered',
        },
        {
          label: 'Waiting',
          value: 'waiting',
        },
        {
          label: 'Called',
          value: 'called',
        },
        {
          label: 'Exhibited',
          value: 'exhibited',
        },
        {
          label: 'Rated',
          value: 'rated',
        },
        {
          label: 'Absent',
          value: 'absent',
        },
      ],
    },
    {
      name: 'called_at',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Set when the steward calls the cat.',
      },
    },
    {
      type: 'collapsible',
      label: 'Rating',
      fields: [
        {
          name: 'place',
          type: 'number',
          min: 1,
        },
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'score',
          type: 'number',
          min: 0,
          max: 10,
        },
        {
          name: 'text_rating',
          type: 'textarea',
        },
      ],
    },
  ],
}
