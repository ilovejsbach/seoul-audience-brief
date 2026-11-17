import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'dong-sales.spec.mjs', timeout: 120000,
  expect: { timeout: 10000 }, workers: 1, retries: 0,
  outputDir: './playwright-name-results',
  reporter: [['list'], ['json', { outputFile: './playwright-name-results.json' }]],
  use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:4193', viewport: { width: 1365, height: 768 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{name:'pc-1365',use:{viewport:{width:1365,height:768}}},{name:'pc-1920',use:{viewport:{width:1920,height:1080}}}],
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4193 --strictPort', url: 'http://127.0.0.1:4193', reuseExistingServer: false, timeout: 30000 },
});
