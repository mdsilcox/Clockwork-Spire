import { defineConfig, devices } from '@playwright/test';

const PORT = 5432;

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'offline.spec.ts',
  workers: 1,
  timeout: 90_000,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, serviceWorkers: 'allow' },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [{ name: 'offline', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
});
