// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'
import { handleEndpoints, type Payload } from 'payload'
import config from '@/payload.config'
import type { User } from '@/payload-types'
import { withAdminREST } from '@/collections/access/withAdminREST'
import { findAuthUser, hashAuthToken } from '@/lib/auth/onboarding'
import { reserveActivationEmail, reserveRateLimit } from '@/lib/auth/rateLimit'
import { sendTemplatedEmail } from '@/lib/sendTemplatedEmail'
import {
  checkEmailAction,
  forgotPasswordAction,
  loginAction,
  logoutAction,
  resendOtpAction,
  resetPasswordAction,
  setPasswordAction,
  verifyOtpAction,
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
      data: { email, password: userPassword, name: 'Test user', isActivated: true },
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

  describe('Onboarding security', () => {
    let pending: User
    let sendEmail: MockInstance<Payload['sendEmail']>

    const stored = () => findAuthUser(payload, pending.email)
    const updateSecurity = (data: Record<string, unknown>) =>
      payload.db.updateOne({ collection: 'users', id: pending.id, data })
    const beginActivation = async () => {
      const state = await checkEmailAction({}, form({ email: pending.email }))
      expect(state.error).toBeUndefined()
      const code = String(sendEmail.mock.calls.at(-1)![0].subject).match(/\d{6}/)![0]
      return code
    }
    const activationToken = async () => {
      const code = await beginActivation()
      const result = await verifyOtpAction({}, form({ email: pending.email, code }))
      expect(result.step).toBe('set-password')
      return result.onboardingToken!
    }
    const rest = (action: string, method: string, body?: object, token?: string) => {
      const handler = withAdminREST((request) =>
        handleEndpoints({
          config: payload.config,
          payloadInstanceCacheKey: databaseDir,
          request,
        }),
      )
      return handler(
        new Request(`https://bestcat.example/api/users/${action}`, {
          method,
          headers: {
            host: 'bestcat.example',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `JWT ${token}` } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
        { params: Promise.resolve({ slug: ['users', action] }) },
      )
    }

    beforeEach(async () => {
      await payload.delete({ collection: 'auth-rate-limits', where: {} })
      pending = await payload.create({
        collection: 'users',
        data: {
          email: `pending-${randomUUID()}@example.com`,
          password: 'initial-password',
          name: 'Pending user',
        },
      })
      sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    it('shares an atomic cooldown between initial requests and resends without resetting attempts', async () => {
      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          (i % 2 ? checkEmailAction : resendOtpAction)({}, form({ email: pending.email })),
        ),
      )
      expect(sendEmail).toHaveBeenCalledTimes(1)
      const challenge = await stored()
      const actualCode = String(sendEmail.mock.calls[0][0].subject).match(/\d{6}/)![0]
      expect(challenge?.otpCode).toBe(hashAuthToken(actualCode))

      await verifyOtpAction({}, form({ email: pending.email, code: 'invalid' }))
      await checkEmailAction({}, form({ email: pending.email }))
      expect(sendEmail).toHaveBeenCalledTimes(1)
      expect((await stored())?.otpAttempts).toBe(1)
      expect((await stored())?.otpCode).toBe(challenge?.otpCode)
    })

    it('limits account email volume even when the cooldown has elapsed', async () => {
      for (let i = 0; i < 5; i++) {
        await updateSecurity({ otpCooldownUntil: new Date(Date.now() - 1000).toISOString() })
        await checkEmailAction({}, form({ email: pending.email }))
      }
      const challenge = await stored()
      await updateSecurity({ otpCooldownUntil: new Date(Date.now() - 1000).toISOString() })
      expect(await resendOtpAction({}, form({ email: pending.email }))).toHaveProperty('error')
      expect(sendEmail).toHaveBeenCalledTimes(5)
      expect((await stored())?.otpCode).toBe(challenge?.otpCode)
    })

    it('reserves rate-limit slots atomically and starts a fresh window after expiry', async () => {
      const limit = { key: 'test-concurrency', maximum: 3, windowMS: 60_000 }
      const results = await Promise.all(
        Array.from({ length: 20 }, () => reserveRateLimit(payload, limit)),
      )
      expect(results.filter((result) => result === null)).toHaveLength(3)
      await payload.db.updateOne({
        collection: 'auth-rate-limits',
        where: { key: { equals: limit.key } },
        data: { resetAt: new Date(Date.now() - 1000).toISOString() },
      })
      expect(await reserveRateLimit(payload, limit)).toBeNull()
    })

    it('limits trusted proxy IPs across accounts and ignores untrusted forwarded headers', async () => {
      const forwarded = new Headers({ 'x-forwarded-for': '198.51.100.42' })
      vi.stubEnv('AUTH_TRUST_PROXY_IP', 'true')
      for (let i = 0; i < 10; i++) {
        expect(
          await reserveActivationEmail(payload, `account-${i}@example.com`, forwarded),
        ).toBeNull()
      }
      expect(await reserveActivationEmail(payload, 'another@example.com', forwarded)).not.toBeNull()

      vi.stubEnv('AUTH_TRUST_PROXY_IP', 'false')
      expect(await reserveActivationEmail(payload, 'untrusted@example.com', forwarded)).toBeNull()
    })

    it('enforces the global mail quota across accounts', async () => {
      await payload.db.create({
        collection: 'auth-rate-limits',
        data: {
          key: 'otp:global',
          count: 60,
          resetAt: new Date(Date.now() + 60_000).toISOString(),
        },
      })
      expect(await checkEmailAction({}, form({ email: pending.email }))).toHaveProperty('error')
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('counts concurrent wrong codes without losing increments and locks after five attempts', async () => {
      const correct = await beginActivation()
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          verifyOtpAction({}, form({ email: pending.email, code: 'invalid' })),
        ),
      )
      expect(results.every((result) => Boolean(result.error))).toBe(true)
      const user = await stored()
      expect(user?.otpAttempts).toBe(5)
      expect(user?.otpCode).toBeNull()
      expect(
        await verifyOtpAction({}, form({ email: pending.email, code: correct })),
      ).toHaveProperty('error')
    })

    it('consumes a valid OTP once and stores only an expiring hash of the onboarding token', async () => {
      const code = await beginActivation()
      const results = await Promise.all(
        Array.from({ length: 10 }, () => verifyOtpAction({}, form({ email: pending.email, code }))),
      )
      const successful = results.filter((result) => Boolean(result.onboardingToken))
      expect(successful).toHaveLength(1)
      const token = successful[0].onboardingToken!
      const user = await stored()
      expect(user?.onboardingToken).toBe(hashAuthToken(token))
      expect(user?.onboardingToken).not.toBe(token)
      expect(Date.parse(user!.onboardingTokenExpiresAt!)).toBeGreaterThan(Date.now())
      expect(Date.parse(user!.onboardingTokenExpiresAt!)).toBeLessThanOrEqual(Date.now() + 600_000)
      expect(user?.otpCode).toBeNull()
    })

    it('rejects expired OTPs and expired, legacy plaintext, or cross-account onboarding tokens', async () => {
      const code = await beginActivation()
      await updateSecurity({ otpExpiresAt: new Date(Date.now() - 1000).toISOString() })
      expect(await verifyOtpAction({}, form({ email: pending.email, code }))).toHaveProperty(
        'error',
      )

      const token = 'a'.repeat(64)
      const originalHash = (await stored())?.hash
      const data = {
        email: pending.email,
        onboardingToken: token,
        password: 'updated-password',
        'confirm-password': 'updated-password',
      }
      await updateSecurity({
        onboardingToken: hashAuthToken(token),
        onboardingTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
      })
      expect(await setPasswordAction({}, form(data))).toHaveProperty('error')
      await updateSecurity({
        onboardingToken: token,
        onboardingTokenExpiresAt: new Date(Date.now() + 600_000).toISOString(),
      })
      expect(await setPasswordAction({}, form(data))).toHaveProperty('error')
      await updateSecurity({ onboardingToken: hashAuthToken(token) })
      expect(await setPasswordAction({}, form({ ...data, email }))).toHaveProperty('error')
      expect((await stored())?.hash).toBe(originalHash)
      expect((await stored())?.isActivated).toBe(false)
    })

    it('activates an account and sets its password only once under concurrent token reuse', async () => {
      const onboardingToken = await activationToken()
      const data = {
        email: pending.email,
        onboardingToken,
        password: 'activated-password',
        'confirm-password': 'activated-password',
      }
      const results = await Promise.allSettled([
        setPasswordAction({}, form(data)),
        setPasswordAction({}, form(data)),
      ])
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
      const redirect = results.find((result) => result.status === 'rejected')
      expect(redirect?.reason.message).toBe('redirect:/')
      const denied = results.find((result) => result.status === 'fulfilled')
      expect(denied?.value).toHaveProperty('error')
      const user = await stored()
      expect(user?.isActivated).toBe(true)
      expect(user?.onboardingToken).toBeNull()
      expect(user?.onboardingTokenExpiresAt).toBeNull()
      await expect(
        payload.login({
          collection: 'users',
          data: { email: pending.email, password: data.password },
        }),
      ).resolves.toHaveProperty('token')
      expect(await resendOtpAction({}, form({ email: pending.email }))).toEqual({
        step: 'password',
        email: pending.email,
      })
      expect(sendEmail).toHaveBeenCalledTimes(1)
    })

    it('rejects inactive accounts through Local API, Server Actions, and public REST login', async () => {
      const credentials = { email: pending.email, password: 'initial-password' }
      await expect(payload.login({ collection: 'users', data: credentials })).rejects.toThrow()
      expect(await loginAction({}, form(credentials))).toHaveProperty('error')
      expect(cookie()).toBeUndefined()
      expect((await rest('login', 'POST', credentials)).status).toBe(401)
    })

    it('keeps internal auth fields out of login, me, and refresh responses and denies client writes', async () => {
      await updateSecurity({
        isActivated: true,
        otpCode: hashAuthToken('123456'),
        onboardingToken: hashAuthToken('private-token'),
        onboardingTokenExpiresAt: new Date(Date.now() + 600_000).toISOString(),
      })
      const response = await rest('login', 'POST', {
        email: pending.email,
        password: 'initial-password',
      })
      expect(response.status).toBe(200)
      const session = await response.json()
      const me = await rest('me', 'GET', undefined, session.token)
      const refresh = await rest('refresh-token', 'POST', undefined, session.token)
      for (const user of [session.user, (await me.json()).user, (await refresh.json()).user]) {
        for (const field of [
          'otpCode',
          'otpExpiresAt',
          'otpAttempts',
          'otpCooldownUntil',
          'onboardingToken',
          'onboardingTokenExpiresAt',
        ]) {
          expect(user).not.toHaveProperty(field)
        }
      }
      await payload.update({
        collection: 'users',
        id: pending.id,
        user: session.user,
        overrideAccess: false,
        data: { isActivated: false, otpCode: 'injected', onboardingToken: 'injected' },
      })
      expect((await stored())?.isActivated).toBe(true)
      expect((await stored())?.otpCode).toBe(hashAuthToken('123456'))
      expect((await stored())?.onboardingToken).toBe(hashAuthToken('private-token'))
    })

    it('returns an actionable form error when SMTP fails and keeps the retry cooldown', async () => {
      sendEmail.mockRejectedValue(new Error('SMTP temporarily blocked'))
      const logger = vi.spyOn(payload.logger, 'error').mockImplementation(() => {})
      expect(await checkEmailAction({}, form({ email: pending.email }))).toMatchObject({
        step: 'otp',
        error: expect.stringContaining('Failed to send'),
      })
      await resendOtpAction({}, form({ email: pending.email }))
      expect(sendEmail).toHaveBeenCalledTimes(1)
      expect(logger).toHaveBeenCalledTimes(1)
    })

    it('escapes interpolated HTML without changing the email subject', async () => {
      await sendTemplatedEmail({
        payload,
        templateSlug: 'otp',
        to: pending.email,
        variables: {
          code: '123456',
          userName: ', A&B <a href="https://example.com">name</a>\'',
          expiry: '10',
        },
      })
      const message = sendEmail.mock.calls[0][0]
      expect(message.subject).toBe('Your verification code: 123456')
      expect(message.html).toContain(
        'A&amp;B &lt;a href=&quot;https://example.com&quot;&gt;name&lt;/a&gt;&#39;',
      )
      expect(message.html).not.toContain('<a href="https://example.com">')
    })
  })
})
