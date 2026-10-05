/// <reference types="vite-plugin-pwa/client" />
import { registerSW as registerWorker } from 'virtual:pwa-register';

/**
 * Registers the offline service worker (production builds only; the dev server never registers one).
 * `onNeedRefresh` fires when a new version has downloaded; show a quiet "A new version is ready" toast.
 * Returns a function that applies the update and reloads, or null when no worker is registered.
 */
export function registerSW(onNeedRefresh: () => void): (() => void) | null {
  if (!('serviceWorker' in navigator)) return null;
  if (import.meta.env.DEV) {
    // A worker left by an earlier production preview on this origin would keep serving its cached build over the
    // dev server's fresh code; remove it (and reload once if it was controlling this page).
    void navigator.serviceWorker.getRegistrations().then(async (regs) => {
      if (regs.length === 0) return;
      await Promise.all(regs.map((r) => r.unregister()));
      if (navigator.serviceWorker.controller) location.reload();
    });
    return null;
  }
  const update = registerWorker({
    immediate: true,
    onNeedRefresh,
    onRegisterError: () => {},
  });
  return () => void update(true);
}
