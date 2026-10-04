/// <reference types="vite-plugin-pwa/client" />
import { registerSW as registerWorker } from 'virtual:pwa-register';

/**
 * Registers the offline service worker (production builds only; the dev server never registers one).
 * `onNeedRefresh` fires when a new version has downloaded; show a quiet "A new version is ready" toast.
 * Returns a function that applies the update and reloads, or null when no worker is registered.
 */
export function registerSW(onNeedRefresh: () => void): (() => void) | null {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return null;
  const update = registerWorker({
    immediate: true,
    onNeedRefresh,
    onRegisterError: () => {},
  });
  return () => void update(true);
}
