import type { Access, PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { Users } from '@/collections/Users'
import type { User } from '@/payload-types'

function makeUser(id: number, roles: User['roles']): User {
  return {
    id,
    collection: 'users',
    email: `permissions-${id}@example.com`,
    roles,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function accessArgs(user: User | null): Parameters<Access>[0] {
  // These callbacks only use req.user; no database or HTTP request is needed.
  return { req: { user } as PayloadRequest }
}

const actors = [
  { name: 'anonymous visitor', user: null, isAdmin: false },
  { name: 'regular user', user: makeUser(1, ['user']), isAdmin: false },
  { name: 'admin', user: makeUser(2, ['admin']), isAdmin: true },
  { name: 'user with both roles', user: makeUser(3, ['user', 'admin']), isAdmin: true },
  { name: 'user without roles', user: makeUser(4, []), isAdmin: false },
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
    const user = makeUser(1, ['user'])

    expect(
      await Users.access!.read!({
        ...accessArgs(user),
        id: 2,
        data: { id: 2, roles: ['admin'] },
      }),
    ).toEqual({ id: { equals: 1 } })
  })

  describe('roles field permissions', () => {
    const rolesField = Users.fields.find((field) => 'name' in field && field.name === 'roles')

    it('defaults new users to the user role', () => {
      expect(rolesField).toMatchObject({
        type: 'select',
        hasMany: true,
        required: true,
        defaultValue: ['user'],
        saveToJWT: true,
      })
    })

    describe.each(actors)('$name', ({ user, isAdmin }) => {
      it.each(['create', 'update'] as const)(
        'can %s roles only as an admin, regardless of submitted roles',
        async (operation) => {
          if (!rolesField || !('access' in rolesField)) {
            throw new Error('The roles field must define access control')
          }

          const check = rolesField.access?.[operation]
          expect(check).toBeTypeOf('function')
          expect(
            await check!({
              ...accessArgs(user),
              data: { roles: ['admin'] },
              siblingData: { roles: ['admin'] },
            }),
          ).toBe(isAdmin)
        },
      )
    })
  })
})
