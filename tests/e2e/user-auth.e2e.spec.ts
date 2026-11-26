import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config'
import type { Event } from '../../src/payload-types'

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

  test('restores the session and logs out only after confirmation', async ({ page }) => {
    test.slow()
    await page.goto(`${serverURL}/login`)
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill('incorrect-password')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Unable to log in')

    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/show-home`)
    await expect(page.getByRole('heading', { name: 'Current show', exact: true })).toBeVisible()

    await page.goto(`${serverURL}/login`)
    await expect(page).toHaveURL(`${serverURL}/show-home`)
    const logoutButton = page.getByRole('button', { name: 'Log out', exact: true })
    const confirmation = page.getByRole('alertdialog', { name: 'Log out' })

    await logoutButton.click()
    await expect(confirmation).toBeVisible()
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(confirmation).toBeHidden()
    await expect(page).toHaveURL(`${serverURL}/show-home`)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Current show', exact: true })).toBeVisible()

    await logoutButton.click()
    await confirmation.getByRole('button', { name: 'Log out', exact: true }).click()
    await expect(page).toHaveURL(`${serverURL}/login`)
    await page.goto(serverURL)
    await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible()
  })

  test('shows and filters the active schedule and preserves the staff landing page', async ({
    page,
  }) => {
    test.slow()
    const staff = await payload.create({
      collection: 'users',
      data: { email: `e2e-staff-${randomUUID()}@example.com`, password, name: 'Schedule staff' },
    })
    const showIds: number[] = []
    const createShow = async (name: string, active: boolean) => {
      const show = await payload.create({
        collection: 'shows',
        data: {
          show_name: name,
          chief_steward: staff.id,
          organization: 'WCF',
          city: 'Bratislava',
          country: 'Slovakia',
          license_number: 'L#244205',
          start_date: '2026-12-28',
          end_date: '2026-12-29',
          is_active: active,
        },
      })
      showIds.push(show.id)
      return show.id
    }
    const createEvent = (
      show: number,
      data: Pick<Event, 'name' | 'event_date' | 'event_time' | 'event_type' | 'status'>,
      judge = staff.id,
    ) => payload.create({ collection: 'events', data: { show, judge, steward: staff.id, ...data } })

    try {
      const activeShow = await createShow('Winter Cat Show', true)
      const oldShow = await createShow('Old Cat Show', false)
      const afternoon = await createEvent(activeShow, {
        name: 'Afternoon ring',
        event_date: '2026-12-28',
        event_time: '14:00',
        event_type: 'ring',
        status: 'ongoing',
      })
      await createEvent(activeShow, {
        name: 'Best in Show',
        event_date: '2026-12-29',
        event_type: 'bis',
        status: 'planned',
      })
      await createEvent(activeShow, {
        name: 'Morning judging',
        event_date: '2026-12-28',
        event_time: '09:00',
        event_type: 'table',
        status: 'finished',
      })
      await createEvent(
        oldShow,
        {
          name: 'Old judging',
          event_date: '2026-12-28',
          event_time: '08:00',
          event_type: 'table',
          status: 'finished',
        },
        userID,
      )

      await page.goto(`${serverURL}/login`)
      await page.getByLabel('Email', { exact: true }).fill(email)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Log in' }).click()
      await expect(page).toHaveURL(`${serverURL}/show-home`)
      await expect(page.getByRole('heading', { name: 'Winter Cat Show' })).toBeVisible()
      await expect(page.getByText('Dec 28, 2026 – Dec 29, 2026')).toBeVisible()
      await page.getByRole('link', { name: 'View all events' }).click()
      await expect(page).toHaveURL(`${serverURL}/show-event`, { timeout: 30_000 })

      const schedule = page.getByRole('list', { name: 'Event schedule' })
      const eventNames = schedule.getByRole('heading')
      await expect(eventNames).toHaveText(['Morning judging', 'Afternoon ring', 'Best in Show'])
      await expect(schedule.getByText('Finished', { exact: true })).toBeVisible()
      await expect(schedule.getByText('Ongoing', { exact: true })).toBeVisible()
      await expect(schedule.getByText('Planned', { exact: true })).toBeVisible()
      await expect(schedule.getByText('14:00', { exact: true })).toBeVisible()

      await page.getByRole('button', { name: 'Filters', exact: true }).click()
      await page.getByLabel('Date', { exact: true }).fill('2026-12-28')
      await page.getByLabel('From time').fill('12:00')
      await page.getByLabel('To time').fill('15:00')
      await page.getByLabel('Event type').selectOption('ring')
      await page.getByRole('button', { name: 'Apply filters' }).click()
      await expect(eventNames).toHaveText(['Afternoon ring'])

      await page.getByRole('searchbox').fill('JUDGING')
      await page.getByRole('button', { name: 'Search', exact: true }).click()
      await expect(page.getByText('No events match your search or filters.')).toBeVisible()
      await page.getByRole('button', { name: 'Filters', exact: true }).click()
      await page.getByRole('link', { name: 'Clear filters' }).click()
      await expect(eventNames).toHaveText(['Morning judging'])

      await payload.update({ collection: 'events', id: afternoon.id, data: { judge: userID } })
      await page.goto(serverURL)
      await expect(page).toHaveURL(`${serverURL}/`)
      await expect(page.getByRole('heading', { name: `Welcome back, ${email}` })).toBeVisible()
    } finally {
      if (showIds.length) {
        await payload.delete({ collection: 'events', where: { show: { in: showIds } } })
        await payload.delete({ collection: 'shows', where: { id: { in: showIds } } })
      }
      await payload.delete({ collection: 'users', id: staff.id })
    }
  })

  test('offers password recovery and accepts a valid reset link', async ({ page }) => {
    test.slow()
    await page.goto(`${serverURL}/login`)
    await page.getByRole('link', { name: 'Forgot your password?' }).click()
    await expect(page).toHaveURL(`${serverURL}/forgot-password`)
    await page.getByLabel('Email', { exact: true }).fill(`unknown-${randomUUID()}@example.com`)
    await page.getByRole('button', { name: 'Send reset email' }).click()
    await expect(page.getByRole('status')).toContainText(
      'A password reset link has been sent to your email.',
    )

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
    await expect(page).toHaveURL(`${serverURL}/show-home`)
    await expect(page.getByRole('heading', { name: 'Current show', exact: true })).toBeVisible()

    await page.goto(resetURL)
    await page.getByLabel('New password', { exact: true }).fill('updated-user-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('updated-user-password')
    await page.getByRole('button', { name: 'Reset password', exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toContainText('invalid or expired')
  })
})
