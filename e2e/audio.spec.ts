// The dev server's hot-reload socket (not game code; the game opens no sockets) may log a refused connection under load.
const VITE_HMR_NOISE = /\[vite\]|WebSocket connection to 'ws:/;
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const TRACKS = ['workshop', 'act1', 'act2', 'act3', 'clockmaker', 'ending'];

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !VITE_HMR_NOISE.test(m.text())) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

// The modules are imported by path inside the dev page, so the spec can drive the music API directly.
const MUSIC = ['', 'src', 'audio', 'music.ts'].join('/');
const SYNTH = ['', 'src', 'audio', 'synth.ts'].join('/');

test('with ?sound=1 the audio graph builds and every track plays without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?sound=1');
  const result = await page.evaluate(
    async ([musicPath, synthPath]) => {
      const m = (await import(/* @vite-ignore */ musicPath)) as typeof import('../src/audio/music');
      const s = (await import(/* @vite-ignore */ synthPath)) as typeof import('../src/audio/synth');
      const seen: (string | null)[] = [];
      for (const t of ['workshop', 'act1', 'act2', 'act3', 'clockmaker', 'ending'] as const) {
        m.music.play(t);
        await new Promise((r) => setTimeout(r, 350));
        seen.push(m.audioDebug().track);
      }
      m.music.setIntensity(2);
      await new Promise((r) => setTimeout(r, 300));
      const dbg = m.audioDebug();
      m.music.setVolume('music', 0.3);
      const vol = m.audioDebug().volumes.music;
      m.music.setMuted(true);
      const muted = m.audioDebug().muted;
      m.music.setMuted(false);
      m.music.stop();
      return { seen, status: s.status(), dbg, vol, muted };
    },
    [MUSIC, SYNTH],
  );
  expect(result.seen).toEqual(TRACKS);
  expect(result.status.built).toBe(true);
  expect(result.dbg.muted).toBe(false);
  expect(result.vol).toBeCloseTo(0.3, 5);
  expect(result.muted).toBe(true);
  expect(errors).toEqual([]);
});

test('each loop renders offline without NaN and stays under the limiter', async ({ page }) => {
  test.slow();
  const errors = watchErrors(page);
  await page.goto('/');
  const stats = await page.evaluate(async (musicPath) => {
    const m = (await import(/* @vite-ignore */ musicPath)) as typeof import('../src/audio/music');
    const out: Record<string, { peak: number; rms: number; bad: number }> = {};
    for (const t of m.TRACKS) {
      const levels = t === 'clockmaker' ? [0, 2] : [0];
      for (const k of levels) {
        const d = await m.renderOffline(t, 20, k);
        let peak = 0;
        let sum = 0;
        let bad = 0;
        for (const v of d) {
          if (Number.isNaN(v)) bad++;
          const a = Math.abs(v);
          if (a > peak) peak = a;
          sum += v * v;
        }
        out[`${t}:${k}`] = { peak, rms: Math.sqrt(sum / d.length), bad };
      }
    }
    return out;
  }, MUSIC);
  for (const [name, s] of Object.entries(stats)) {
    expect(s.bad, name).toBe(0);
    expect(s.peak, name).toBeLessThan(0.4); // under the limiter's threshold
    expect(s.rms, name).toBeGreaterThan(0.002); // and audible
  }
  expect(errors).toEqual([]);
});

test('the track follows the screen: Workshop, a fight, the Clockmaker', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('cs.tutorialDone', '1')); // a first launch opens the tutorial fight
  await page.goto('/?sound=1');
  const hooked = await page.evaluate(() => !!(window as unknown as { __game?: { audio?: unknown } }).__game?.audio);
  test.skip(!hooked, 'the UI lane has not registered window.__game.audio yet');
  const track = (): Promise<string | null> => page.evaluate(() => (window as unknown as { __game: { audio: { track: string | null } } }).__game.audio.track);
  expect(await track()).toBe('workshop');
  await page.evaluate(() => (window as unknown as { __game: { practice(o: { enemies: string[] }): void } }).__game.practice({ enemies: ['rust-mite'] }));
  await expect.poll(track).toBe('act1');
  await page.evaluate(() => (window as unknown as { __game: { practice(o: { enemies: string[] }): void } }).__game.practice({ enemies: ['clockmaker'] }));
  await expect.poll(track).toBe('clockmaker');
});
