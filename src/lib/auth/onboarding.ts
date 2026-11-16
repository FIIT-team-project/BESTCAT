import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { Payload, Where } from 'payload'
import type { User } from '@/payload-types'
import { sendTemplatedEmail } from '@/lib/sendTemplatedEmail'
import { reserveActivationEmail } from './rateLimit'

export const OTP_LIFETIME_MS = 10 * 60_000
export const ONBOARDING_LIFETIME_MS = 10 * 60_000
export const OTP_COOLDOWN_MS = 60_000
export const MAX_OTP_ATTEMPTS = 5

export const hashAuthToken = (value: string) => createHash('sha256').update(value).digest('hex')

export async function findAuthUser(payload: Payload, email: string): Promise<User | null> {
  // Deliberate privileged lookup: these fields are never readable through the public API.
  return (await payload.db.findOne({
    collection: 'users',
    where: { email: { equals: email } },
  })) as User | null
}

type CodeResult = { cooldownUntil?: string; error?: string }

export async function sendActivationCode(
  payload: Payload,
  user: User,
  requestHeaders: Headers,
): Promise<CodeResult> {
  const now = Date.now()
  if (user.otpCooldownUntil && Date.parse(user.otpCooldownUntil) > now) {
    return {
      cooldownUntil: user.otpCooldownUntil,
      error: 'Please wait before requesting a new code.',
    }
  }

  const blockedUntil = await reserveActivationEmail(payload, user.email, requestHeaders)
  if (blockedUntil) {
    return { cooldownUntil: blockedUntil, error: 'Too many requests. Please try again later.' }
  }

  const code = randomInt(100000, 1000000).toString()
  const cooldownUntil = new Date(now + OTP_COOLDOWN_MS).toISOString()
  const reserved = await payload.db.updateOne({
    collection: 'users',
    options: { atomic: true },
    where: {
      and: [
        { id: { equals: user.id } },
        { isActivated: { not_equals: true } },
        {
          or: [
            { otpCooldownUntil: { equals: null } },
            { otpCooldownUntil: { equals: '' } },
            { otpCooldownUntil: { less_than_equal: new Date(now).toISOString() } },
          ],
        },
      ],
    },
    data: {
      otpCode: hashAuthToken(code),
      otpExpiresAt: new Date(now + OTP_LIFETIME_MS).toISOString(),
      otpAttempts: 0,
      otpCooldownUntil: cooldownUntil,
      onboardingToken: null,
      onboardingTokenExpiresAt: null,
    },
  })

  if (!reserved) {
    const current = await findAuthUser(payload, user.email)
    return {
      cooldownUntil: current?.otpCooldownUntil || cooldownUntil,
      error: 'Please wait before requesting a new code.',
    }
  }

  try {
    await sendTemplatedEmail({
      payload,
      templateSlug: 'otp',
      to: user.email,
      variables: { code, userName: user.name ? `, ${user.name}` : '', expiry: '10' },
    })
    return { cooldownUntil }
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Unable to send an activation email.' })
    return {
      cooldownUntil,
      error: 'Failed to send the verification email. Please try again later.',
    }
  }
}

export async function verifyActivationCode(
  payload: Payload,
  email: string,
  code: string,
): Promise<{ onboardingToken?: string; error?: string }> {
  for (let retry = 0; retry < MAX_OTP_ATTEMPTS; retry++) {
    const user = await findAuthUser(payload, email)
    const now = new Date().toISOString()
    if (
      !user ||
      user.isActivated ||
      !user.otpCode ||
      !user.otpExpiresAt ||
      !Number.isFinite(Date.parse(user.otpExpiresAt)) ||
      user.otpExpiresAt <= now
    ) {
      return { error: 'Invalid or expired code.' }
    }

    const attempts = user.otpAttempts || 0
    if (attempts >= MAX_OTP_ATTEMPTS) {
      return { error: 'Too many failed attempts. Request a new code.' }
    }

    const valid =
      /^\d{6}$/.test(code) &&
      /^[a-f0-9]{64}$/.test(user.otpCode) &&
      timingSafeEqual(Buffer.from(hashAuthToken(code), 'hex'), Buffer.from(user.otpCode, 'hex'))
    const token = valid ? randomBytes(32).toString('hex') : undefined
    const exhausted = attempts + 1 >= MAX_OTP_ATTEMPTS
    const conditions: Where[] = [
      { id: { equals: user.id } },
      { isActivated: { not_equals: true } },
      { otpCode: { equals: user.otpCode } },
      { otpExpiresAt: { greater_than: now } },
      { otpAttempts: { equals: user.otpAttempts ?? null } },
    ]

    // Both a failed attempt and successful consumption compare the same challenge and
    // counter in the UPDATE itself. Only one concurrent request can claim each state.
    const updated = await payload.db.updateOne({
      collection: 'users',
      options: { atomic: true },
      where: { and: conditions },
      data: {
        otpAttempts: attempts + 1,
        ...(valid || exhausted ? { otpCode: null, otpExpiresAt: null } : {}),
        ...(token
          ? {
              onboardingToken: hashAuthToken(token),
              onboardingTokenExpiresAt: new Date(Date.now() + ONBOARDING_LIFETIME_MS).toISOString(),
            }
          : {}),
      },
    })

    if (!updated) continue
    if (token) return { onboardingToken: token }
    return {
      error: exhausted
        ? 'Too many failed attempts. Request a new code.'
        : 'Invalid or expired code.',
    }
  }
  return { error: 'Invalid or expired code.' }
}

export async function consumeOnboardingToken(
  payload: Payload,
  email: string,
  token: string,
): Promise<User | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null

  // Claim before changing the password. A database failure after this point fails closed:
  // a new activation code is required rather than allowing a token to be replayed.
  return (await payload.db.updateOne({
    collection: 'users',
    options: { atomic: true },
    where: {
      and: [
        { email: { equals: email } },
        { isActivated: { not_equals: true } },
        { onboardingToken: { equals: hashAuthToken(token) } },
        { onboardingTokenExpiresAt: { greater_than: new Date().toISOString() } },
      ],
    },
    data: { onboardingToken: null, onboardingTokenExpiresAt: null },
  })) as User | null
}
