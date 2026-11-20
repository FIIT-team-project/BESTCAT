'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

import { forgotPasswordAction, loginAction, logoutAction, resetPasswordAction } from './actions'

const modes = {
  login: {
    title: 'Log in',
    description: 'Enter your email and password to log in to your account.',
    submit: 'Log in',
    action: loginAction,
  },
  'forgot-password': {
    title: 'Forgot password',
    description: 'In case you need to reset your password.',
    submit: 'Send reset email',
    action: forgotPasswordAction,
  },
  'reset-password': {
    title: 'Reset password',
    description: 'Enter and confirm your new password.',
    submit: 'Reset password',
    action: resetPasswordAction,
  },
  logout: {
    title: 'Log out',
    description: 'Logging you out…',
    submit: 'Log out',
    action: logoutAction,
  },
}

export function AuthForm({ mode, token }: { mode: keyof typeof modes; token?: string }) {
  const { title, description, submit, action } = modes[mode]
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const logoutStarted = useRef(false)
  const hasEmail = mode === 'login' || mode === 'forgot-password'
  const hasPassword = mode === 'login' || mode === 'reset-password'

  useEffect(() => {
    if (mode === 'logout' && !logoutStarted.current) {
      logoutStarted.current = true
      formRef.current?.requestSubmit()
    }
  }, [mode])

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{title}</h1>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <FieldDescription role="status">
            A password reset link has been sent to your email.
          </FieldDescription>
        ) : (
          <form action={formAction} ref={formRef}>
            <FieldGroup>
              {hasEmail && (
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </Field>
              )}
              {hasPassword && (
                <Field>
                  <FieldLabel htmlFor="password">
                    {mode === 'reset-password' ? 'New password' : 'Password'}
                  </FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                </Field>
              )}
              {mode === 'reset-password' && (
                <Field>
                  <input type="hidden" name="token" value={token} />
                  <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </Field>
              )}
              <FieldError>{state.error}</FieldError>
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Please wait…' : submit}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href={mode === 'login' ? '/forgot-password' : '/login'}
          className="text-sm underline-offset-4 hover:underline"
        >
          {mode === 'login' ? 'Forgot your password?' : 'Back to login'}
        </Link>
      </CardFooter>
    </Card>
  )
}
