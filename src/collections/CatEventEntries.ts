import type { CollectionConfig } from 'payload'
import { admins } from './access/admins'
import {
  createEntry,
  editEntryCat,
  manageEntries,
  queueEntry,
  rateEntry,
  readEntries,
  updateEntries,
} from './access/shows'

export const CatEventEntries: CollectionConfig = {
  slug: 'catEventEntries',
  labels: {
    singular: 'Cat event entry',
    plural: 'Cat event entries',
  },
  admin: {
    defaultColumns: ['catId', 'eventId', 'status', 'queuePosition', 'rating'],
  },
  access: {
    read: readEntries,
    create: createEntry,
    update: updateEntries,
    delete: manageEntries,
  },
  indexes: [{ fields: ['catId', 'eventId'], unique: true }],
  fields: [
    {
      name: 'catId',
      label: 'Cat',
      type: 'relationship',
      relationTo: 'cats',
      required: true,
      index: true,
      access: { update: editEntryCat },
    },
    {
      name: 'eventId',
      label: 'Event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
      access: { update: admins },
    },
    { name: 'status', type: 'text', access: { update: queueEntry } },
    {
      name: 'queuePosition',
      type: 'number',
      min: 0,
      access: { update: queueEntry },
      validate: (value: number | null | undefined) =>
        value == null ||
        (Number.isInteger(value) && value >= 0) ||
        'Queue position must be a nonnegative integer.',
    },
    { name: 'rating', type: 'text', access: { update: rateEntry } },
  ],
}
