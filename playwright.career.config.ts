// The long check: autoplay wins a whole career through the real game (npm run test:career).
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PW_PORT ?? 5330);

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'career.spec.ts',
  workers: 1,
  timeout: 20 * 60_000,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
});
