import { expect, test } from '@playwright/test'

import { dismissCookieBanner, expectWithinViewport } from './utils'

test.describe('public navigation and locale flows', () => {
  test('major localized pages render and locale switcher works', async ({ page }) => {
    const pages = ['/de', '/de/services', '/de/work', '/de/projects', '/de/news', '/de/about', '/de/contact']

    for (const path of pages) {
      const response = await page.goto(path)
      expect(response?.ok(), `Expected ${path} to render successfully`).toBeTruthy()
    }

    await page.goto('/de')
    await dismissCookieBanner(page)
    const switcher = page.locator('.tma-header__lang--desktop .tma-lang-switcher__select')
    await expect(switcher).toBeVisible()
    await expect(switcher).toHaveValue('de')
    await switcher.selectOption('en')
    await page.waitForURL(/\/en(?:\?.*)?$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('.tma-header__nav').first()).toContainText('Home')
    await expect(page.locator('body')).toContainText('Selected Work')
  })

  test('unsupported EN work detail route canonicalizes to DE', async ({ page }) => {
    await page.goto('/en/work/demo-atlas-reset')
    await page.waitForURL(/\/de\/work\/demo-atlas-reset$/)
    await expect(page).toHaveURL(/\/de\/work\/demo-atlas-reset$/)
    await expect(page.locator('.tma-lang-switcher__select')).toHaveCount(0)
  })

  test('desktop header stays within viewport and mobile uses drawer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 })
    await page.goto('/de/services')
    await dismissCookieBanner(page)
    const langDesktop = page.locator('.tma-header__lang--desktop')
    await expect(langDesktop).toBeVisible()
    await expectWithinViewport(langDesktop, page, 4)

    await page.setViewportSize({ width: 1024, height: 1100 })
    await page.goto('/de/services')
    await dismissCookieBanner(page)
    await expect(page.locator('.tma-header__nav--wide')).toBeHidden()
    await expect(page.locator('.tma-header__menu-toggle')).toBeVisible()
    await page.locator('.tma-header__menu-toggle').click()
    await expect(page.locator('.tma-header__drawer--open')).toBeVisible()
    await expect(page.locator('.tma-header__drawer-lang .tma-lang-switcher__select')).toBeVisible()
  })
})
