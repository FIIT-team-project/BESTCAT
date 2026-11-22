import type { CollectionConfig } from 'payload'

export const CatEventEntries: CollectionConfig = {
  slug: 'cat-event-entries',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'cat', 'event'],
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
      ],
    },
  ],
}