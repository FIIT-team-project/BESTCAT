import type { CollectionConfig } from 'payload'
import { adminsOrThisUser } from './access/adminOrThisUser'
import { admins } from './access/admins'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: adminsOrThisUser,
    create: admins,
    update: admins,
    delete: admins,
    unlock: admins,
    admin: admins,
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['user'],
      saveToJWT: true,
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        create: admins,
        update: admins,
      },
    },
  ],
}
