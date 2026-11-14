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
  ],
}
