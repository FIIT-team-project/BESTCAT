import type { CollectionConfig } from 'payload'
import { admins } from './access/admins'
import { readCats } from './access/cats'

export const Cats: CollectionConfig = {
  slug: 'cats',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'wcfId', 'breed', 'sex'],
  },
  access: {
    read: readCats,
    create: admins,
    update: admins,
    delete: admins,
  },
  fields: [
    { name: 'wcfId', label: 'WCF ID', type: 'text' },
    { name: 'name', type: 'text' },
    {
      name: 'birthday',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    { name: 'country', type: 'text' },
    { name: 'club', type: 'text' },
    { name: 'sex', type: 'text' },
    { name: 'breed', type: 'text' },
    { name: 'color', type: 'text' },
  ],
}
