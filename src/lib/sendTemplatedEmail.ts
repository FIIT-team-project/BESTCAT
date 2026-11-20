import type { Payload } from 'payload'
import { emailTemplates, type EmailTemplateSlug } from './emailTemplates'

interface SendTemplatedEmailOptions {
  payload: Payload
  templateSlug: EmailTemplateSlug
  to: string
  variables?: Record<string, string>
  from?: string
}

/**
 * Načíta emailovú šablónu podľa slugu, dosadí premenné a odošle email.
 *
 * Premenné v šablóne (subject aj body) sa píšu v tvare {{premenna}}.
 *
 * Príklad:
 * ```ts
 * await sendTemplatedEmail({
 *   payload,
 *   templateSlug: 'otp',
 *   to: 'user@example.com',
 *   variables: { code: '482913', userName: ', Marek' },
 * })
 * ```
 */
export async function sendTemplatedEmail({
  payload,
  templateSlug,
  to,
  variables = {},
  from,
}: SendTemplatedEmailOptions): Promise<void> {
  const template = emailTemplates[templateSlug]

  const subject = replaceVariables(template.subject, variables)
  const html = replaceVariables(template.body, variables, true)

  await payload.sendEmail({
    to,
    subject,
    html,
    ...(from ? { from } : {}),
  })
}

function replaceVariables(
  text: string,
  variables: Record<string, string>,
  escapeHTML = false,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key]
    if (value === undefined) return match
    return escapeHTML
      ? value.replace(/[&<>"']/g, (character) => {
          const entities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          }
          return entities[character]
        })
      : value
  })
}
