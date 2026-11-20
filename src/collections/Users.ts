import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    forgotPassword: {
      generateEmailHTML: ({ req, token } = {}) => {
        if (!req) throw new Error('A Payload request is required to generate a reset email.')

        const url = new URL(
          '/reset-password',
          req.payload.config.serverURL || process.env.SERVER_URL || 'http://localhost:3000',
        )
        url.searchParams.set('token', token || '')

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f5f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; padding: 40px 36px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 500; color: #111827; letter-spacing: -0.01em;">
                Password Reset
              </h1>
            </td>
          </tr>
          <tr>
            <td style="font-size: 15px; line-height: 1.65; color: #374151;">
              <p style="margin: 0 0 16px;">
                We received a request to reset the password for your account. If you did not make this request, you can safely ignore this email and your password will remain unchanged.
              </p>
              <p style="margin: 0 0 28px;">
                Otherwise, click the button below to choose a new password:
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${url}" target="_blank" style="display: inline-block; background-color: #1668e3; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 28px; border-radius: 6px;">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 13px; line-height: 1.6; color: #6b7280;">
              <p style="margin: 0 0 8px;">
                Or copy and paste the following link into your browser:
              </p>
              <p style="margin: 0;">
                <a href="${url}" target="_blank" style="color: #1668e3; text-decoration: underline; word-break: break-all;">
                  ${url}
                </a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px;">
          <tr>
            <td align="center" style="padding: 20px 16px 0; font-size: 12px; line-height: 1.5; color: #9ca3af;">
              BESTCAT
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      },
    },
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create' && req.user) {
          await req.payload.forgotPassword({
            collection: 'users',
            data: {
              email: doc.email,
            },
            req,
          })
        }

        return doc
      },
    ],
  },
  access: {
    admin: () => false,
  },
  fields: [
    // Email and password are provided by Payload authentication.
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'phone_number',
      type: 'text',
    },
  ],
}
