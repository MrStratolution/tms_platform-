import { expect, test } from '@playwright/test'

import { loginToConsole, uniqueEmail } from './utils'

test.describe('AI lead copilot', () => {
  test('dashboard and lead detail expose AI follow-up actions', async ({ page, request, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    const email = uniqueEmail('lead-copilot')
    const firstName = `AICopilot${Date.now()}`
    const lastName = 'Lead'
    const company = 'Copilot Studio'
    const phone = '+49 171 5551234'

    const submit = await request.post('/api/forms/submit', {
      data: {
        formType: 'contact',
        language: 'en',
        sourcePageSlug: 'contact',
        lead: {
          firstName,
          lastName,
          email,
          phone,
          company,
        },
        extras: {
          message: 'We need help with launch planning and qualification.',
        },
      },
    })
    expect(submit.ok()).toBeTruthy()

    await loginToConsole(page)
    await page.goto('/console/settings')
    await page.getByLabel('My WhatsApp number').fill('+49 170 9998887')
    await page.getByRole('button', { name: 'Save profile' }).click()
    await expect(page.locator('.tma-console-success')).toContainText('Profile saved.')

    await page.goto('/console')
    await expect(page.getByRole('heading', { level: 2, name: 'Lead copilot' })).toBeVisible()

    const dashboardRow = page.locator('.tma-console-copilot-row').filter({ hasText: firstName }).first()
    await expect(dashboardRow).toBeVisible()
    await expect(dashboardRow).toContainText('needs a focused follow-up')

    await dashboardRow.getByRole('button', { name: 'Copy follow-up' }).click()
    await expect(dashboardRow.getByRole('button', { name: 'Copy follow-up' })).toBeVisible()

    const popupPromise = page.waitForEvent('popup')
    await dashboardRow.getByRole('button', { name: 'Lead WhatsApp' }).click()
    const popup = await popupPromise
    await expect.poll(() => popup.url(), { timeout: 10_000 }).toContain('phone=491715551234')
    await expect.poll(() => popup.url(), { timeout: 10_000 }).toContain('text=')
    await popup.close()

    const ownPopupPromise = page.waitForEvent('popup')
    await dashboardRow.getByRole('button', { name: 'Send to my WhatsApp' }).click()
    const ownPopup = await ownPopupPromise
    await expect.poll(() => ownPopup.url(), { timeout: 10_000 }).toContain('phone=491709998887')
    await expect.poll(() => ownPopup.url(), { timeout: 10_000 }).toContain('Lead')
    await ownPopup.close()

    await dashboardRow.getByRole('link', { name: 'Open lead' }).click()
    await expect(page).toHaveURL(/\/console\/leads\/\d+$/)

    await page.getByRole('button', { name: 'Generate summary' }).click()
    await expect(page.locator('.tma-console-copilot')).toContainText('Recommended next step')

    await page.getByRole('button', { name: 'Apply suggested note' }).click()
    await expect(page.getByLabel('Notes')).toContainText('[AI lead copilot]')

    await page.getByRole('button', { name: 'Copy WhatsApp draft' }).click()
    await expect(page.getByRole('button', { name: 'Copy WhatsApp draft' })).toBeVisible()

    const detailPopupPromise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Send to my WhatsApp' }).click()
    const detailPopup = await detailPopupPromise
    await expect.poll(() => detailPopup.url(), { timeout: 10_000 }).toContain('phone=491709998887')
    await detailPopup.close()

    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.locator('.tma-console-success')).toContainText('Saved.')
  })
})
