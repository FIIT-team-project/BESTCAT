import type { MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.create({
    collection: 'users',
    data: {
      email: 'admin@example.com',
      password: 'admin',
      roles: ['admin'],
    },
  })
}
