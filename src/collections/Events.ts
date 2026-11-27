import type { CollectionConfig } from 'payload'

import { eventStatusLabels } from '../lib/event-schedule'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'show', 'event_type', 'start_time', 'judge', 'steward'],
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
        { label: 'Table', value: 'table' },
        { label: 'Ring', value: 'ring' },
      ],
    },
    {
      name: 'start_time',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd MMM yyyy HH:mm' },
        description: 'The picker uses your browser timezone. The schedule uses Bratislava time.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: Object.entries(eventStatusLabels).map(([value, label]) => ({ value, label })),
    },
  ],
}
