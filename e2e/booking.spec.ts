import { expect, test } from '@playwright/test'

import { dismissCookieBanner, loginToConsole, uniqueEmail } from './utils'

test.describe('booking flow', () => {
  test('internal booking flow loads slots, confirms booking, and creates a lead', async ({ page }) => {
    const email = uniqueEmail('booking')

    await page.goto('/en/book/demo-strategy-call')
    await dismissCookieBanner(page)
    await expect(page.locator('.book-flow')).toBeVisible()
    await expect(page.locator('.book-flow__day-tabs')).toBeVisible()

    const firstSlot = page.locator('.book-flow__slot').first()
    await expect(firstSlot).toBeVisible()
    await firstSlot.click()

    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="given-name"]').fill('E2E')
    await page.locator('input[autocomplete="family-name"]').fill('Booking')
    await page.getByRole('button', { name: 'Confirm booking' }).click()

    await page.waitForURL(/\/en\/thanks(?:\?.*)?$/)
    await expect(page).toHaveURL(/\/en\/thanks(?:\?.*)?$/)

    await loginToConsole(page)
    await page.goto('/console/leads')
    await expect(page.getByRole('link', { name: email })).toBeVisible()
  })
})
