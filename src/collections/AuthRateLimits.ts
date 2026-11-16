import type { CollectionConfig } from 'payload'

// Shared across server processes; only trusted server-side auth code may use this collection.
export const AuthRateLimits: CollectionConfig = {
  slug: 'auth-rate-limits',
  admin: { hidden: true },
  access: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: false,
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'count', type: 'number', required: true },
    { name: 'resetAt', type: 'date', required: true, index: true },
  ],
}
