import { APIError, type CollectionConfig } from 'payload'

import { adminOnly, readOwnUser, roleOptions, updateOwnUser } from '@/access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Používateľ', plural: 'Používatelia' },
  auth: {
    tokenExpiration: 60 * 60 * 12,
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'club'],
    group: 'Prístup',
  },
  access: {
    create: adminOnly,
    read: readOwnUser,
    update: updateOwnUser,
    delete: adminOnly,
    admin: ({ req }) => ['admin', 'club', 'editor'].includes((req.user as { role?: string } | null)?.role ?? ''),
  },
  hooks: {
    beforeLogin: [({ user }) => {
      if ((user as { active?: boolean }).active === false) {
        throw new APIError('Tento používateľský účet je deaktivovaný.', 403, null, true)
      }
      return user
    }],
  },
  fields: [
    { name: 'name', label: 'Meno', type: 'text', required: true },
    {
      name: 'role',
      label: 'Rola',
      type: 'select',
      required: true,
      defaultValue: 'viewer',
      options: [...roleOptions],
      access: { update: ({ req }) => (req.user as { role?: string } | null)?.role === 'admin' },
    },
    { name: 'club', label: 'Klub', type: 'relationship', relationTo: 'clubs' },
    { name: 'phone', label: 'Telefón', type: 'text' },
    { name: 'active', label: 'Aktívny účet', type: 'checkbox', defaultValue: true },
  ],
}
