'use server'

import config from '@payload-config'
import { login, logout } from '@payloadcms/next/auth'
import { cookies, headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { generatePayloadCookie, getPayload, ValidationError } from 'payload'

import { getShowLandingPath } from '@/lib/shows'
import type { User } from '@/payload-types'

export type AuthState = { error?: string; success?: boolean }

const getString = (data: FormData, name: string) => {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

export async function loginAction(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = getString(data, 'email').trim()
  const password = getString(data, 'password')

  if (!email || !password) return { error: 'Enter your email and password.' }

  let user: User
  try {
    const result = await login({ collection: 'users', config, email, password })
    if (!result.user) throw new Error('Payload did not return a signed-in user.')
    user = result.user
  } catch {
    return { error: 'Unable to log in. Check your email and password and try again.' }
  }

  redirect(await getShowLandingPath(await getPayload({ config }), user))
}

export async function forgotPasswordAction(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = getString(data, 'email').trim()
  if (!email) return { error: 'Enter your email.' }

  const payload = await getPayload({ config })
  try {
    await payload.forgotPassword({
      collection: 'users',
      data: { email },
      overrideAccess: false,
    })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Unable to send a user password reset email.' })
    return { error: 'Unable to send a reset email. Please try again.' }
  }

  // Payload deliberately returns the same result for unknown and throttled emails.
  return { success: true }
}

export async function resetPasswordAction(_state: AuthState, data: FormData): Promise<AuthState> {
  const token = getString(data, 'token')
  const password = getString(data, 'password')
  if (!token) return { error: 'This reset link is invalid. Request a new one.' }
  if (!password) return { error: 'Enter a new password.' }
  if (password !== getString(data, 'confirm-password')) {
    return { error: 'Passwords do not match.' }
  }

  const payload = await getPayload({ config })
  try {
    const result = await payload.resetPassword({
      collection: 'users',
      data: { token, password },
      overrideAccess: false,
    })

    if (!result.token) return { error: 'Password updated. Please log in with your new password.' }

    const cookie = generatePayloadCookie({
      collectionAuthConfig: payload.collections.users.config.auth,
      cookiePrefix: payload.config.cookiePrefix,
      returnCookieAsObject: true,
      token: result.token,
    })
    const cookieStore = await cookies()
    cookieStore.set({
      ...cookie,
      value: cookie.value || '',
      expires: cookie.expires ? new Date(cookie.expires) : undefined,
      sameSite: cookie.sameSite?.toLowerCase() as 'lax' | 'none' | 'strict' | undefined,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.data.errors[0]?.message || 'Enter a valid password.' }
    }
    return { error: 'Unable to reset your password. This link may be invalid or expired.' }
  }

  redirect('/login')
}

export async function logoutAction(_state: AuthState, _data: FormData): Promise<AuthState> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (user?.collection === 'users') {
    try {
      const result = await logout({ config })
      if (!result.success) return { error: 'Unable to log out. Please try again.' }
    } catch {
      return { error: 'Unable to log out. Please try again.' }
    }
  }

  redirect('/login')
}
