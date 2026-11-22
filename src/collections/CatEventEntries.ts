import type { CollectionConfig } from 'payload'

export const CatEventEntries: CollectionConfig = {
  slug: 'cat-event-entries',
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
