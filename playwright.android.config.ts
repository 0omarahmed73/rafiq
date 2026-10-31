import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'android-shell.spec.ts',
  timeout: 90_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4175',
    locale: 'ar',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npx vite build --mode android && npm run preview -- --port 4175 --strictPort',
    url: 'http://localhost:4175',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
