import type { Access, PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { Users } from '@/collections/Users'
import type { User } from '@/payload-types'

function makeUser(id: number, role: User['role']): User {
  return {
    id,
    collection: 'users',
    email: `permissions-${id}@example.com`,
    role,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function accessArgs(user: User | null): Parameters<Access>[0] {
  return {
    req: {
      user,
      payload: { count: vi.fn().mockResolvedValue({ totalDocs: 0 }) },
    } as unknown as PayloadRequest,
  }
}

const actors = [
  { name: 'anonymous visitor', user: null, isAdmin: false },
  { name: 'regular user', user: makeUser(1, 'user'), isAdmin: false },
  { name: 'admin', user: makeUser(2, 'admin'), isAdmin: true },
]

describe('Users permissions', () => {
  describe.each(actors)('$name', ({ user, isAdmin }) => {
    it.each(['create', 'update', 'delete', 'unlock', 'admin'] as const)(
      '%s is allowed only for admins',
      async (operation) => {
        const check = Users.access?.[operation]
        expect(check).toBeTypeOf('function')
        expect(await check!(accessArgs(user))).toBe(isAdmin)
      },
    )

    it('allows admins to read everyone and restricts other users to their own ID', async () => {
      const check = Users.access?.read
      expect(check).toBeTypeOf('function')

      const result = await check!(accessArgs(user))

      if (isAdmin) {
        expect(result).toBe(true)
      } else if (user) {
        expect(result).toEqual({ id: { equals: user.id } })
      } else {
        expect(result).toBe(false)
      }
    })
  })

  it('uses the authenticated user ID even when another ID is requested', async () => {
    const user = makeUser(1, 'user')

    expect(
      await Users.access!.read!({
        ...accessArgs(user),
        id: 2,
        data: { id: 2, role: 'admin' },
      }),
    ).toEqual({ id: { equals: 1 } })
  })

  describe('role field permissions', () => {
    const roleField = Users.fields.find((field) => 'name' in field && field.name === 'role')

    it('defaults new users to the user role', () => {
      expect(roleField).toMatchObject({
        type: 'select',
        required: true,
        defaultValue: 'user',
        saveToJWT: true,
      })
    })

    describe.each(actors)('$name', ({ user, isAdmin }) => {
      it.each(['create', 'update'] as const)(
        'can %s the role only as an admin, regardless of the submitted role',
        async (operation) => {
          if (!roleField || !('access' in roleField)) {
            throw new Error('The role field must define access control')
          }

          const check = roleField.access?.[operation]
          expect(check).toBeTypeOf('function')
          expect(
            await check!({
              ...accessArgs(user),
              data: { role: 'admin' },
              siblingData: { role: 'admin' },
            }),
          ).toBe(isAdmin)
        },
      )
    })
  })
})
