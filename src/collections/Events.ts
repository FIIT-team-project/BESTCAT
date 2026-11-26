import type { CollectionConfig } from 'payload'

import { eventStatusLabels, isEventTime } from '../lib/event-schedule'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'show', 'event_type', 'event_date', 'judge', 'steward'],
  },
  fields: [
    {
      name: 'show',
      type: 'relationship',
      relationTo: 'shows',
      required: true,
      index: true,
    },
    {
      name: 'judge',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'steward',
      type: 'relationship',
      relationTo: 'users',
      // Optional until stewards are assigned; the show import does not know them yet.
      required: false,
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'event_type',
      type: 'select',
      required: true,
      options: [
        { label: 'Table judging', value: 'table' },
        { label: 'Ring', value: 'ring' },
        { label: 'Best in Show', value: 'bis' },
      ],
    },
    {
      name: 'event_date',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'event_time',
      type: 'text',
      admin: { description: 'Start time at the venue in 24-hour format (HH:MM).' },
      validate: (value: string | null | undefined) =>
        value == null || value === '' || isEventTime(value) || 'Enter a time in HH:MM format.',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: Object.entries(eventStatusLabels).map(([value, label]) => ({ value, label })),
    },
    {
      name: 'judgement_number',
      type: 'number',
      min: 1,
      admin: {
        description: 'Order of the judgement for the judge on that day (1st, 2nd, …).',
      },
    },
  ],
}
