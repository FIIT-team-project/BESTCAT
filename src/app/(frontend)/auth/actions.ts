'use server'

import { login, logout } from '@payloadcms/next/auth'
import config from '@payload-config'
import { redirect } from 'next/navigation'

export type LoginState = {
  error: string | null
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return { error: 'Enter your email and password.' }
  }

  try {
    await login({
      collection: 'users',
      config,
      email: email.trim(),
      password,
    })
  } catch {
    return { error: 'Unable to log in. Check your email and password and try again.' }
  }

  redirect('/')
}

export async function logoutAction(): Promise<{ error: string | null }> {
  try {
    const result = await logout({ config })

    if (!result.success) {
      return { error: 'Unable to log out. Please try again.' }
    }
  } catch {
    return { error: 'Unable to log out. Please try again.' }
  }

  redirect('/auth/login')
}
