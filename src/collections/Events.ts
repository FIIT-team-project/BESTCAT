import type { CollectionConfig } from 'payload'

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
  ],
}
