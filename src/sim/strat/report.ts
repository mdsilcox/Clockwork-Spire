// Aggregation and markdown for balance/<date>-v1-strategies.md. Pure functions over task results.
import type { FightSnapshot } from './drive';
import type { FightStats } from './fight';
import type { BotName, RunDigest, RunMode } from './tasks';

export const BOTS: BotName[] = ['greedy', 'turtle', 'burst', 'expert'];
export const BOT_LABEL: Record<BotName, string> = { greedy: 'greedy (v1)', turtle: 'turtle', burst: 'burst', expert: 'expert' };
export const TIERS = ['fight', 'elite', 'boss'] as const;
export const TIER_LABEL: Record<(typeof TIERS)[number], string> = { fight: 'normal', elite: 'elite', boss: 'boss' };
export const BOSS_OF: Record<number, string> = { 1: 'Foreman', 2: 'Boilermaker', 3: 'Clockmaker' };

export interface FightRow {
  bot: BotName;
  snap: FightSnapshot;
  stats: FightStats;
}

export function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number, d = 1): string => `${(x * 100).toFixed(d)}%`;
const f1 = (x: number): string => x.toFixed(1);

/** Evenly spaced sample of up to n items (deterministic). */
export function sampleEven<T>(xs: T[], n: number): T[] {
  if (xs.length <= n) return xs.slice();
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(xs[Math.floor((i * xs.length) / n)]);
  return out;
}

export interface FightCell {
  n: number;
  win: number;
  hpLostMean: number;
  hpLostPctMean: number;
  p10: number;
  p90: number;
  turns: number;
}

export function cellOf(rows: FightRow[]): FightCell {
  const lost = rows.map((r) => r.stats.hpLost);
  return {
    n: rows.length,
    win: rows.length ? rows.filter((r) => r.stats.won).length / rows.length : 0,
    hpLostMean: mean(lost),
    hpLostPctMean: mean(rows.map((r) => r.stats.hpLost / r.snap.maxHp)),
    p10: quantile(lost, 0.1),
    p90: quantile(lost, 0.9),
    turns: mean(rows.map((r) => r.stats.turns)),
  };
}

export function fightTable(rows: FightRow[]): { md: string; flags: string[]; cells: Record<string, FightCell> } {
  const cells: Record<string, FightCell> = {};
  const flags: string[] = [];
  const lines = ['| Act | Tier | Bins | Bot | Win rate | HP lost, mean (% of max) | p10 | p90 | Turns |', '|---|---|---|---|---|---|---|---|---|'];
  for (const act of [1, 2, 3]) {
    for (const tier of TIERS) {
      const here = rows.filter((r) => r.snap.act === act && r.snap.tier === tier);
      if (!here.length) continue;
      const bins = new Set(here.map((r) => `${r.snap.floor}|${r.snap.enemies.join('+')}|${r.snap.bin.length}|${r.snap.hp}|${r.snap.trinkets.join(',')}|${r.snap.bin.map((p) => p.defId).join(',')}`)).size;
      for (const bot of BOTS) {
        const c = cellOf(here.filter((r) => r.bot === bot));
        cells[`${act}|${tier}|${bot}`] = c;
        lines.push(`| ${act} | ${TIER_LABEL[tier]} | ${bins} | ${BOT_LABEL[bot]} | ${pct(c.win, 0)} | ${f1(c.hpLostMean)} (${pct(c.hpLostPctMean, 0)}) | ${f1(c.p10)} | ${f1(c.p90)} | ${f1(c.turns)} |`);
        if ((bot === 'turtle' || bot === 'burst') && c.hpLostPctMean < 0.1) {
          flags.push(`${bot} on act ${act} ${TIER_LABEL[tier]} fights loses only ${pct(c.hpLostPctMean)} of max HP on average (${f1(c.hpLostMean)} HP, win ${pct(c.win, 0)}).`);
        }
      }
    }
  }
  return { md: lines.join('\n'), flags, cells };
}

export function bossTable(rows: FightRow[]): { md: string; flags: string[] } {
  const flags: string[] = [];
  const lines = ['| Boss | Bot | Fights | Win rate | Turns to kill, mean | median | min | Kills in 4 turns or fewer |', '|---|---|---|---|---|---|---|---|'];
  for (const act of [1, 2, 3]) {
    const here = rows.filter((r) => r.snap.act === act && r.snap.tier === 'boss');
    if (!here.length) continue;
    for (const bot of BOTS) {
      const mine = here.filter((r) => r.bot === bot);
      const wins = mine.filter((r) => r.stats.won);
      const turns = wins.map((r) => r.stats.turns);
      const fast = wins.filter((r) => r.stats.turns <= 4).length;
      lines.push(
        `| ${BOSS_OF[act]} | ${BOT_LABEL[bot]} | ${mine.length} | ${pct(mine.length ? wins.length / mine.length : 0, 0)} | ${turns.length ? f1(mean(turns)) : 'n/a'} | ${turns.length ? f1(quantile(turns, 0.5)) : 'n/a'} | ${turns.length ? Math.min(...turns) : 'n/a'} | ${fast} of ${wins.length} wins (${pct(wins.length ? fast / wins.length : 0, 0)}) |`,
      );
      if ((bot === 'turtle' || bot === 'burst') && turns.length && mean(turns) <= 4) {
        flags.push(`${bot} kills the ${BOSS_OF[act]} in ${f1(mean(turns))} turns on average (4 or fewer).`);
      }
    }
  }
  return { md: lines.join('\n'), flags };
}

