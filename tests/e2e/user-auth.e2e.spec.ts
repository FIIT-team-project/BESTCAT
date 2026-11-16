import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config'
import type { User } from '../../src/payload-types'
import { hashAuthToken } from '../../src/lib/auth/onboarding'

const serverURL = 'http://localhost:3000'

test.describe('Regular user pages', () => {
  let payload: Payload
  let userID: number
  let pendingUserID: number
  const email = `e2e-user-auth-${randomUUID()}@example.com`
  const pendingEmail = `e2e-user-pending-${randomUUID()}@example.com`
  const password = 'test-user-password'

  test.beforeAll(async () => {
    payload = await getPayload({ config, key: 'e2e-user-auth' })
    const user = await payload.create({
      collection: 'users',
      data: { email, password, name: 'Login test user', isActivated: true },
    })
    userID = user.id
    const pending = await payload.create({
      collection: 'users',
      data: { email: pendingEmail, password: 'initial-password', name: 'Pending user' },
    })
    pendingUserID = pending.id
  })

  test.afterAll(async () => {
    try {
      if (userID) await payload.delete({ collection: 'users', id: userID })
      if (pendingUserID) await payload.delete({ collection: 'users', id: pendingUserID })
    } finally {
      await payload?.destroy()
    }
  })

  test('logs in, restores the session, and logs out through the simple forms', async ({ page }) => {
    test.slow()
    await page.goto(`${serverURL}/login`)
    await page.getByLabel('Emailová adresa', { exact: true }).fill(email)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByLabel('Password', { exact: true }).fill('incorrect-password')
    await page.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'Invalid email or password',
    )

    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/`)
    await expect(page.getByRole('heading', { name: `Welcome back, ${email}` })).toBeVisible()

    await page.goto(`${serverURL}/login`)
    await expect(page).toHaveURL(`${serverURL}/`)
    await page.getByRole('link', { name: 'Log out', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/login`)
    await page.goto(serverURL)
    await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible()
  })

  test('offers password recovery and accepts a valid reset link', async ({ page }) => {
    test.slow()
    await page.goto(`${serverURL}/login`)
    await page.getByRole('link', { name: 'Forgot your password?' }).click()
    await expect(page).toHaveURL(`${serverURL}/forgot-password`)
    await page.getByLabel('Email', { exact: true }).fill(`unknown-${randomUUID()}@example.com`)
    await page.getByRole('button', { name: 'Send Link' }).click()
    await expect(page.getByRole('status')).toContainText('We have sent you a link')

    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
    })
    const resetURL = `${serverURL}/reset-password?token=${token}`
    await page.goto(resetURL)
    await page.getByLabel('New Password', { exact: true }).fill('updated-user-password')
    await page.getByLabel('Confirm Password', { exact: true }).fill('mismatch')
    await page.getByRole('button', { name: 'Set New Password', exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Passwords do not match.')

    await page.getByLabel('New Password', { exact: true }).fill('updated-user-password')
    await page.getByLabel('Confirm Password', { exact: true }).fill('updated-user-password')
    await page.getByRole('button', { name: 'Set New Password', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/`)
    await expect(page.getByRole('heading', { name: `Welcome back, ${email}` })).toBeVisible()

    await page.goto(resetURL)
    await page.getByLabel('New Password', { exact: true }).fill('updated-user-password')
    await page.getByLabel('Confirm Password', { exact: true }).fill('updated-user-password')
    await page.getByRole('button', { name: 'Set New Password', exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toContainText('invalid or expired')
  })

  test('activates a pending account through OTP and password setup', async ({ page }) => {
    await page.goto(`${serverURL}/login`)
    await page.getByLabel('Emailová adresa', { exact: true }).fill(pendingEmail)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Account Activation' })).toBeVisible()

    // Set a deterministic code in the isolated test database; never deliver real test emails.
    const challenge = (await payload.db.findOne({
      collection: 'users',
      where: { id: { equals: pendingUserID } },
    })) as User | null
    expect(challenge?.otpCode).toBeTruthy()
    await payload.db.updateOne({
      collection: 'users',
      id: pendingUserID,
      data: { otpCode: hashAuthToken('123456') },
    })

    await page.getByLabel('Verification Code', { exact: true }).fill('123456')
    await page.getByRole('button', { name: 'Verify Code', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Setting Password' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Request a new code' })).toBeVisible()
    await page.getByLabel('New Password', { exact: true }).fill('activated-user-password')
    await page.getByLabel('Password Confirmation', { exact: true }).fill('activated-user-password')
    await page.getByRole('button', { name: 'Set Password and Sign In', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/`)
    await expect(page.getByRole('heading', { name: `Welcome back, ${pendingEmail}` })).toBeVisible()
  })
})
