import type { CollectionConfig } from 'payload'
import { admins } from './access/admins'
import { manageShows, readShows } from './access/shows'

export const Shows: CollectionConfig = {
  slug: 'shows',
  defaultSort: 'id',
  admin: {
    defaultColumns: ['id', 'chiefStewardId', 'isActive'],
  },
  access: {
    read: readShows,
    create: admins,
    update: manageShows,
    delete: admins,
  },
  fields: [
    {
      name: 'chiefStewardId',
      label: 'Chief steward',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: admins },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: false, index: true },
  ],
}
