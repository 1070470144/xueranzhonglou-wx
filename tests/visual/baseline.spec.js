const { test } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

// Device widths to generate baselines for
const widths = [320, 360, 375, 390, 412]
const height = 800

// Platforms to test for cross-platform compatibility
const platforms = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'Android Standard', width: 360, height: 640 },
  { name: 'Android Large', width: 412, height: 732 }
]

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

test.describe('Detail page back button visual baselines', () => {
  test.beforeAll(() => {
    const outDir = path.resolve(process.cwd(), 'tests/visual/baseline-images')
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }
  })

  for (const platform of platforms) {
    test(`capture detail page back button @ ${platform.name}`, async ({ page }) => {
      await page.setViewportSize({ width: platform.width, height: platform.height })
      // Navigate to detail page
      const url = `${BASE_URL}/#/pages/detail/detail`
      await page.goto(url, { waitUntil: 'networkidle' })
      // Wait for page to load
      await page.waitForTimeout(500)
      // Capture the back button specifically
      const backBtn = page.locator('.back-btn')
      if (await backBtn.count() > 0) {
        const outFile = `tests/visual/baseline-images/detail-back-btn-${platform.name.toLowerCase().replace(' ', '-')}.png`
        await backBtn.screenshot({ path: outFile })
      } else {
        // Fallback: capture the header area
        const header = page.locator('.header')
        const outFile = `tests/visual/baseline-images/detail-header-${platform.name.toLowerCase().replace(' ', '-')}-fallback.png`
        await header.screenshot({ path: outFile })
      }
    })
  }
})


