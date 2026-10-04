import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: { port: 5173 },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/pending/**', 'node_modules/**'],
    environment: 'node',
  },
});
