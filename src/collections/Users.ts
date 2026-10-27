import type { CollectionConfig } from 'payload'
import { adminsOrThisUser } from './access/adminOrThisUser'
import { admins } from './access/admins'
import { showAdministrators } from './access/shows'

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
    admin: showAdministrators,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'judgingQualifications',
      type: 'textarea',
      access: { create: admins, update: admins },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
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
