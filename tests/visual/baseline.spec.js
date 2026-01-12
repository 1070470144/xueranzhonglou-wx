const { test } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

// Device widths to generate baselines for
const widths = [320, 360, 375, 390, 412]
const height = 800

// Base URL of the running dev server / preview. Set BASE_URL env var to override.
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080'

test.describe('Exhibition page visual baselines', () => {
  test.beforeAll(() => {
    const outDir = path.resolve(process.cwd(), 'tests/visual/baseline-images')
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }
  })

  for (const w of widths) {
    test(`capture exhibition @ ${w}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height })
      // Ensure the dev server is running and the exhibition page is reachable
      const url = `${BASE_URL}/#/pages/exhibition/exhibition`
      await page.goto(url, { waitUntil: 'networkidle' })
      // Wait a short time for images and styles
      await page.waitForTimeout(500)
      // Capture the first script card
      const card = page.locator('.script-card').first()
      if (await card.count() === 0) {
        // fallback to full page screenshot if selector not found
        const outFile = `tests/visual/baseline-images/exhibition-full-${w}.png`
        await page.screenshot({ path: outFile, fullPage: true })
      } else {
        const outFile = `tests/visual/baseline-images/exhibition-card-${w}.png`
        await card.screenshot({ path: outFile })
      }
    })
  }
})


