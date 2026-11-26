import { expect, test } from '@playwright/test'

test('the app loads and shows its heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Việc của tôi' })).toBeVisible()
})
