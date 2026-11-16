'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'

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

import {
  checkEmailAction,
  forgotPasswordAction,
  loginAction,
  logoutAction,
  resendOtpAction,
  resetPasswordAction,
  setPasswordAction,
  verifyOtpAction,
  type AuthActionState,
} from './actions'

type AuthMode = 'login' | 'auth' | 'forgot-password' | 'reset-password' | 'logout'

interface AuthFormProps {
  mode: AuthMode
  token?: string
}

export function AuthForm({ mode, token }: AuthFormProps) {
  // Multi-step auth state
  const [step, setStep] = useState<'email' | 'password' | 'otp' | 'set-password'>('email')
  const [currentEmail, setCurrentEmail] = useState('')
  const [onboardingToken, setOnboardingToken] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [flowError, setFlowError] = useState<string>()

  // Apply server results in the submission handler, including errors that change steps.
  const withFlowState =
    (action: (state: AuthActionState, data: FormData) => Promise<AuthActionState>) =>
    async (state: AuthActionState, data: FormData) => {
      const result = await action(state, data)
      if (result.step) setStep(result.step)
      if (result.email) setCurrentEmail(result.email)
      if (result.onboardingToken) setOnboardingToken(result.onboardingToken)
      if (result.cooldownUntil) {
        setCooldown(Math.max(0, Math.ceil((Date.parse(result.cooldownUntil) - Date.now()) / 1000)))
      }
      setFlowError(result.error)
      return result
    }

  // Server action states
  const [, checkEmailFormAction, isCheckingEmail] = useActionState(
    withFlowState(checkEmailAction),
    {},
  )
  const [, loginFormAction, isLoggingIn] = useActionState(withFlowState(loginAction), {})
  const [, verifyOtpFormAction, isVerifyingOtp] = useActionState(withFlowState(verifyOtpAction), {})
  const [, resendOtpFormAction, isResendingOtp] = useActionState(withFlowState(resendOtpAction), {})
  const [, setPasswordFormAction, isSettingPassword] = useActionState(
    withFlowState(setPasswordAction),
    {},
  )

  // Dedicated modes
  const [forgotState, forgotFormAction, isForgotPending] = useActionState(forgotPasswordAction, {})
  const [resetState, resetFormAction, isResetPending] = useActionState(resetPasswordAction, {})
  const [logoutState, logoutFormAction] = useActionState(logoutAction, {})

  const logoutFormRef = useRef<HTMLFormElement>(null)
  const logoutStarted = useRef(false)

  // Handle logout
  useEffect(() => {
    if (mode === 'logout' && !logoutStarted.current) {
      logoutStarted.current = true
      logoutFormRef.current?.requestSubmit()
    }
  }, [mode])

  // Cooldown countdown interval
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Helper to return to email step
  const handleBackToEmail = () => {
    setStep('email')
    setOnboardingToken('')
    setFlowError(undefined)
  }

  // ---------------------------------------------------------------------------
  // Logout View
  // ---------------------------------------------------------------------------
  if (mode === 'logout') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Odhlásenie</h1>
          </CardTitle>
          <CardDescription>Odhlasujem vás zo systému…</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logoutFormAction} ref={logoutFormRef}>
            <FieldError>{logoutState.error}</FieldError>
          </form>
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Forgot Password View
  // ---------------------------------------------------------------------------
  if (mode === 'forgot-password') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Forgot Password</h1>
          </CardTitle>
          <CardDescription>
            Enter your email and we will send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forgotState.success ? (
            <FieldDescription role="status">
              We have sent you a link to reset your password.
            </FieldDescription>
          ) : (
            <form action={forgotFormAction}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </Field>
                <FieldError>{forgotState.error}</FieldError>
                <Field>
                  <Button type="submit" disabled={isForgotPending}>
                    {isForgotPending ? 'Sending…' : 'Send Link'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Link href="/login" className="text-sm underline-offset-4 hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Reset Password View
  // ---------------------------------------------------------------------------
  if (mode === 'reset-password') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Reset Password</h1>
          </CardTitle>
          <CardDescription>Enter and confirm your new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={resetFormAction}>
            <FieldGroup>
              <input type="hidden" name="token" value={token} />
              <Field>
                <FieldLabel htmlFor="password">New Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </Field>
              <FieldError>{resetState.error}</FieldError>
              <Field>
                <Button type="submit" disabled={isResetPending}>
                  {isResetPending ? 'Saving…' : 'Set New Password'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <Link href="/login" className="text-sm underline-offset-4 hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Multi-step Auth Flow: Step 1 - Enter Email
  // ---------------------------------------------------------------------------
  if (step === 'email') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Login</h1>
          </CardTitle>
          <CardDescription>Enter your email to login or activate your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={checkEmailFormAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Emailová adresa</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  defaultValue={currentEmail}
                  required
                  autoFocus
                />
              </Field>
              <FieldError>{flowError}</FieldError>
              <Field>
                <Button type="submit" disabled={isCheckingEmail}>
                  {isCheckingEmail ? 'Checking…' : 'Continue'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <Link href="/forgot-password" className="text-sm underline-offset-4 hover:underline">
            Forgot your password?
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Multi-step Auth Flow: Step 2a - Registered User Login (Password)
  // ---------------------------------------------------------------------------
  if (step === 'password') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Login</h1>
          </CardTitle>
          <CardDescription>{currentEmail}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginFormAction}>
            <FieldGroup>
              <input type="hidden" name="email" value={currentEmail} />
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                />
              </Field>
              <FieldError>{flowError}</FieldError>
              <Field>
                <Button type="submit" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Logging in…' : 'Login'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2">
          <div className="flex w-full justify-between items-center text-sm">
            <Link
              href="/forgot-password"
              className="text-sm underline-offset-4 hover:underline text-muted-foreground"
            >
              Forgot your password?
            </Link>
            <button
              type="button"
              onClick={handleBackToEmail}
              className="text-sm underline-offset-4 hover:underline text-muted-foreground"
            >
              Enter a different email
            </button>
          </div>
        </CardFooter>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Multi-step Auth Flow: Step 2b - Activation via OTP
  // ---------------------------------------------------------------------------
  if (step === 'otp') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Account Activation</h1>
          </CardTitle>
          <CardDescription>
            Enter the 6-digit verification code we sent to your email{' '}
            <span className="font-semibold text-foreground">{currentEmail}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={verifyOtpFormAction}>
            <FieldGroup>
              <input type="hidden" name="email" value={currentEmail} />
              <Field>
                <FieldLabel htmlFor="code">Verification Code</FieldLabel>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  className="text-center font-mono text-xl tracking-widest"
                  required
                  autoFocus
                />
                <FieldDescription>The code is valid for 10 minutes.</FieldDescription>
              </Field>
              <FieldError>{flowError}</FieldError>
              <Field>
                <Button type="submit" disabled={isVerifyingOtp}>
                  {isVerifyingOtp ? 'Verifying code…' : 'Verify Code'}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          {/* Resend OTP cooldown form */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">You did not receive a code?</span>
            <form action={resendOtpFormAction}>
              <input type="hidden" name="email" value={currentEmail} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={cooldown > 0 || isResendingOtp}
              >
                {isResendingOtp
                  ? 'Sending…'
                  : cooldown > 0
                    ? `Resend (${cooldown}s)`
                    : 'Resend Code'}
              </Button>
            </form>
          </div>
        </CardContent>
        <CardFooter>
          <button
            type="button"
            onClick={handleBackToEmail}
            className="text-sm underline-offset-4 hover:underline text-muted-foreground"
          >
            Back to enter email
          </button>
        </CardFooter>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Multi-step Auth Flow: Step 3 - Set Password & Auto Login
  // ---------------------------------------------------------------------------
  if (step === 'set-password') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Setting Password</h1>
          </CardTitle>
          <CardDescription>
            Your email has been verified. Set a password for your account{' '}
            <span className="font-semibold text-foreground">{currentEmail}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setPasswordFormAction}>
            <FieldGroup>
              <input type="hidden" name="email" value={currentEmail} />
              <input type="hidden" name="onboardingToken" value={onboardingToken} />
              <Field>
                <FieldLabel htmlFor="password">New Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  autoFocus
                />
                <FieldDescription>Password must be at least 8 characters.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Password Confirmation</FieldLabel>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </Field>
              <FieldError>{flowError}</FieldError>
              <Field>
                <Button type="submit" disabled={isSettingPassword}>
                  {isSettingPassword ? 'Setting password…' : 'Set Password and Sign In'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <Button type="button" variant="link" onClick={handleBackToEmail}>
            Request a new code
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return null
}
