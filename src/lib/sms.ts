import type { Payload } from 'payload'

export type SmsMessage = { to: string; text: string }

const BREVO_SMS_URL = 'https://api.brevo.com/v3/transactionalSMS/send'

/** Brevo expects the number with the country code and digits only, e.g. 421900123456. */
export const normalizePhoneNumber = (value: string) => {
  const digits = value.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits.slice(1)
  if (digits.startsWith('00')) return digits.slice(2)
  // Slovak numbers written as 0900 123 456.
  if (digits.startsWith('0')) return `421${digits.slice(1)}`
  return digits
}

/**
 * Sends an SMS through Brevo. Without BREVO_API_KEY the message is only written to the log,
 * the same way emails are logged when SMTP_HOST is not set.
 */
export async function sendSms(payload: Payload, { to, text }: SmsMessage): Promise<void> {
  const recipient = normalizePhoneNumber(to)
  const apiKey = process.env.BREVO_API_KEY

  if (!apiKey) {
    payload.logger.info({ msg: 'SMS (not sent, BREVO_API_KEY is not set)', to: recipient, text })
    return
  }

  const response = await fetch(BREVO_SMS_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: process.env.SMS_SENDER || 'BESTCAT',
      recipient,
      content: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Brevo SMS failed with ${response.status}: ${await response.text()}`)
  }
}