export function clockmakerPhases(rows: FightRow[]): string {
  const here = rows.filter((r) => r.snap.act === 3 && r.snap.tier === 'boss');
  if (!here.length) return '_No Clockmaker fights._';
  const lines = ['| Bot | Fights | Reached phase 2 | Reached phase 3 | Phase 1 turns | Phase 2 turns | Phase 3 turns (wins) |', '|---|---|---|---|---|---|---|'];
  for (const bot of BOTS) {
    const mine = here.filter((r) => r.bot === bot);
    if (!mine.length) continue;
    const reached = (k: number): number => mine.filter((r) => (r.stats.won ? r.stats.phaseTurns.length : r.stats.phaseTurns.length + 1) >= k).length / mine.length;
    const ph = (k: number): string => {
      const xs = mine.filter((r) => r.stats.phaseTurns.length > k).map((r) => r.stats.phaseTurns[k]);
      return xs.length ? f1(mean(xs)) : 'n/a';
    };
    lines.push(`| ${BOT_LABEL[bot]} | ${mine.length} | ${pct(reached(2), 0)} | ${pct(reached(3), 0)} | ${ph(0)} | ${ph(1)} | ${ph(2)} |`);
  }
  return lines.join('\n');
}

export function platingTable(rows: FightRow[]): string {
  const lines = [
    '| Act | Bot | Fights | Peak Plating, mean | median | p90 | Fights with every attack absorbed 3 turns running |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const act of [1, 2, 3]) {
    for (const bot of BOTS) {
      const mine = rows.filter((r) => r.snap.act === act && r.bot === bot);
      if (!mine.length) continue;
      const peaks = mine.map((r) => r.stats.peakPlating);
      const eligible = mine.filter((r) => r.stats.attackTurns >= 3);
      const hit = eligible.filter((r) => r.stats.absorbStreak >= 3).length;
      lines.push(`| ${act} | ${BOT_LABEL[bot]} | ${mine.length} | ${f1(mean(peaks))} | ${f1(quantile(peaks, 0.5))} | ${f1(quantile(peaks, 0.9))} | ${hit} of ${eligible.length} (${pct(eligible.length ? hit / eligible.length : 0, 0)}) |`);
    }
  }
  return lines.join('\n');
}

export function careerStats(firsts: (number | null)[], maxRuns: number): { median: number; q1: number; q3: number; never: number; mean: number } {
  const xs = firsts.map((f) => f ?? maxRuns + 1);
  return { median: quantile(xs, 0.5), q1: quantile(xs, 0.25), q3: quantile(xs, 0.75), never: firsts.filter((f) => f === null).length, mean: mean(xs) };
}

export interface ModeRow {
  mode: RunMode;
  careers: number;
  firsts: (number | null)[];
  noMeta: RunDigest[];
}

export function modeLabel(m: RunMode): string {
  return m === 'v1' ? 'v1 bot (greedy combat, v1 drafting)' : m === 'expert' ? 'expert (beam + lookahead combat, expert drafting)' : `${m} combat + expert drafting`;
}

export function careerTable(rows: ModeRow[], maxRuns: number): string {
  const lines = ['| Bot | Careers | First win, median | Quartiles | Mean | No win in 30 runs |', '|---|---|---|---|---|---|'];
  for (const r of rows) {
    const s = careerStats(r.firsts, maxRuns);
    lines.push(`| ${modeLabel(r.mode)} | ${r.careers} | ${f1(s.median)} | ${f1(s.q1)} to ${f1(s.q3)} | ${f1(s.mean)} | ${s.never} |`);
  }
  return lines.join('\n');
}

export function noMetaTable(rows: ModeRow[]): string {
  const lines = ['| Bot | Runs | Win rate | Reached act 2 | Reached act 3 |', '|---|---|---|---|---|'];
  for (const r of rows) {
    const n = r.noMeta.length;
    if (!n) continue;
    lines.push(`| ${modeLabel(r.mode)} | ${n} | ${pct(r.noMeta.filter((d) => d.won).length / n)} | ${pct(r.noMeta.filter((d) => d.act >= 2).length / n, 0)} | ${pct(r.noMeta.filter((d) => d.act >= 3).length / n, 0)} |`);
  }
  return lines.join('\n');
}

export function pickTable(digests: RunDigest[], starters: Set<string>): { parts: string; partsNoStarters: string; trinkets: string; wins: number } {
  const wins = digests.filter((d) => d.won);
  const rate = (ds: RunDigest[], get: (d: RunDigest) => string[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const d of ds) for (const id of new Set(get(d))) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  };
  const build = (get: (d: RunDigest) => string[], skip: Set<string>): string => {
    const w = rate(wins, get);
    const all = rate(digests, get);
    const top = [...w.entries()].filter(([id]) => !skip.has(id)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
    const lines = ['| Rank | Id | In winning runs | In all expert runs |', '|---|---|---|---|'];
    top.forEach(([id, n], i) => lines.push(`| ${i + 1} | ${id} | ${pct(n / Math.max(1, wins.length), 0)} | ${pct((all.get(id) ?? 0) / Math.max(1, digests.length), 0)} |`));
    return lines.join('\n');
  };
  return { parts: build((d) => d.parts, new Set()), partsNoStarters: build((d) => d.parts, starters), trinkets: build((d) => d.trinkets, new Set()), wins: wins.length };
}
