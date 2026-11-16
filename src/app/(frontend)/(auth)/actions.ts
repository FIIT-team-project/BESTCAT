'use server'

import crypto from 'crypto'
import config from '@payload-config'
import { login, logout } from '@payloadcms/next/auth'
import { cookies, headers } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { generatePayloadCookie, getPayload, ValidationError } from 'payload'
import { sendTemplatedEmail } from '@/lib/sendTemplatedEmail'

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

  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })

  if (docs.length === 0) {
    return { step: 'email', error: 'Account not found. Contact administrator.' }
  }

  const user = docs[0]

  if (user.isActivated) {
    return { step: 'password', email }
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex')
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const cooldownUntil = new Date(Date.now() + 60_000).toISOString() // 10 minutes for OTP

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      otpCode: hashedCode,
      otpExpiresAt,
      otpAttempts: 0,
      otpCooldownUntil: cooldownUntil,
    },
  })

  await sendTemplatedEmail({
    payload,
    templateSlug: 'otp',
    to: email,
    variables: {
      code,
      userName: user.name ? `, ${user.name}` : '',
      expiry: '10',
    },
  })

  return { step: 'otp', email, cooldownUntil }
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
  if (!email) return { step: 'email', error: 'Email is required.' }

  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })

  if (docs.length === 0) {
    return { step: 'email', error: 'Account not found. Contact administrator.' }
  }

  const user = docs[0]

  // Check cooldown
  if (user.otpCooldownUntil && new Date(user.otpCooldownUntil) > new Date()) {
    return {
      step: 'otp',
      email,
      cooldownUntil: user.otpCooldownUntil,
      error: 'Please wait before requesting a new code.',
    }
  }

  // Generate new OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex')
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const cooldownUntil = new Date(Date.now() + 60_000).toISOString()

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      otpCode: hashedCode,
      otpExpiresAt,
      otpAttempts: 0,
      otpCooldownUntil: cooldownUntil,
    },
  })

  await sendTemplatedEmail({
    payload,
    templateSlug: 'otp',
    to: email,
    variables: {
      code,
      userName: user.name ? `, ${user.name}` : '',
      expiry: '10',
    },
  })

  return { step: 'otp', email, cooldownUntil }
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

  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })

  if (docs.length === 0) {
    return { step: 'email', error: 'Account not found. Contact administrator.' }
  }

  const user = docs[0]

  // Check expiry
  if (!user.otpCode || !user.otpExpiresAt || new Date(user.otpExpiresAt) < new Date()) {
    return { step: 'otp', email, error: 'Invalid or expired code.' }
  }

  const currentAttempts = (user.otpAttempts as number) || 0

  // Hash provided code and compare
  const hashedInput = crypto.createHash('sha256').update(code).digest('hex')

  if (hashedInput !== user.otpCode) {
    if (currentAttempts >= 4) {
      // This will be the 5th failed attempt → lock out
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { otpCode: '', otpExpiresAt: '', otpAttempts: currentAttempts + 1 },
      })
      return { step: 'otp', email, error: 'Too many failed attempts. Request a new code.' }
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { otpAttempts: currentAttempts + 1 },
    })
    return { step: 'otp', email, error: 'Invalid or expired code.' }
  }

  // OTP correct — generate onboarding token
  const onboardingToken = crypto.randomBytes(32).toString('hex')

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      onboardingToken,
      otpCode: '',
      otpExpiresAt: '',
      otpAttempts: 0,
    },
  })

  return { step: 'set-password', email, onboardingToken }
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
      onboardingToken,
      error: 'Password must be at least 8 characters.',
    }
  }

  if (password !== confirmPassword) {
    return { step: 'set-password', email, onboardingToken, error: 'Passwords do not match.' }
  }

  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })

  if (docs.length === 0) {
    return { step: 'email', error: 'Account not found. Contact administrator.' }
  }

  const user = docs[0]

  if (user.onboardingToken !== onboardingToken) {
    return {
      step: 'set-password',
      email,
      onboardingToken,
      error: 'Invalid token. Try the process again.',
    }
  }

  try {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        password,
        isActivated: true,
        onboardingToken: '',
        otpCode: '',
        otpExpiresAt: '',
        otpAttempts: 0,
      },
    })

    await login({ collection: 'users', config, email, password })
  } catch {
    return {
      step: 'set-password',
      email,
      onboardingToken,
      error: 'Failed to set password. Please try again.',
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

    if (!result.token) return { error: 'Password has been updated. Please log in with your new password.' }

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
