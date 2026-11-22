import { defineConfig, devices } from '@playwright/test';

// E2E runs against the real production build served by `vite preview`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    // Same base path as the GitHub Pages build (vite.config.ts).
    baseURL: 'http://localhost:4173/StudySync/',
    trace: 'retain-on-failure',
    timezoneId: 'Asia/Kolkata',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/StudySync/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
