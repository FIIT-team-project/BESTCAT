'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
    description: 'Are you sure you want to log out?',
    submit: 'Log out',
    action: logoutAction,
  },
}

type AuthFormProps =
  | { mode: Exclude<keyof typeof modes, 'logout'>; token?: string }
  | {
      mode: 'logout'
      logoutDialog: {
        open: boolean
        onOpenChange: (open: boolean) => void
        finalFocus: React.RefObject<HTMLButtonElement | null>
      }
    }

export function AuthForm(props: AuthFormProps) {
  const { mode } = props
  const { title, description, submit, action } = modes[mode]
  const [state, formAction, pending] = useActionState(action, {})
  const hasEmail = mode === 'login' || mode === 'forgot-password'
  const hasPassword = mode === 'login' || mode === 'reset-password'

  if (props.mode === 'logout') {
    const { logoutDialog } = props

    return (
      <AlertDialog
        open={logoutDialog.open}
        onOpenChange={(open, eventDetails) => {
          if (!open && pending) {
            eventDetails.cancel()
            return
          }
          logoutDialog.onOpenChange(open)
        }}
      >
        <AlertDialogContent finalFocus={logoutDialog.finalFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <FieldError>{state.error}</FieldError>
          <form action={formAction}>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit" disabled={pending}>
                {pending ? 'Logging out…' : submit}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

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
          <form action={formAction}>
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
                  <input type="hidden" name="token" value={props.token} />
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
