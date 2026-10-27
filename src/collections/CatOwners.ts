import type { CollectionConfig } from 'payload'
import { admins } from './access/admins'

export const CatOwners: CollectionConfig = {
  slug: 'catOwners',
  labels: {
    singular: 'Cat owner',
    plural: 'Cat owners',
  },
  admin: {
    defaultColumns: ['userId', 'catId'],
  },
  access: {
    read: admins,
    create: admins,
    update: admins,
    delete: admins,
  },
  indexes: [{ fields: ['userId', 'catId'], unique: true }],
  fields: [
    {
      name: 'userId',
      label: 'User',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'catId',
      label: 'Cat',
      type: 'relationship',
      relationTo: 'cats',
      required: true,
      index: true,
    },
  ],
}
