import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  workers: 2,
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5320' },
  webServer: {
    command: 'npx vite --port 5320 --strictPort',
    port: 5320,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 667, height: 375 }, isMobile: true, hasTouch: true },
    },
  ],
});
