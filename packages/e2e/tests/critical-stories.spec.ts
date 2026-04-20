import { expect, test } from '@playwright/test'

/**
 * Maps to 08-PLAN-08-depth-production-readiness.md §2 (critical user stories).
 * Single flow keeps auth/storage consistent (serial user journey).
 */
test.describe('Critical user stories (plan §2)', () => {
  test('1–3 + 6: signup → onboarding → dashboard → logout/login → create circle → explore', async ({ page }) => {
    test.setTimeout(180_000)

    const password = 'Critical_story_pass_1'
    const email = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@mukwano.test`
    const circleName = `E2E Circle ${Date.now()}`

    // Capture console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 1 — Sign up → onboarding → dashboard
    await page.goto('/signup')
    await page.getByLabel('Full Name').fill('Story User')
    await page.getByLabel('Email Address').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
    
    // Wait a moment and log state if it fails
    try {
      await expect(page.getByText('Step 1 of 2')).toBeVisible({ timeout: 15_000 })
    } catch (e) {
      console.log('=== DEBUG: Signup failed to navigate ===')
      console.log('Current URL:', page.url())
      console.log('Console errors:', consoleErrors)
      console.log('Page content preview:', await page.content().then(c => c.substring(0, 500)))
      throw e
    }
    await page.getByRole('button', { name: 'Next: Choose country' }).click()
    await expect(page.getByText('Step 2 of 2')).toBeVisible()
    await page.getByRole('button', { name: /Let's go/i }).click()
    await expect(page.getByRole('heading', { name: /all set/i })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: 'Go to dashboard' }).click()
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening), Story/i })
    ).toBeVisible({ timeout: 20_000 })

    // 2 — Logout → login (session / refresh path; tokens re-issued on login)
    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await page.getByLabel('Email Address').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening), Story/i })
    ).toBeVisible({ timeout: 20_000 })

    // 3 — Create circle → view detail (creator lands on circle page)
    await page.goto('/circles/new')
    await page.getByLabel('Circle Name').fill(circleName)
    await page.getByLabel('Description').fill('Plan §2 governance flow')
    await page.getByRole('button', { name: /create circle/i }).click()
    await expect(page).toHaveURL(/\/circles\/[0-9a-f-]{36}$/i, { timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 1, name: circleName })).toBeVisible({ timeout: 15_000 })

    // 6 — Explore (catalog + join-request UX surface)
    await page.goto('/explore')
    await expect(page.getByRole('heading', { name: /Join a movement/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Featured circles/i })).toBeVisible()
  })
})
