import type { CollectionConfig } from 'payload'

import { isAdmin } from './access/isAdmin'

export const Admins: CollectionConfig = {
  slug: 'admins',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    admin: isAdmin,
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    unlock: isAdmin,
  },
  // Email and password are provided by Payload authentication.
  fields: [],
}
