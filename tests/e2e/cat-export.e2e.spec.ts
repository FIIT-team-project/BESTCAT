import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'

import config from '../../src/payload.config'
import { login } from '../helpers/login'

test.describe('Cat PDF download', () => {
  let payload: Payload
  let catID: number
  let adminID: number
  let judgeID: number
  let showID: number
  let eventID: number
  let entryID: number
  const credentials = { email: `pdf-admin-${randomUUID()}@example.com`, password: 'test-password' }

  test.beforeAll(async () => {
    payload = await getPayload({ config })
    adminID = (await payload.create({ collection: 'admins', data: credentials })).id
    catID = (
      await payload.create({
        collection: 'cats',
        data: {
          catalog_number: 9999,
          name: 'Žofka PDF test — veľmi dlhé meno mačky s diakritikou zo slovenskej chovateľskej stanice',
          breed: 'MCO',
          color: 'n',
          sex: 'Female',
        },
      })
    ).id
    judgeID = (
      await payload.create({
        collection: 'users',
        data: {
          name: 'PDF judge',
          email: `pdf-judge-${randomUUID()}@example.com`,
          password: 'test-password',
        },
      })
    ).id
    showID = (
      await payload.create({
        collection: 'shows',
        data: {
          show_name: 'PDF export test show',
          chief_steward: judgeID,
          organization: 'Test',
          city: 'Bratislava',
          country: 'Slovakia',
          license_number: 'L#123',
          is_active: false,
        },
      })
    ).id
    eventID = (
      await payload.create({
        collection: 'events',
        data: {
          name: 'PDF test judging',
          show: showID,
          judge: judgeID,
          event_type: 'table',
          event_date: '2026-11-25',
        },
      })
    ).id
    entryID = (
      await payload.create({
        collection: 'cat-event-entries',
        data: { cat: catID, event: eventID, queue_number: 1, cat_status: 'registered' },
      })
    ).id
  })

  test.afterAll(async () => {
    try {
      if (entryID) await payload.delete({ collection: 'cat-event-entries', id: entryID })
      if (eventID) await payload.delete({ collection: 'events', id: eventID })
      if (showID) await payload.delete({ collection: 'shows', id: showID })
      if (judgeID) await payload.delete({ collection: 'users', id: judgeID })
      if (catID) await payload.delete({ collection: 'cats', id: catID })
      if (adminID) await payload.delete({ collection: 'admins', id: adminID })
    } finally {
      await payload?.destroy()
    }
  })

  test('does not offer PDF export in the cats list', async ({ page }) => {
    test.slow()
    await login({ page, user: credentials })
    await page.goto('http://localhost:3000/admin/collections/cats')
    await expect(page.getByRole('heading', { name: 'Cats', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toHaveCount(0)
  })

  test('downloads the show cat list next to the import and disables export before saving', async ({
    page,
  }, testInfo) => {
    test.slow()
    await login({ page, user: credentials })
    await page.goto(`http://localhost:3000/admin/collections/shows/${showID}`)
    await expect(
      page.getByRole('heading', { name: 'Import cats and judging schedule' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Export cats to PDF' })).toBeVisible()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export PDF', exact: true }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(new RegExp(`^show-${showID}-cats-.*\\.pdf$`))
    expect(await download.failure()).toBeNull()
    await download.saveAs(testInfo.outputPath('show-cats.pdf'))
    await page.getByRole('heading', { name: 'Export cats to PDF' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('show-export.png') })

    await page.route(`**/api/shows/${showID}/export-pdf`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'PDF export is unavailable. Please try again.' }],
        }),
      }),
    )
    await page.getByRole('button', { name: 'Export PDF', exact: true }).click()
    await expect(
      page.getByRole('region', { name: 'Export cats to PDF' }).getByRole('alert'),
    ).toContainText('PDF export is unavailable')
    await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toBeEnabled()

    await page.goto('http://localhost:3000/admin/collections/shows/create')
    await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toBeDisabled()
    await expect(
      page.getByText('Save the show first, then export its cat list here.'),
    ).toBeVisible()
  })
})
