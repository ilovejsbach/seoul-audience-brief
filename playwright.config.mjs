import { defineConfig } from '@playwright/test';

const port = Number(process.env.E2E_PORT || 4187);
const evidence = process.env.PLAYWRIGHT_EVIDENCE_DIR || 'docs/workers-2026-11-17/w5-playwright';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  outputDir: `${evidence}/test-results`,
  reporter: [['list'], ['json', { outputFile: `${evidence}/results.json` }]],
  use: {
    browserName: 'chromium',
    baseURL: `http://127.0.0.1:${port}`,
    deviceScaleFactor: 1,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop-1365', use: { viewport: { width: 1365, height: 768 } } },
    { name: 'desktop-1920', use: { viewport: { width: 1920, height: 1080 } } },
    { name: 'tablet-1024', use: { viewport: { width: 1024, height: 768 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } },
  ],
});
