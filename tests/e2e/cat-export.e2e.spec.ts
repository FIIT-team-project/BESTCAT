import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'

import config from '../../src/payload.config'
import { login } from '../helpers/login'

test.describe('Cat PDF export', () => {
  let payload: Payload
  let catID: number
  let adminID: number
  const credentials = { email: `pdf-admin-${randomUUID()}@example.com`, password: 'test-password' }

  test.beforeAll(async () => {
    payload = await getPayload({ config, key: 'e2e-cat-export' })
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
  })

  test.afterAll(async () => {
    try {
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
})
