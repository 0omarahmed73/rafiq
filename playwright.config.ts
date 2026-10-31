import { defineConfig, devices } from '@playwright/test';

// The end-to-end run uses the production build behind `vite preview`, as the PWA is served in real life.
export default defineConfig({
  testDir: 'e2e',
  testIgnore: 'android-shell.spec.ts',
  timeout: 90_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'ar',
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 5'], channel: 'chrome' } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
