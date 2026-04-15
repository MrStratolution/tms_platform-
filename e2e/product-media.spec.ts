import { expect, test } from '@playwright/test'

import { dismissCookieBanner } from './utils'

test.describe('product media enrichment', () => {
  test('localized product page renders cover image, gallery, and video showcase', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 })

    await page.goto('/de/products/luma-editorial-engine')
    await dismissCookieBanner(page)

    await expect(page.locator('.tma-product-public__hero-image')).toBeVisible()
    await expect(page.locator('.tma-product-public__gallery-grid')).toBeVisible()
    await expect(page.locator('.tma-product-public__gallery-item')).toHaveCount(3)
    await expect(page.locator('.tma-product-public__video-showcase')).toBeVisible()
    await expect(page.locator('.tma-product-public__video-showcase iframe')).toBeVisible()

    await page.goto('/en/products/luma-editorial-engine')
    await dismissCookieBanner(page)
    await expect(page.locator('.tma-product-public__gallery-caption').first()).toContainText(
      'Hero visual',
    )
    await expect(
      page.locator('.tma-product-public__video-showcase').getByRole('link', {
        name: 'Discuss project',
      }),
    ).toBeVisible()
  })

  test('product media stays inside the viewport on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/de/products/luma-editorial-engine')
    await dismissCookieBanner(page)

    await expect(page.locator('.tma-product-public__gallery-grid')).toBeVisible()

    const overflow = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1)
  })
})
