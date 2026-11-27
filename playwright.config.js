import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4321',
    channel: 'chrome',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    // --ignore-lock keeps Astro 7 from moving the server to the background when it detects a coding agent.
    command: 'npm run build && npm run preview -- --ignore-lock',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
