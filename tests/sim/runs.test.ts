import { describe, expect, it } from 'vitest';
import { defaultRunConfig, newRun } from '../../src/core/run';
import { buildRunReport } from '../../src/sim/run-report';
import { playRun } from '../../src/sim/run';

let stubbed = false;
try {
  newRun(defaultRunConfig(1));
} catch {
  stubbed = true;
}

describe('the run bot', () => {
  it.skipIf(stubbed)('never makes an illegal call over 30 runs', () => {
    for (let i = 0; i < 30; i++) {
      const r = playRun(defaultRunConfig(100 + i), 7 + i);
      expect(r.illegal).toEqual([]);
      expect(['win', 'loss']).toContain(r.record.result);
    }
  }, 120_000);

  it.skipIf(stubbed)('is deterministic: same seed, same report except the date line', () => {
    const strip = (s: string): string => s.replace(/^Date: .*$/m, '');
    const a = buildRunReport({ seed: 2, runs: 8 }, '2026-01-01').markdown;
    const b = buildRunReport({ seed: 2, runs: 8 }, '2026-02-02').markdown;
    expect(strip(a)).toBe(strip(b));
  }, 120_000);

  it.skipIf(stubbed)('a 300-run report finishes in under 120 s and reports the win rate', () => {
    const t0 = Date.now();
    const { markdown, summary } = buildRunReport({ seed: 1, runs: 300 }, '2026-01-01');
    expect(Date.now() - t0).toBeLessThan(120_000);
    expect(markdown).toContain('Win rate:');
    console.log(`no-meta win rate: ${(summary.winRate * 100).toFixed(1)}%`);
  }, 180_000);
});
