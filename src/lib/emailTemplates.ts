export interface EmailTemplate {
  subject: string
  body: string
}

export const emailTemplates = {
  otp: {
    subject: 'Your verification code: {{code}}',
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px; text-align:center;">
              <h1 style="margin:0 0 8px; font-size:22px; color:#18181b;">Your verification code</h1>
              <p style="margin:0; font-size:14px; color:#71717a;">
                Hello{{userName}}, here is your one-time passcode:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px; text-align:center;">
              <div style="display:inline-block; background-color:#f4f4f5; border-radius:8px; padding:16px 32px; letter-spacing:8px; font-size:32px; font-weight:bold; color:#18181b;">
                {{code}}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px; text-align:center;">
              <p style="margin:0 0 4px; font-size:13px; color:#a1a1aa;">
                This code is valid for {{expiry}} minutes.
              </p>
              <p style="margin:0; font-size:13px; color:#a1a1aa;">
                If you did not request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
} satisfies Record<string, EmailTemplate>


export type EmailTemplateSlug = keyof typeof emailTemplates
