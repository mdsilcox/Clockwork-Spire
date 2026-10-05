import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { iconsPlugin } from './scripts/icons-plugin.mjs';

export default defineConfig({
  plugins: [
    preact(),
    iconsPlugin(),
    VitePWA({
      // 'prompt' keeps a running fight from reloading under the player; sw-register shows a quiet toast instead.
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Clockwork Spire',
        short_name: 'Spire',
        description: 'A clockwork deckbuilder: climb the spire with brass parts and a corgi.',
        orientation: 'landscape',
        display: 'standalone',
        theme_color: '#1b1410',
        background_color: '#17110c',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,webp}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  server: { port: 5173 },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/pending/**', 'node_modules/**', 'tests/v2/b9-wardens.test.ts'], // B8 gate on main: B9a contract parked
    environment: 'node',
  },
});
