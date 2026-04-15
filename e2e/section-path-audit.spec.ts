import { expect, test } from '@playwright/test'

import { dismissCookieBanner } from './utils'

test.describe('section expansion and path audit', () => {
  test('core DE pages expose the upgraded rich sections and key CTA paths', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 })

    await page.goto('/de')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-quote-band--marquee')).toBeVisible()
    await expect(page.locator('.block-video')).toBeVisible()
    const homeSpotlight = page.locator('.block-featured-project').first()
    await expect(homeSpotlight).toBeVisible()
    await homeSpotlight.getByRole('link', { name: 'Projekt ansehen' }).click()
    await page.waitForURL(/\/de\/work\/demo-atlas-reset$/)

    await page.goto('/de/services')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-process--timeline')).toBeVisible()
    await expect(page.locator('.block-video')).toBeVisible()
    await page.locator('.block-video').getByRole('link', { name: 'Projekt starten' }).click()
    await page.waitForURL(/\/de\/contact$/)

    await page.goto('/de/industries')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-industry-grid')).toBeVisible()
    await expect(page.locator('#demo-ai-platforms')).toBeVisible()
    await page.locator('.block-industry-grid .block-industry-grid__cta a').first().click()
    await page.waitForURL(/\/de\/contact$/)

    await page.goto('/de/work')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-featured-project')).toBeVisible()
    await expect(page.locator('.block-media-gallery')).toBeVisible()
    await expect(page.locator('.block-testimonials--spotlight')).toBeVisible()
    await page.locator('.block-featured-project').getByRole('link', { name: 'Projekt ansehen' }).click()
    await page.waitForURL(/\/de\/work\/demo-atlas-reset$/)

    await page.goto('/de/about')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-quote-band--marquee')).toBeVisible()
    await expect(page.locator('.block-team .tma-card-rail__viewport')).toBeVisible()
    await expect(page.locator('.block-media-gallery')).toBeVisible()
    await expect(page.locator('.block-process--timeline')).toBeVisible()

    await page.goto('/de/contact')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-testimonials--spotlight')).toBeVisible()
    await expect(page.locator('.block-form__form')).toBeVisible()
    await expect(page.locator('.block-booking')).toBeVisible()
    await page.locator('.block-booking').getByRole('button').click()
    await page.waitForURL(/\/de\/book\/demo-strategy-call$/)
  })

  test('core EN pages keep locale-safe CTA paths and upgraded sections', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 })

    await page.goto('/en')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-featured-project')).toBeVisible()
    await page.locator('.block-featured-project').getByRole('link', { name: 'View project' }).click()
    await page.waitForURL(/\/de\/work\/demo-atlas-reset$/)

    await page.goto('/en/work')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-media-gallery')).toBeVisible()
    await expect(page.locator('.block-testimonials--spotlight')).toBeVisible()

    await page.goto('/en/industries')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-industry-grid')).toBeVisible()
    await expect(page.locator('#demo-ai-platforms')).toBeVisible()

    await page.goto('/en/contact')
    await dismissCookieBanner(page)
    await expect(page.locator('.block-testimonials--spotlight')).toBeVisible()
    await expect(page.locator('.block-booking')).toBeVisible()
    await page.locator('.block-booking').getByRole('button').click()
    await page.waitForURL(/\/en\/book\/demo-strategy-call$/)
  })

  test('rich sections stay inside the viewport on mobile and tablet', async ({ page }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/de/work')
      await dismissCookieBanner(page)

      await expect(page.locator('.block-featured-project')).toBeVisible()
      await expect(page.locator('.block-media-gallery')).toBeVisible()

      const overflow = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1)
    }
  })

  test('testimonial spotlight keeps horizontal rail without nested card scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 })
    await page.goto('/de/contact')
    await dismissCookieBanner(page)

    const rail = page.locator('.block-testimonials--spotlight .tma-card-rail__viewport--rail').first()
    await expect(rail).toBeVisible()

    const card = page.locator('.block-testimonials__entry').first()
    const before = await card.evaluate((node) => ({
      overflowY: window.getComputedStyle(node).overflowY,
      clientHeight: node.clientHeight,
    }))
    expect(before.overflowY).not.toBe('auto')
    expect(before.overflowY).not.toBe('scroll')

    const toggle = page.locator('.block-testimonials__toggle').first()
    if (await toggle.count()) {
      await expect(toggle).toBeVisible()
      await toggle.click()

      const after = await card.evaluate((node) => ({
        overflowY: window.getComputedStyle(node).overflowY,
        clientHeight: node.clientHeight,
      }))
      expect(after.overflowY).not.toBe('auto')
      expect(after.overflowY).not.toBe('scroll')
      expect(after.clientHeight).toBeGreaterThanOrEqual(before.clientHeight)
    }
  })
})
