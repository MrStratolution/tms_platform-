import { expect, type Locator, type Page } from '@playwright/test'

export const ADMIN_EMAIL = 'e2e@company.com'
export const ADMIN_PASSWORD = 'E2Epassword123'

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
}

export async function loginToConsole(page: Page) {
  await page.goto('/console/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/console(?:\/)?$/)
  await expect(page).toHaveURL(/\/console(?:\/)?$/)
}

export async function dismissCookieBanner(page: Page) {
  const banner = page.locator('.tma-cookie-banner')
  if (await banner.isVisible().catch(() => false)) {
    const accept = banner.getByRole('button').first()
    if (await accept.isVisible().catch(() => false)) {
      await accept.click()
    }
  }
}

export async function expectWithinViewport(locator: Locator, page: Page, rightInset = 8) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element has no bounding box')
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Missing viewport size')
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - rightInset)
}
