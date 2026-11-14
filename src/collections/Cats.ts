import type { CollectionConfig } from 'payload'

export const Cats: CollectionConfig = {
  slug: 'cats',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'breed', 'owner', 'wcf_id'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'breed',
      type: 'text',
      required: true,
    },
    {
      name: 'color',
      type: 'text',
      required: true,
    },
    {
      name: 'sex',
      type: 'text',
      required: true,
    },
    {
      name: 'birthday',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'wcf_id',
      label: 'WCF ID',
      type: 'text',
      required: true,
    },
  ],
}
