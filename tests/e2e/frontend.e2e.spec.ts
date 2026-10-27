import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('redirects unauthenticated visitors to the BESTCAT login page', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveURL('http://localhost:3000/auth/login')
    await expect(page).toHaveTitle('BESTCAT')
    await expect(page.getByRole('heading', { name: 'BESTCAT' })).toBeVisible()
  })
})
