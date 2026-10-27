import type { CollectionConfig } from 'payload'
import { admins } from './access/admins'
import { createEvent, manageEvents, readEvents } from './access/shows'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'showId', 'judgeId', 'stewardId'],
  },
  access: {
    read: readEvents,
    create: createEvent,
    update: manageEvents,
    delete: manageEvents,
  },
  fields: [
    {
      name: 'showId',
      label: 'Show',
      type: 'relationship',
      relationTo: 'shows',
      required: true,
      index: true,
      access: { update: admins },
    },
    {
      name: 'judgeId',
      label: 'Judge',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'stewardId',
      label: 'Steward',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text' },
    { name: 'eventType', type: 'text' },
    { name: 'eventRating', type: 'text' },
  ],
}
