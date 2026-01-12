const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests/visual',
  timeout: 60_000,
  use: {
    headless: true,
    viewport: { width: 375, height: 800 },
    actionTimeout: 10_000,
    ignoreHTTPSErrors: true
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
})


