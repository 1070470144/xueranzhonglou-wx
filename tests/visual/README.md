# visual regression baselines

This folder contains Playwright-based visual baseline captures for the Exhibition page.

How to run
1. Start the dev server (HBuilderX preview or your local dev server). Ensure the app is accessible at `http://localhost:8080` or set the `BASE_URL` environment variable.
2. Install Playwright if not installed:

```bash
npm install -D @playwright/test
npx playwright install
```

3. Run the baseline capture:

```bash
npx playwright test tests/visual/baseline.spec.js --project=chromium
```

4. Baseline images will be written to `tests/visual/baseline-images/`.

Notes
- The test attempts to load the exhibition page via a hash route: `#/pages/exhibition/exhibition`. If your dev server routing differs, set `BASE_URL` accordingly, e.g.:

```bash
BASE_URL=http://localhost:8081 npx playwright test tests/visual/baseline.spec.js
```
