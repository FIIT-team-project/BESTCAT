import { beforeEach, describe, expect, it, vi } from 'vitest'

const { login, logout, redirect, config } = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  redirect: vi.fn(),
  config: {},
}))

vi.mock('@payloadcms/next/auth', () => ({ login, logout }))
vi.mock('@payload-config', () => ({ default: config }))
vi.mock('next/navigation', () => ({ redirect }))

import { loginAction, logoutAction } from '@/app/(frontend)/auth/actions'

describe('loginAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects missing or non-text credentials before calling Payload', async () => {
    const formData = new FormData()

    expect(await loginAction({ error: null }, formData)).toEqual({
      error: 'Enter your email and password.',
    })

    formData.set('email', new File(['email'], 'email.txt'))
    formData.set('password', 'password')

    expect(await loginAction({ error: null }, formData)).toEqual({
      error: 'Enter your email and password.',
    })
    expect(login).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('returns a safe error without redirecting when login fails', async () => {
    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'wrong-password')
    login.mockRejectedValue(new Error('Private authentication details'))

    expect(await loginAction({ error: null }, formData)).toEqual({
      error: 'Unable to log in. Check your email and password and try again.',
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('uses the cookie-setting helper and lets the success redirect propagate', async () => {
    const formData = new FormData()
    formData.set('email', ' user@example.com ')
    formData.set('password', ' password with spaces ')
    login.mockResolvedValue({ token: 'private-token' })
    const redirectSignal = new Error('NEXT_REDIRECT')
    redirect.mockImplementation(() => {
      throw redirectSignal
    })

    await expect(loginAction({ error: null }, formData)).rejects.toBe(redirectSignal)
    expect(login).toHaveBeenCalledWith({
      collection: 'users',
      config,
      email: 'user@example.com',
      password: ' password with spaces ',
    })
    expect(redirect).toHaveBeenCalledWith('/')
  })
})

describe('logoutAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it.each(['User logged out successfully', 'User already logged out'])(
    'redirects to login after Payload reports: %s',
    async (message) => {
      logout.mockResolvedValue({ success: true, message })
      const redirectSignal = new Error('NEXT_REDIRECT')
      redirect.mockImplementation(() => {
        throw redirectSignal
      })

      await expect(logoutAction()).rejects.toBe(redirectSignal)
      expect(logout).toHaveBeenCalledWith({ config })
      expect(redirect).toHaveBeenCalledWith('/auth/login')
    },
  )

  it('keeps the user on the page when Payload cannot end the session', async () => {
    logout.mockResolvedValue({ success: false, message: 'Logout failed' })

    expect(await logoutAction()).toEqual({ error: 'Unable to log out. Please try again.' })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('returns a safe retry message when logout throws', async () => {
    logout.mockRejectedValue(new Error('Private authentication details'))

    expect(await logoutAction()).toEqual({ error: 'Unable to log out. Please try again.' })
    expect(redirect).not.toHaveBeenCalled()
  })
})
