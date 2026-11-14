// @vitest-environment node

import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  createLocalReq,
  AuthenticationError,
  Forbidden,
  getAccessResults,
  getPayload,
  type Payload,
  registerFirstUserOperation,
} from 'payload'
import config from '@/payload.config'
import type { Admin, Show, User } from '@/payload-types'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('Local API', () => {
  let payload: Payload
  let databaseDir: string
  let admin: Admin
  let user: User
  let staff: User

  const showData = {
    show_name: 'Test show',
    organization: 'Test organization',
    city: 'Bratislava',
    country: 'Slovakia',
    license_number: 'L#244205',
  }

  const createShow = (data: Partial<Pick<Show, 'show_name' | 'is_active'>> = {}) =>
    payload.create({
      collection: 'shows',
      data: { ...showData, chief_steward: staff.id, is_active: false, ...data },
    })

  beforeAll(async () => {
    databaseDir = await mkdtemp(path.join(tmpdir(), 'bestcat-api-'))
    const payloadConfig = await config
    payload = await getPayload({
      key: databaseDir,
      config: {
        ...payloadConfig,
        secret: 'integration-test-secret',
        db: {
          ...payloadConfig.db,
          ...sqliteAdapter({
            client: { url: `file:${path.join(databaseDir, 'payload.db')}` },
            transactionOptions: {},
          }),
        },
      },
    })

    const firstAdmin = await registerFirstUserOperation<'admins'>({
      collection: payload.collections.admins,
      data: { email: 'admin@example.com', password: 'test-password' },
      req: await createLocalReq({}, payload),
    })
    if (!firstAdmin.user) throw new Error('First admin registration did not return an account.')
    admin = firstAdmin.user

    user = await payload.create({
      collection: 'users',
      data: {
        email: 'user@example.com',
        password: 'test-password',
        name: 'Test owner',
        phone_number: '+421900123456',
      },
    })
    staff = await payload.create({
      collection: 'users',
      data: { email: 'staff@example.com', password: 'test-password', name: 'Test judge' },
    })
  })

  beforeEach(async () => {
    await payload.delete({ collection: 'shows', where: {} })
  })

  afterAll(async () => {
    await payload?.destroy()
    if (databaseDir) await rm(databaseDir, { recursive: true, force: true })
  })

  it('authenticates admins and users through separate collections', async () => {
    const { user: loggedInAdmin } = await payload.login({
      collection: 'admins',
      data: { email: admin.email, password: 'test-password' },
    })
    const { user: loggedInUser } = await payload.login({
      collection: 'users',
      data: { email: user.email, password: 'test-password' },
    })
    expect(loggedInAdmin?.collection).toBe('admins')
    expect(loggedInUser).toMatchObject({
      collection: 'users',
      name: 'Test owner',
      phone_number: '+421900123456',
    })

    await expect(
      payload.login({
        collection: 'admins',
        data: { email: user.email, password: 'test-password' },
      }),
    ).rejects.toBeInstanceOf(AuthenticationError)
    await expect(
      payload.login({
        collection: 'users',
        data: { email: admin.email, password: 'test-password' },
      }),
    ).rejects.toBeInstanceOf(AuthenticationError)
  })

  it('restricts the admin panel and admin account operations to admins', async () => {
    const adminAccess = await getAccessResults({
      req: await createLocalReq({ user: admin }, payload),
    })
    const userAccess = await getAccessResults({
      req: await createLocalReq({ user }, payload),
    })
    const anonymousAccess = await getAccessResults({ req: await createLocalReq({}, payload) })

    expect(adminAccess.canAccessAdmin).toBe(true)
    expect(userAccess.canAccessAdmin).toBeFalsy()
    expect(anonymousAccess.canAccessAdmin).toBeFalsy()

    for (const identity of [null, user]) {
      await expect(
        payload.create({
          collection: 'admins',
          data: { email: 'unauthorized@example.com', password: 'test-password' },
          user: identity,
          overrideAccess: false,
        }),
      ).rejects.toBeInstanceOf(Forbidden)
      await expect(
        payload.find({ collection: 'admins', user: identity, overrideAccess: false }),
      ).rejects.toBeInstanceOf(Forbidden)
      await expect(
        payload.update({
          collection: 'admins',
          id: admin.id,
          data: { email: 'unauthorized@example.com' },
          user: identity,
          overrideAccess: false,
        }),
      ).rejects.toBeInstanceOf(Forbidden)
      await expect(
        payload.delete({
          collection: 'admins',
          id: admin.id,
          user: identity,
          overrideAccess: false,
        }),
      ).rejects.toBeInstanceOf(Forbidden)
    }

    expect(userAccess.collections?.admins?.unlock).toBeFalsy()
    expect(anonymousAccess.collections?.admins?.unlock).toBeFalsy()
  })

  it('allows admins to manage admin accounts with only email and password', async () => {
    const created = await payload.create({
      collection: 'admins',
      data: { email: 'second-admin@example.com', password: 'test-password' },
      user: admin,
      overrideAccess: false,
    })
    const readable = await payload.findByID({
      collection: 'admins',
      id: created.id,
      user: admin,
      overrideAccess: false,
    })
    expect(readable.email).toBe('second-admin@example.com')

    const updated = await payload.update({
      collection: 'admins',
      id: created.id,
      data: { email: 'updated-admin@example.com' },
      user: admin,
      overrideAccess: false,
    })
    expect(updated.email).toBe('updated-admin@example.com')

    await payload.delete({
      collection: 'admins',
      id: created.id,
      user: admin,
      overrideAccess: false,
    })

    const remaining = await payload.count({
      collection: 'admins',
      where: { id: { equals: created.id } },
    })
    expect(remaining.totalDocs).toBe(0)
  })

  it('rejects first-admin registration once an admin already exists', async () => {
    await expect(
      registerFirstUserOperation({
        collection: payload.collections.admins,
        data: { email: 'unauthorized@example.com', password: 'test-password' },
        req: await createLocalReq({}, payload),
      }),
    ).rejects.toBeInstanceOf(Forbidden)
  })

  it('allows multiple inactive shows and one active show', async () => {
    const inactive = await createShow()
    await createShow()
    const active = await createShow({ is_active: true })

    expect(inactive.is_active).toBe(false)
    expect(active.is_active).toBe(true)

    // Saving the active show again must exclude itself from the uniqueness check.
    const updated = await payload.update({
      collection: 'shows',
      id: active.id,
      data: { show_name: 'Updated active show', is_active: true },
    })
    expect(updated.is_active).toBe(true)
  })

  it('rejects a second active show on both create and update', async () => {
    await createShow({ is_active: true })
    const inactive = await createShow()

    const activeStatusError = {
      data: {
        errors: expect.arrayContaining([expect.objectContaining({ path: 'is_active' })]),
      },
    }
    await expect(createShow({ is_active: true })).rejects.toMatchObject(activeStatusError)
    await expect(
      payload.update({ collection: 'shows', id: inactive.id, data: { is_active: true } }),
    ).rejects.toMatchObject(activeStatusError)

    const { totalDocs } = await payload.count({
      collection: 'shows',
      where: { is_active: { equals: true } },
    })
    expect(totalDocs).toBe(1)
  })

  it('allows switching the active show after deactivation', async () => {
    const active = await createShow({ is_active: true })
    const next = await createShow()

    await payload.update({ collection: 'shows', id: active.id, data: { is_active: false } })
    await payload.update({ collection: 'shows', id: next.id, data: { is_active: true } })

    const result = await payload.find({
      collection: 'shows',
      where: { is_active: { equals: true } },
    })
    expect(result.docs.map(({ id }) => id)).toEqual([next.id])
  })
})
