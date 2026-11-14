import { getPayload } from 'payload'
import { randomUUID } from 'node:crypto'
import config from '../../src/payload.config.js'

export const testAdmin = {
  email: `e2e-admin-${randomUUID()}@example.com`,
  password: 'test-password',
}

/**
 * Seeds an admin account for e2e admin tests.
 */
export async function seedTestAdmin(): Promise<void> {
  const payload = await getPayload({ config })

  // Create a fresh test admin.
  await payload.create({
    collection: 'admins',
    data: testAdmin,
  })
}

/**
 * Cleans up the admin account after tests.
 */
export async function cleanupTestAdmin(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'admins',
    where: {
      email: {
        equals: testAdmin.email,
      },
    },
  })
}
