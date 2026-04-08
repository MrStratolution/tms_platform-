import { expect, test } from '@playwright/test'

import { loginToConsole } from './utils'

test.describe('console settings editing', () => {
  test('manual navigation add buttons all create editable rows', async ({ page }) => {
    await loginToConsole(page)
    await page.goto('/console/settings')

    const navSection = page.locator('fieldset:has(> legend:text-is("Manual navigation"))')
    const items = navSection.locator('[id^="header-nav-item-"]')
    await expect(items.first()).toBeVisible()
    const initialCount = await items.count()

    await navSection.getByRole('button', { name: 'Add page link' }).click()
    await expect(items).toHaveCount(initialCount + 1)

    await navSection.getByRole('button', { name: 'Add product link' }).click()
    await expect(items).toHaveCount(initialCount + 2)

    await navSection.getByRole('button', { name: 'Add booking link' }).click()
    await expect(items).toHaveCount(initialCount + 3)

    await navSection.getByRole('button', { name: 'Add external link' }).click()
    await expect(items).toHaveCount(initialCount + 4)

    const newest = items.first()
    await expect(newest.getByLabel('Link type')).toBeVisible()
    await expect(newest.getByLabel('Menu label')).toBeVisible()
  })

  test('announcement settings save and reflect on public site', async ({ page }) => {
    const markerDe = `E2E Laufband ${Date.now()}`
    const markerEn = `E2E Running ${Date.now()}`

    await loginToConsole(page)
    await page.goto('/console/settings')

    const announcement = page.locator('fieldset:has(> legend:text-is("Announcement bar"))')
    await announcement.getByLabel('Show announcement bar').check()
    await announcement.getByLabel('Text (DE/default)').fill(markerDe)
    await announcement.getByLabel('Text (EN)').fill(markerEn)
    await announcement.getByLabel('Behavior').selectOption('running')
    await announcement.getByLabel('Speed').selectOption('normal')
    await page.getByRole('button', { name: 'Save changes' }).first().click()
    await expect(page.locator('.tma-console-success')).toContainText('Saved')

    await page.goto('/de')
    await expect(page.locator('.tma-header__announcement')).toContainText(markerDe)
    await expect(page.locator('.tma-header__announcement')).toHaveClass(/tma-header__announcement--running/)

    await page.goto('/en')
    await expect(page.locator('.tma-header__announcement')).toContainText(markerEn)
  })
})
