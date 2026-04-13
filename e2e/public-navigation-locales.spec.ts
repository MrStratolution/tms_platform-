import { expect, test } from '@playwright/test'

import { dismissCookieBanner, expectWithinViewport } from './utils'

test.describe('public navigation and locale flows', () => {
  test('major localized pages render and locale switcher works', async ({ page }) => {
    const pages = ['/de', '/de/services', '/de/work', '/de/projects', '/de/news', '/de/about', '/de/contact']

    for (const path of pages) {
      const response = await page.goto(path)
      expect(response?.ok(), `Expected ${path} to render successfully`).toBeTruthy()
    }

    await page.setViewportSize({ width: 1600, height: 1100 })
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
    await page.setViewportSize({ width: 1600, height: 1100 })
    await page.goto('/de/services')
    await dismissCookieBanner(page)
    const langDesktop = page.locator('.tma-header__lang--desktop')
    await expect(langDesktop).toBeVisible()
    await expectWithinViewport(langDesktop, page, 4)
    await expect(page.locator('.tma-header__nav--wide')).toBeVisible()
    await expect(page.locator('.tma-header__menu-toggle')).toBeHidden()
    await expect(page.locator('.tma-header__nav-cta--compact')).toBeHidden()

    await page.setViewportSize({ width: 1366, height: 1100 })
    await page.goto('/de/services')
    await dismissCookieBanner(page)
    await expect(page.locator('.tma-header__nav--wide')).toBeHidden()
    await expect(page.locator('.tma-header__nav-cta--compact')).toBeVisible()
    await expectWithinViewport(page.locator('.tma-header__nav-cta--compact'), page, 4)
    await expect(page.locator('.tma-header__menu-toggle')).toBeVisible()
    await page.locator('.tma-header__menu-toggle').click()
    await expect(page.locator('.tma-header__drawer--open')).toBeVisible()
    await expect(page.locator('.tma-header__drawer-close')).toBeVisible()
    await expect(page.locator('.tma-header__drawer-lang .tma-lang-switcher__select')).toBeVisible()
    await page.locator('.tma-header__drawer-close').click()
    await expect(page.locator('.tma-header__drawer--open')).toBeHidden()

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/de/services')
    await dismissCookieBanner(page)
    await expect(page.locator('.tma-header__nav--wide')).toBeHidden()
    await expect(page.locator('.tma-header__nav-cta--compact')).toBeVisible()
    await expect(page.locator('.tma-header__menu-toggle')).toBeVisible()

    await page.setViewportSize({ width: 1024, height: 1100 })
    await page.goto('/de/services')
    await dismissCookieBanner(page)
    await expect(page.locator('.tma-header__nav--wide')).toBeHidden()
    await expect(page.locator('.tma-header__nav-cta--compact')).toBeVisible()
    await expect(page.locator('.tma-header__menu-toggle')).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/de/services')
    await dismissCookieBanner(page)
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/)
    await expect(page.locator('.tma-header__nav--wide')).toBeHidden()
    await expect(page.locator('.tma-header__nav-cta--compact')).toBeHidden()
    await expect(page.locator('.tma-header__menu-toggle')).toBeVisible()
    const overflow = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll('body *'))
        .map((el) => {
          const rect = el.getBoundingClientRect()
          return {
            tag: el.tagName,
            className: typeof el.className === 'string' ? el.className : '',
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        })
        .filter((item) => item.width > 0 && item.height > 0 && (item.right > window.innerWidth + 1 || item.left < -1))
        .slice(0, 10),
    }))
    expect(overflow.scrollWidth, JSON.stringify(overflow.offenders, null, 2)).toBeLessThanOrEqual(overflow.innerWidth + 1)
  })

  test('team and card sections switch to a rail when item counts overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1100 })
    await page.goto('/de/about')
    await dismissCookieBanner(page)

    const teamSection = page.locator('.block-team')
    await teamSection.scrollIntoViewIfNeeded()
    await expect(teamSection.locator('.tma-card-rail__controls')).toBeVisible()
    const teamViewport = teamSection.locator('.tma-card-rail__viewport--rail')
    await expect(teamViewport).toBeVisible()
    const next = teamSection.locator('.tma-card-rail__control').nth(1)
    await expect(next).toBeEnabled()
    const before = await teamViewport.evaluate((node) => node.scrollLeft)
    await next.click()
    await expect
      .poll(() => teamViewport.evaluate((node) => node.scrollLeft))
      .toBeGreaterThan(before)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/de/about')
    await dismissCookieBanner(page)
    const mobileTeamViewport = page.locator('.block-team .tma-card-rail__viewport--rail')
    await mobileTeamViewport.scrollIntoViewIfNeeded()
    await expect(mobileTeamViewport).toBeVisible()
    const mobileOverflow = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(mobileOverflow.scrollWidth).toBeLessThanOrEqual(mobileOverflow.innerWidth + 1)
  })
})
