import { expect, test } from '@playwright/test'

import { dismissCookieBanner, loginToConsole, uniqueEmail } from './utils'

test.describe('contact form and leads', () => {
  test('contact form stores lead and duplicate resubmission is handled gracefully', async ({ page }) => {
    const email = uniqueEmail('contact')
    const name = 'E2E Contact'
    const message = 'Please get back to us about a website and booking flow.'

    await page.goto('/de/contact')
    await dismissCookieBanner(page)
    const form = page.locator('.block-form__form')
    await form.locator('input[name="firstName"]').fill(name)
    await form.locator('input[name="email"]').fill(email)
    await form.locator('input[name="company"]').fill('E2E Studio')
    await form.locator('textarea[name="message"]').fill(message)
    await form.getByRole('button', { name: 'Projekt anfragen' }).click()
    await expect(page.locator('.block-form__success')).toContainText('Danke')

    await page.reload()
    await dismissCookieBanner(page)
    const formAgain = page.locator('.block-form__form')
    await formAgain.locator('input[name="firstName"]').fill(name)
    await formAgain.locator('input[name="email"]').fill(email)
    await formAgain.locator('input[name="company"]').fill('E2E Studio')
    await formAgain.locator('textarea[name="message"]').fill(message)
    await formAgain.getByRole('button', { name: 'Projekt anfragen' }).click()
    await expect(page.locator('.block-form__success')).toContainText('bereits')

    await loginToConsole(page)
    await page.goto('/console/leads')
    await expect(page.getByRole('link', { name: email })).toBeVisible()
  })
})
