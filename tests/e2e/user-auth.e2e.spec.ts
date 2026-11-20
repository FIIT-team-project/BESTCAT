import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config'

const serverURL = 'http://localhost:3000'

test.describe('Regular user pages', () => {
  let payload: Payload
  let userID: number
  const email = `e2e-user-auth-${randomUUID()}@example.com`
  const password = 'test-user-password'

  test.beforeAll(async () => {
    payload = await getPayload({ config, key: 'e2e-user-auth' })
    const user = await payload.create({
      collection: 'users',
      data: { email, password, name: 'Login test user' },
    })
    userID = user.id
  })

  test.afterAll(async () => {
    try {
      if (userID) await payload.delete({ collection: 'users', id: userID })
    } finally {
      await payload?.destroy()
    }
  })

  test('logs in, restores the session, and logs out through the simple forms', async ({ page }) => {
    test.slow()
    await page.goto(`${serverURL}/login`)
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill('incorrect-password')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Unable to log in')

    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
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
    await page.getByRole('button', { name: 'Send reset email' }).click()
    await expect(page.getByRole('status')).toContainText('A password reset link has been sent to your email.')

    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
    })
    const resetURL = `${serverURL}/reset-password?token=${token}`
    await page.goto(resetURL)
    await page.getByLabel('New password', { exact: true }).fill('updated-user-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('mismatch')
    await page.getByRole('button', { name: 'Reset password', exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Passwords do not match.')

    await page.getByLabel('New password', { exact: true }).fill('updated-user-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('updated-user-password')
    await page.getByRole('button', { name: 'Reset password', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/`)
    await expect(page.getByRole('heading', { name: `Welcome back, ${email}` })).toBeVisible()

    await page.goto(resetURL)
    await page.getByLabel('New password', { exact: true }).fill('updated-user-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('updated-user-password')
    await page.getByRole('button', { name: 'Reset password', exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toContainText('invalid or expired')
  })
})
