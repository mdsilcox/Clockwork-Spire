import { expect, test } from '@playwright/test';

// Q7: the stage holds 60 fps with a full board while turns replay back to back at 1x.
test('full board holds the frame rate over 5 seconds of turns', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'perf runs in the desktop project only');
  test.slow();
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice fight' }).click();
  await expect(page.getByTestId('combat')).toBeVisible();

  const result = await page.evaluate(async () => {
    const g = (window as unknown as {
      __game: {
        newFight(seed?: number): void;
        setSpeed(s: string): void;
        debugBoard(spec: Record<string, string>): void;
        setEnemyHp(hp: number): void;
        run(): Promise<unknown>;
        state(): { outcome: string; board: unknown[] };
      };
    }).__game;
    const ids = ['spur', 'boiler', 'coil', 'cam', 'pendulum', 'piston', 'escapement', 'idler', 'spur', 'cam', 'boiler', 'coil', 'spur', 'piston'];
    const cells = ['A1', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'E1', 'E2', 'E3'];
    const fill = (): void => {
      g.newFight(3);
      g.setSpeed('1x');
      const spec: Record<string, string> = {};
      cells.forEach((c, i) => (spec[c] = ids[i] + (i % 3 === 0 ? '+' : '')));
      g.debugBoard(spec);
    };
    fill();
    const deltas: number[] = [];
    let last = performance.now();
    let running = true;
    const tick = (t: number): void => {
      deltas.push(t - last);
      last = t;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const end = performance.now() + 5000;
    while (performance.now() < end) {
      if (g.state().outcome !== 'ongoing') fill();
      g.setEnemyHp(9999);
      await g.run();
    }
    running = false;
    const d = deltas.slice(2);
    return { avg: d.reduce((a, b) => a + b, 0) / d.length, max: Math.max(...d), n: d.length };
  });

  const fps = 1000 / result.avg;
  info.annotations.push({ type: 'perf', description: `avg ${fps.toFixed(1)} fps, worst frame ${result.max.toFixed(1)} ms, ${result.n} frames` });
  expect(fps).toBeGreaterThanOrEqual(55);
  expect(result.max).toBeLessThanOrEqual(50);
});
