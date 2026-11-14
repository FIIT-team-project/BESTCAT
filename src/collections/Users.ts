import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    admin: () => false,
  },
  fields: [
    // Email and password are provided by Payload authentication.
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'phone_number',
      type: 'text',
    },
  ],
}
