import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config'
import type { User } from '../../src/payload-types'
import { login } from '../helpers/login'
import { seedTestAdmin, cleanupTestAdmin, testAdmin } from '../helpers/seedAdmin'

const serverURL = 'http://localhost:3000'
const sameOrigin = { headers: { Origin: serverURL } }

test.describe('Admin access', () => {
  let payload: Payload
  let user: User
  let userToken: string
  let adminToken: string

  test.beforeAll(async () => {
    payload = await getPayload({ config })
    await seedTestAdmin()

    const password = 'test-password'
    user = await payload.create({
      collection: 'users',
      data: {
        email: `e2e-user-${randomUUID()}@example.com`,
        password,
        name: 'Test API user',
      },
    })

    const userLogin = await payload.login({
      collection: 'users',
      data: { email: user.email, password },
    })
    const adminLogin = await payload.login({ collection: 'admins', data: testAdmin })
    if (!userLogin.token || !adminLogin.token) {
      throw new Error('Test accounts must have valid authentication tokens.')
    }
    userToken = userLogin.token
    adminToken = adminLogin.token
  })

  test.afterAll(async () => {
    try {
      if (user) await payload.delete({ collection: 'users', id: user.id })
      await cleanupTestAdmin()
    } finally {
      await payload?.destroy()
    }
  })

  test('signs in through the dashboard and loads protected user data', async ({ page }) => {
    // The dev server compiles and hydrates Payload's admin UI on the first visit.
    test.slow()
    await login({ page, user: testAdmin })

    await page.goto(`${serverURL}/admin/collections/users`)
    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: user.email, exact: true })).toBeVisible()
  })

  test('returns a regular user home from the admin access-denied screen', async ({ page, context }) => {
    test.slow()
    const session = await payload.login({
      collection: 'users',
      data: { email: user.email, password: 'test-password' },
    })
    await context.addCookies([
      {
        name: `${payload.config.cookiePrefix}-token`,
        value: session.token!,
        url: serverURL,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])

    await page.goto(`${serverURL}/admin`)
    await expect(page.getByRole('heading', { name: /Unauthorized/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Log out', exact: true })).toHaveCount(0)
    await page.getByRole('link', { name: 'Go back', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/show-home`)
    await expect(page.getByRole('heading', { name: 'Current show', exact: true })).toBeVisible()

    const auth = await payload.auth({
      headers: new Headers({ Authorization: `JWT ${session.token}` }),
    })
    expect(auth.user?.id).toBe(user.id)
  })

  test('logs out of the dashboard only after confirmation', async ({ page, context }) => {
    test.slow()
    await login({ page, user: testAdmin })
    const tokenCookie = `${payload.config.cookiePrefix}-token`
    const sessionToken = (await context.cookies()).find(({ name }) => name === tokenCookie)?.value
    expect(sessionToken).toBeTruthy()

    await page.goto(`${serverURL}/admin/logout`)
    await expect(page.getByRole('heading', { name: 'Log out', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Cancel', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/admin`)

    await page.getByRole('button', { name: 'Open Menu', exact: true }).click()
    await page.getByRole('link', { name: 'Log out', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/admin/logout`)
    await page.getByRole('button', { name: 'Log out', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/admin/login`)

    const auth = await payload.auth({
      headers: new Headers({ Authorization: `JWT ${sessionToken}` }),
    })
    expect(auth.user).toBeNull()
    expect((await context.cookies()).find(({ name }) => name === tokenCookie)).toBeUndefined()
  })

  for (const identity of ['anonymous', 'application user'] as const) {
    test(`denies collection REST access to an ${identity}`, async ({ request }) => {
      const headers: Record<string, string> =
        identity === 'application user' ? { Authorization: `JWT ${userToken}` } : {}

      // Each method is exported separately by the REST route.
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
        const response = await request.fetch(`${serverURL}/api/users`, { method, headers })
        expect(response.status(), `${method} /api/users`).toBe(403)
      }

      for (const path of [
        '/admins',
        `/users/${user.id}`,
        '/cats',
        '/shows',
        '/events',
        '/media',
        '/media/file/test.png',
        '/access',
      ]) {
        const response = await request.get(`${serverURL}/api${path}`, { headers })
        expect(response.status(), `GET /api${path}`).toBe(403)
      }

      for (const path of ['/users/first-register']) {
        const response = await request.post(`${serverURL}/api${path}`, {
          headers,
          data: { email: user.email, password: 'test-password' },
        })
        expect(response.status(), `POST /api${path}`).toBe(403)
      }
    })
  }

  test('allows regular user authentication through REST without granting collection access', async ({
    request,
  }) => {
    const response = await request.post(`${serverURL}/api/users/login`, {
      data: { email: user.email, password: 'test-password' },
    })
    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({
      user: { id: user.id, collection: 'users' },
    })

    const session = await request.get(`${serverURL}/api/users/me`, sameOrigin)
    expect(session.status()).toBe(200)
    expect(await session.json()).toMatchObject({ user: { id: user.id, collection: 'users' } })
    expect((await request.get(`${serverURL}/api/admins/me`, sameOrigin)).status()).toBe(403)
    expect((await request.post(`${serverURL}/api/admins/logout`, sameOrigin)).status()).toBe(403)

    const refreshed = await request.post(`${serverURL}/api/users/refresh-token`, sameOrigin)
    expect(refreshed.status()).toBe(200)
    expect(await refreshed.json()).toMatchObject({ user: { id: user.id, collection: 'users' } })

    expect((await request.get(`${serverURL}/api/users`, sameOrigin)).status()).toBe(403)
    expect((await request.post(`${serverURL}/api/users/logout`, sameOrigin)).status()).toBe(200)

    const loggedOut = await request.get(`${serverURL}/api/users/me`, sameOrigin)
    expect(await loggedOut.json()).toMatchObject({ user: null })
  })

  test('keeps GraphQL and its playground disabled for every identity', async ({ request }) => {
    const identities: [string, Record<string, string>][] = [
      ['anonymous', {}],
      ['application user', { Authorization: `JWT ${userToken}` }],
      ['admin', { Authorization: `JWT ${adminToken}` }],
    ]

    for (const [identity, headers] of identities) {
      for (const path of ['/graphql', '/graphql-playground']) {
        for (const method of ['GET', 'POST']) {
          const response = await request.fetch(`${serverURL}/api${path}`, { method, headers })
          expect(response.status(), `${identity}: ${method} /api${path}`).toBe(404)
        }
      }
    }
  })

  test('preserves admin login and cookie-authenticated REST access', async ({ request }) => {
    const session = await request.get(`${serverURL}/api/admins/me`)
    expect(session.status()).toBe(200)
    expect(await session.json()).toMatchObject({ user: null })

    const response = await request.post(`${serverURL}/api/admins/login`, { data: testAdmin })
    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({
      user: { email: testAdmin.email, collection: 'admins' },
    })

    const users = await request.get(`${serverURL}/api/users`, sameOrigin)
    expect(users.status()).toBe(200)
    expect(await users.json()).toMatchObject({
      docs: expect.arrayContaining([expect.objectContaining({ id: user.id, email: user.email })]),
    })
  })
})
