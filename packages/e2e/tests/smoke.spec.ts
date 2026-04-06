import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const e2eRoot = path.resolve(__dirname, '..')

function loadCredentials(): { email: string; password: string } {
  const raw = readFileSync(path.join(e2eRoot, '.e2e-credentials.json'), 'utf8')
  return JSON.parse(raw) as { email: string; password: string }
}

test.describe('D1 — app shell', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })
})

test.describe('D2 — auth spine', () => {
  test('seeded user logs in and reaches dashboard', async ({ page }) => {
    const { email, password } = loadCredentials()

    // Capture console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/login')
    await page.getByLabel('Email Address').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    try {
      await expect(
        page.getByRole('heading', { name: /Good (morning|afternoon|evening), E2E/i })
      ).toBeVisible({
        timeout: 15_000
      })
    } catch (e) {
      console.log('=== DEBUG: Login failed to navigate ===')
      console.log('Current URL:', page.url())
      console.log('Console errors:', consoleErrors)
      console.log('Page content preview:', await page.content().then(c => c.substring(0, 500)))
      throw e
    }
  })
})
