import { defineConfig } from '@playwright/test'

const port = 4091
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 1200 },
  },
  webServer: {
    command:
      `npm run db:ping && ` +
      `npm run db:custom:migrate && ` +
      `npm run build && ` +
      `npm run seed -- --force && ` +
      `npm run ensure-console-admin -- e2e@company.com E2Epassword123 && ` +
      `PORT=${port} npm run start`,
    url: baseURL,
    timeout: 600_000,
    reuseExistingServer: false,
  },
})
