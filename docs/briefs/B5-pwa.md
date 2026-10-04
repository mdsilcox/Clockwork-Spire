# Brief: B5 lane `pwa`

Read `CLAUDE.md`, SPEC.md section 1 (installable offline web app), `docs/acceptance.md` rows Q6, P4, A1, and `vite.config.ts`, `package.json`, `index.html`.

## Goal
The game installs as an offline web app: a manifest, a service worker that precaches everything, icons generated in code at build time, and a test proving it plays with the network off.

## You own
`vite.config.ts`, `package.json` (add `vite-plugin-pwa` and scripts only), `scripts/**` (new), `public/manifest` pieces if the plugin needs them (no image files committed: see A1), `e2e/offline.spec.ts` (new), `tests/build/**` (new). Not `src/**` except a new `src/app/sw-register.ts` that `src/main.tsx` will import (tell the orchestrator the one import line to add; don't edit main.tsx).

## Build
1. **Icons in code:** `scripts/icons.mjs` draws the app icon (a brass gear with a clock face and a tiny corgi ear silhouette on a dark lamplit background, maskable safe zone) with a pure-JS rasterizer (draw to an RGBA buffer with simple shape fills and anti-aliasing) and writes PNGs (192, 512, maskable 512, apple-touch 180, favicon 32) into the build output only (for example a Vite plugin hook writing into `dist/` and a dev middleware serving them), never into `src/` or `public/`, so A1 stays green. A unit test checks the generator returns valid PNG bytes of the right sizes.
2. **Manifest and service worker** via `vite-plugin-pwa` (check its current API with Context7 for Vite 8; if it is incompatible with Vite 8, write a small service worker by hand that precaches the build manifest and serves cache-first, and log why): name "Clockwork Spire", short name "Spire", landscape orientation, theme and background colors from the palette, display standalone, icons above, `autoUpdate` with a quiet "A new version is ready" toast via `src/app/sw-register.ts` (export `registerSW(onNeedRefresh)`).
3. **Offline test (Q6, P4):** `e2e/offline.spec.ts` runs against `vite preview` of a production build (its own Playwright project or a separate config `playwright.offline.config.ts` with `webServer: npm run build && npx vite preview --port 5432`): load once, wait for the service worker to control the page, set the context offline, reload, start a practice fight and run a turn. Also assert the manifest is linked and parses, and the icons respond 200.
4. **Scripts:** `npm run build` stays `tsc --noEmit && vite build`; add `test:offline` and include it in `npm test` after the e2e suite.

## Assumptions and decisions
- No image files in `src/` or `public/` (A1). Generated icons live only in build output.
- The dev server must not register a service worker (it would cache stale modules during development and tests).
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore.

## Done when
`npm run build` succeeds; the offline spec passes; unit tests green. Report per template with the one import line for main.tsx.
