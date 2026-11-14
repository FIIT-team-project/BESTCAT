// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import config from '@/payload.config'
import {
  forgotPasswordAction,
  loginAction,
  logoutAction,
  resetPasswordAction,
} from '@/app/(frontend)/(auth)/actions'

const request = vi.hoisted(() => ({
  payload: null as Payload | null,
  cookies: new Map<string, { name: string; value: string; httpOnly?: boolean }>(),
}))

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: async () => {
      if (!request.payload) throw new Error('Test Payload instance is not initialized.')
      return request.payload
    },
  }
})

vi.mock('next/headers.js', () => ({
  cookies: async () => ({
    getAll: () => [...request.cookies.values()],
    set: (
      nameOrCookie: string | { name: string; value: string; httpOnly?: boolean },
      value?: string,
      options?: { httpOnly?: boolean },
    ) => {
      const cookie =
        typeof nameOrCookie === 'string'
          ? { name: nameOrCookie, value: value!, ...options }
          : nameOrCookie
      request.cookies.set(cookie.name, cookie)
    },
    delete: (name: string) => request.cookies.delete(name),
  }),
  headers: async () =>
    new Headers({
      'sec-fetch-site': 'same-origin',
      cookie: [...request.cookies.values()].map(({ name, value }) => `${name}=${value}`).join('; '),
    }),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`)
  },
}))

const form = (data: Record<string, string>) => {
  const result = new FormData()
  for (const [key, value] of Object.entries(data)) result.set(key, value)
  return result
}

describe('Regular user authentication', () => {
  let payload: Payload
  let databaseDir: string
  const email = 'shared@example.com'
  const userPassword = 'user-password'
  const adminPassword = 'admin-password'
  const cookie = () => request.cookies.get(`${payload.config.cookiePrefix}-token`)
  const authWithToken = (token: string) =>
    payload.auth({
      headers: new Headers({ Authorization: `JWT ${token}` }),
    })

  beforeAll(async () => {
    databaseDir = await mkdtemp(path.join(tmpdir(), 'bestcat-user-auth-'))
    const { getPayload } = await vi.importActual<typeof import('payload')>('payload')
    const payloadConfig = await config
    payload = await getPayload({
      key: databaseDir,
      config: {
        ...payloadConfig,
        secret: 'user-auth-test-secret',
        serverURL: 'https://bestcat.example',
        db: {
          ...payloadConfig.db,
          init: (args) => ({
            ...payloadConfig.db.init(args),
            clientConfig: { url: `file:${path.join(databaseDir, 'payload.db')}` },
          }),
        },
      },
    })
    request.payload = payload
    await payload.create({ collection: 'admins', data: { email, password: adminPassword } })
    await payload.create({
      collection: 'users',
      data: { email, password: userPassword, name: 'Test user' },
    })
  })

  beforeEach(() => {
    request.cookies.clear()
  })

  afterAll(async () => {
    request.payload = null
    await payload?.destroy()
    if (databaseDir) await rm(databaseDir, { recursive: true, force: true })
  })

  it('only logs in the users account when the same email exists in both collections', async () => {
    expect(await loginAction({}, form({ email, password: adminPassword }))).toHaveProperty('error')
    expect(cookie()).toBeUndefined()

    await expect(loginAction({}, form({ email, password: userPassword }))).rejects.toThrow(
      'redirect:/',
    )
    expect(cookie()?.httpOnly).toBe(true)
    const { user } = await authWithToken(cookie()!.value)
    expect(user).toMatchObject({ email, collection: 'users' })
  })

  it('revokes the user session on logout and leaves an admin session alone', async () => {
    await expect(loginAction({}, form({ email, password: userPassword }))).rejects.toThrow(
      'redirect:/',
    )
    const token = cookie()!.value
    await expect(logoutAction({}, form({}))).rejects.toThrow('redirect:/login')
    expect(cookie()).toBeUndefined()
    expect((await authWithToken(token)).user).toBeNull()

    const admin = await payload.login({
      collection: 'admins',
      data: { email, password: adminPassword },
    })
    request.cookies.set(`${payload.config.cookiePrefix}-token`, {
      name: `${payload.config.cookiePrefix}-token`,
      value: admin.token!,
    })
    await expect(logoutAction({}, form({}))).rejects.toThrow('redirect:/login')
    expect(cookie()?.value).toBe(admin.token)
    expect((await authWithToken(admin.token!)).user?.collection).toBe('admins')
  })

  it('uses the frontend reset email, retains throttling, and resets only the users password', async () => {
    const sendEmail = vi.spyOn(payload.email, 'sendEmail').mockResolvedValue(undefined)
    try {
      const state = await forgotPasswordAction({}, form({ email }))
      expect(state).toEqual({ success: true })
      const html = String(sendEmail.mock.calls[0][0].html)
      const link = new URL(html.match(/href="([^"]+)"/)![1])
      expect(link.origin).toBe('https://bestcat.example')
      expect(link.pathname).toBe('/reset-password')
      const token = link.searchParams.get('token')!
      expect(token).toBeTruthy()

      expect(await forgotPasswordAction({}, form({ email }))).toEqual(state)
      expect(await forgotPasswordAction({}, form({ email: 'unknown@example.com' }))).toEqual(state)
      expect(sendEmail).toHaveBeenCalledTimes(1)

      const newPassword = 'new-user-password'
      expect(
        await resetPasswordAction({}, form({ token, password: 'a', 'confirm-password': 'a' })),
      ).toEqual({ error: expect.stringContaining('3') })
      expect(
        await resetPasswordAction(
          {},
          form({ token, password: newPassword, 'confirm-password': 'mismatch' }),
        ),
      ).toEqual({ error: 'Passwords do not match.' })

      const oldSession = await payload.login({
        collection: 'users',
        data: { email, password: userPassword },
      })
      await expect(
        resetPasswordAction(
          {},
          form({ token, password: newPassword, 'confirm-password': newPassword }),
        ),
      ).rejects.toThrow('redirect:/')
      expect(cookie()?.httpOnly).toBe(true)
      expect((await authWithToken(cookie()!.value)).user).toMatchObject({
        collection: 'users',
        email,
      })
      expect((await authWithToken(oldSession.token!)).user).toBeNull()

      await expect(
        payload.login({ collection: 'users', data: { email, password: userPassword } }),
      ).rejects.toThrow()
      await expect(
        payload.login({ collection: 'users', data: { email, password: newPassword } }),
      ).resolves.toHaveProperty('token')
      await expect(
        payload.login({ collection: 'admins', data: { email, password: adminPassword } }),
      ).resolves.toHaveProperty('token')
      expect(
        await resetPasswordAction(
          {},
          form({ token, password: newPassword, 'confirm-password': newPassword }),
        ),
      ).toHaveProperty('error')
    } finally {
      sendEmail.mockRestore()
    }
  })

  it('rejects missing, invalid, and expired password reset tokens', async () => {
    const data = { password: 'another-password', 'confirm-password': 'another-password' }
    expect(await resetPasswordAction({}, form(data))).toHaveProperty('error')
    expect(await resetPasswordAction({}, form({ ...data, token: 'invalid' }))).toHaveProperty(
      'error',
    )

    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
      expiration: -1000,
    })
    expect(await resetPasswordAction({}, form({ ...data, token: token! }))).toHaveProperty('error')
    expect(cookie()).toBeUndefined()
  })
})
