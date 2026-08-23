import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the PRODUCTION build (vite preview),
 * served at the same /Ordris/ base path used by GitHub Pages.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // The PWA service worker would otherwise cache aggressively between tests
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/Ordris/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
