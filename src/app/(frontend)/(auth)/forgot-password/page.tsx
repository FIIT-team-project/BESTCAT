import type { Metadata } from 'next'

import { AuthForm } from '../auth-form'

export const metadata: Metadata = { title: 'Forgot password' }

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot-password" />
}
