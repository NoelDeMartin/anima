import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_FRONTEND_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: {
            headless: !process.env.UI,
            ...devices['Desktop Chrome'],
          },
        },
      ],
  webServer: getWebServer(),
});

function getWebServer() {
  switch (process.env.PLAYWRIGHT_MODE) {
    case 'native':
      return {
        url: 'http://localhost:1191',
        command: 'E2E=true vp run --filter @anima/native dev',
        reuseExistingServer: !process.env.CI,
      };
    case 'external':
      return {
        url: 'http://localhost:3000',
        command: 'vp run -w e2e:serve-pod',
        reuseExistingServer: !process.env.CI,
      };
  }
}
