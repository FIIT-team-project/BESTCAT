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
        return `${req.t('authentication:youAreReceivingResetPassword')}
    <a href="${url.toString()}">${url.toString()}</a>
    ${req.t('authentication:youDidNotRequestPassword')}`
      },
    },
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
    // OTP / onboarding tracking fields (hidden from admin UI)
    {
      name: 'isActivated',
      type: 'checkbox',
      defaultValue: false,
      admin: { hidden: false }, // Change later
    },
    {
      name: 'otpCode',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'otpExpiresAt',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'otpAttempts',
      type: 'number',
      defaultValue: 0,
      admin: { hidden: true },
    },
    {
      name: 'otpCooldownUntil',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'onboardingToken',
      type: 'text',
      admin: { hidden: true },
    },
  ],
}
