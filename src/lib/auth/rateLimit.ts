import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import type { Payload } from 'payload'
import type { AuthRateLimit } from '@/payload-types'

type Limit = { key: string; maximum: number; windowMS: number }

const digest = (value: string) => createHash('sha256').update(value).digest('hex')

/** Reserve a slot with a conditional database write, including on concurrent first requests. */
export async function reserveRateLimit(payload: Payload, limit: Limit): Promise<string | null> {
  for (let attempt = 0; attempt < 32; attempt++) {
    const now = Date.now()
    const record = (await payload.db.findOne({
      collection: 'auth-rate-limits',
      where: { key: { equals: limit.key } },
    })) as AuthRateLimit | null

    if (!record) {
      try {
        await payload.db.create({
          collection: 'auth-rate-limits',
          data: {
            key: limit.key,
            count: 1,
            resetAt: new Date(now + limit.windowMS).toISOString(),
          },
        })
        return null
      } catch (error) {
        // Another process may have inserted the unique key. Do not swallow database failures.
        const winner = await payload.db.findOne({
          collection: 'auth-rate-limits',
          where: { key: { equals: limit.key } },
        })
        if (!winner) throw error
        continue
      }
    }

    const expired = Date.parse(record.resetAt) <= now
    if (!expired && record.count >= limit.maximum) return record.resetAt

    const updated = await payload.db.updateOne({
      collection: 'auth-rate-limits',
      options: { atomic: true },
      where: {
        and: [
          { key: { equals: limit.key } },
          { count: { equals: record.count } },
          { resetAt: { equals: record.resetAt } },
        ],
      },
      data: {
        count: expired ? 1 : record.count + 1,
        resetAt: expired ? new Date(now + limit.windowMS).toISOString() : record.resetAt,
      },
    })
    if (updated) return null
  }

  // Fail closed under excessive contention.
  return new Date(Date.now() + 60_000).toISOString()
}

export async function reserveActivationEmail(
  payload: Payload,
  email: string,
  requestHeaders: Headers,
): Promise<string | null> {
  const limits: Limit[] = [
    { key: `otp:account:${digest(email)}`, maximum: 5, windowMS: 15 * 60_000 },
    { key: 'otp:global', maximum: 60, windowMS: 60_000 },
  ]

  // Server Actions do not expose the socket IP. Forwarded headers are only trustworthy
  // behind a proxy that overwrites client-supplied values; never trust them by default.
  if (process.env.AUTH_TRUST_PROXY_IP === 'true') {
    const ip = (
      requestHeaders.get('x-forwarded-for')?.split(',')[0] ||
      requestHeaders.get('x-real-ip') ||
      ''
    ).trim()
    if (isIP(ip)) {
      limits.unshift({ key: `otp:ip:${digest(ip)}`, maximum: 10, windowMS: 15 * 60_000 })
    }
  }

  for (const limit of limits) {
    const blockedUntil = await reserveRateLimit(payload, limit)
    if (blockedUntil) return blockedUntil
  }
  return null
}
