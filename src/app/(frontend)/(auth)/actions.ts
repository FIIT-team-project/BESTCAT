'use server'

import config from '@payload-config'
import { login, logout } from '@payloadcms/next/auth'
import { cookies, headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { generatePayloadCookie, getPayload, ValidationError } from 'payload'
import {
  consumeOnboardingToken,
  findAuthUser,
  sendActivationCode,
  verifyActivationCode,
} from '@/lib/auth/onboarding'

export type AuthActionState = {
  step?: 'email' | 'password' | 'otp' | 'set-password'
  email?: string
  onboardingToken?: string
  cooldownUntil?: string
  error?: string
  success?: boolean
}

const getString = (data: FormData, name: string) => {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---------------------------------------------------------------------------
// checkEmailAction
// ---------------------------------------------------------------------------
export async function checkEmailAction(
  _state: AuthActionState,
  data: FormData,
): Promise<AuthActionState> {
  const email = getString(data, 'email').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return { step: 'email', error: 'Insert a valid email address.' }
  }

  const payload = await getPayload({ config })

  const user = await findAuthUser(payload, email)
  if (!user) {
    return { step: 'email', error: 'Account not found. Contact administrator.' }
  }

  if (user.isActivated) {
    return { step: 'password', email }
  }

  const result = await sendActivationCode(payload, user, new Headers(await headers()))
  return { step: 'otp', email, ...result }
}

// ---------------------------------------------------------------------------
// loginAction
// ---------------------------------------------------------------------------
export async function loginAction(
  _state: AuthActionState,
  data: FormData,
): Promise<AuthActionState> {
  const email = getString(data, 'email').trim().toLowerCase()
  const password = getString(data, 'password')

  if (!email || !password) {
    return { step: 'password', email, error: 'Insert email and password.' }
  }

  try {
    await login({ collection: 'users', config, email, password })
  } catch {
    return { step: 'password', email, error: 'Invalid email or password.' }
  }

  redirect('/')
}

// ---------------------------------------------------------------------------
// resendOtpAction
// ---------------------------------------------------------------------------
export async function resendOtpAction(
  _state: AuthActionState,
  data: FormData,
): Promise<AuthActionState> {
  const email = getString(data, 'email').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return { step: 'email', error: 'Insert a valid email address.' }
  }

  const payload = await getPayload({ config })

  const user = await findAuthUser(payload, email)
  if (!user) {
    return { step: 'email', error: 'Account not found. Contact administrator.' }
  }

  if (user.isActivated) return { step: 'password', email }

  const result = await sendActivationCode(payload, user, new Headers(await headers()))
  return { step: 'otp', email, ...result }
}

// ---------------------------------------------------------------------------
// verifyOtpAction
// ---------------------------------------------------------------------------
export async function verifyOtpAction(
  _state: AuthActionState,
  data: FormData,
): Promise<AuthActionState> {
  const email = getString(data, 'email').trim().toLowerCase()
  const code = getString(data, 'code').trim()

  if (!email || !code) {
    return { step: 'otp', email, error: 'Please enter a verification code from your email.' }
  }

  const payload = await getPayload({ config })

  const result = await verifyActivationCode(payload, email, code)
  return { step: result.onboardingToken ? 'set-password' : 'otp', email, ...result }
}

// ---------------------------------------------------------------------------
// setPasswordAction
// ---------------------------------------------------------------------------
export async function setPasswordAction(
  _state: AuthActionState,
  data: FormData,
): Promise<AuthActionState> {
  const email = getString(data, 'email').trim().toLowerCase()
  const onboardingToken = getString(data, 'onboardingToken')
  const password = getString(data, 'password')
  const confirmPassword = getString(data, 'confirm-password')

  if (!email || !onboardingToken) {
    return { step: 'email', error: 'Invalid session. Please try again.' }
  }

  if (!password || password.length < 8) {
    return {
      step: 'set-password',
      email,
      error: 'Password must be at least 8 characters.',
    }
  }

  if (password !== confirmPassword) {
    return { step: 'set-password', email, error: 'Passwords do not match.' }
  }

  const payload = await getPayload({ config })

  const user = await consumeOnboardingToken(payload, email, onboardingToken)
  if (!user) {
    return {
      step: 'set-password',
      email,
      error: 'Invalid or expired activation. Request a new code.',
    }
  }

  try {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        password,
        isActivated: true,
        onboardingToken: null,
        onboardingTokenExpiresAt: null,
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpCooldownUntil: null,
        sessions: [],
      },
    })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Unable to complete account activation.' })
    return {
      step: 'email',
      email,
      error: 'Failed to set password. Please request a new verification code.',
    }
  }

  try {
    await login({ collection: 'users', config, email, password })
  } catch {
    return {
      step: 'email',
      email,
      error: 'Account activated. Please log in with your new password.',
    }
  }

  redirect('/')
}

// ---------------------------------------------------------------------------
// forgotPasswordAction
// ---------------------------------------------------------------------------
export async function forgotPasswordAction(
  _state: AuthActionState,
  data: FormData,
): Promise<AuthActionState> {
  const email = getString(data, 'email').trim()
  if (!email) return { error: 'Please enter an email address.' }

  const payload = await getPayload({ config })
  try {
    await payload.forgotPassword({
      collection: 'users',
      data: { email },
      overrideAccess: false,
    })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Unable to send a user password reset email.' })
    return { error: 'Failed to send password reset email. Please try again.' }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// resetPasswordAction
// ---------------------------------------------------------------------------
export async function resetPasswordAction(
  _state: AuthActionState,
  data: FormData,
): Promise<AuthActionState> {
  const token = getString(data, 'token')
  const password = getString(data, 'password')
  if (!token) return { error: 'Invalid token. Please try again.' }
  if (!password) return { error: 'Please enter a new password.' }
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

    if (!result.token)
      return { error: 'Password has been updated. Please log in with your new password.' }

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
      return { error: error.data.errors[0]?.message || 'Please enter a valid password.' }
    }
    return { error: 'Failed to reset password. The link may be invalid or expired.' }
  }

  redirect('/')
}

// ---------------------------------------------------------------------------
// logoutAction
// ---------------------------------------------------------------------------
export async function logoutAction(
  _state: AuthActionState,
  _data: FormData,
): Promise<AuthActionState> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (user?.collection === 'users') {
    try {
      const result = await logout({ config })
      if (!result.success) return { error: 'Failed to log out. Please try again.' }
    } catch {
      return { error: 'Failed to log out. Please try again.' }
    }
  }

  redirect('/login')
}
