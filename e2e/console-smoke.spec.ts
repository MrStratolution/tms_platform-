import { expect, test } from '@playwright/test'

import { loginToConsole } from './utils'

test.describe('console smoke routes', () => {
  test('main console areas render for an authenticated admin', async ({ page }) => {
    await loginToConsole(page)

    const checks = [
      ['/console', 'Dashboard'],
      ['/console/pages', 'Pages'],
      ['/console/news', 'News / Blog'],
      ['/console/products', 'Projects / Products'],
      ['/console/services', 'Services'],
      ['/console/industries', 'Industries'],
      ['/console/case-studies', 'Case Studies'],
      ['/console/forms', 'Form configs'],
      ['/console/booking-profiles', 'Booking profiles'],
      ['/console/leads', 'Leads'],
      ['/console/settings', 'Settings'],
      ['/console/email-templates', 'Email templates'],
    ] as const

    for (const [path, heading] of checks) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    }
  })
})
