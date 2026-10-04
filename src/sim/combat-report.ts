// Combat-level balance report: the bot plays many fights with random bins (docs/rules.md section 7, first half).
// Library code: never reads the clock. The date is passed in.
import { ENEMIES } from '../core/content/enemies';
import { PARTS } from '../core/content/parts';
import { initStreams, int, next } from '../core/rng';
import type { RngState } from '../core/rng';
import type { PartInstance, Rarity } from '../core/types';
import { playFight } from './fight';

export interface Encounter {
  act: 1 | 2 | 3;
  tier: string;
  enemies: string[];
}

/** B1 enemies only: used when src/core/content/encounters.ts does not exist yet. */
const FALLBACK: Encounter[] = [
  { act: 1, tier: 'easy', enemies: ['rust-mite', 'rust-mite'] },
  { act: 1, tier: 'easy', enemies: ['cog-rat'] },
  { act: 1, tier: 'normal', enemies: ['cog-rat', 'rust-mite'] },
  { act: 1, tier: 'normal', enemies: ['rust-mite', 'rust-mite', 'rust-mite'] },
];

/** Reads ENCOUNTERS dynamically; falls back to a built-in list when the module is missing. */
export async function loadEncounters(): Promise<Encounter[]> {
  let list: Encounter[] = FALLBACK;
  try {
    const path = '../core/content/encounters';
    const mod = (await import(/* @vite-ignore */ path)) as { ENCOUNTERS?: Encounter[] };
    if (mod.ENCOUNTERS && mod.ENCOUNTERS.length > 0) list = mod.ENCOUNTERS;
  } catch {
    // module not there yet
  }
  return list.filter((e) => e.enemies.every((id) => ENEMIES[id]));
}

const CHASSIS_TINKER = ['spur', 'spur', 'spur', 'escapement', 'escapement', 'escapement', 'idler', 'coil'];
const ACT_HP = [50, 65, 80];
// Cumulative odds (common, then uncommon) per act, from docs/content.md "Reward rarity by act".
const RARITY_ODDS: Record<number, [number, number]> = { 1: [0.7, 0.95], 2: [0.55, 0.9], 3: [0.45, 0.83] };

function drawRarity(rng: RngState, act: number): Rarity {
  const r = next(rng, 'reward');
  const [c, u] = RARITY_ODDS[act];
  return r < c ? 'common' : r < u ? 'uncommon' : 'rare';
}

export function randomBin(rng: RngState, act: number, boss = false): PartInstance[] {
  const ids = Object.keys(PARTS).filter((id) => !PARTS[id].locked);
  const byRarity: Record<Rarity, string[]> = { common: [], uncommon: [], rare: [] };
  for (const id of ids) byRarity[PARTS[id].rarity].push(id);
  const bin: PartInstance[] = [];
  const add = (defId: string): void => {
    if (PARTS[defId]) bin.push({ uid: bin.length + 1, defId, plus: false });
  };
  for (const id of CHASSIS_TINKER) add(id);
  const extra = boss ? 8 + int(rng, 'reward', 5) : 4 + int(rng, 'reward', 7);
  for (let i = 0; i < extra; i++) {
    let pool = byRarity[drawRarity(rng, act)];
    if (pool.length === 0) pool = ids;
    add(pool[int(rng, 'reward', pool.length)]);
  }
  return bin;
}

interface FightRow {
  enc: string;
  act: number;
  tier: string;
  hpLost: number;
  won: boolean;
  turns: number;
  hpLeft: number;
  biggestTurn: number;
  parts: Set<string>;
  output: Record<string, number>;
}

export interface FightsOpts {
  seed: number;
  fights: number;
  encounters: Encounter[];
}

const f1 = (x: number): string => x.toFixed(1);
const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

export function runFights(o: FightsOpts): { rows: FightRow[] } {
  const byAct: Record<number, Encounter[]> = { 1: [], 2: [], 3: [] };
  for (const e of o.encounters) byAct[e.act].push(e);
  const acts = [1, 2, 3].filter((a) => byAct[a].length > 0);
  const rows: FightRow[] = [];
  for (let i = 0; i < o.fights; i++) {
    const act = acts[i % acts.length];
    const rng = initStreams(o.seed * 1000003 + i);
    const enc = byAct[act][int(rng, 'map', byAct[act].length)];
    const bin = randomBin(rng, act, enc.tier === 'boss');
    const r = playFight({ seed: o.seed * 7919 + i, bin, enemies: enc.enemies, hp: ACT_HP[act - 1] });
    rows.push({
      enc: `Act ${act} ${enc.tier === 'boss' ? 'boss' : enc.tier === 'elite' ? 'elite' : 'normal'}: ${enc.enemies.join(' + ')}`,
      act,
      tier: enc.tier === 'boss' ? 'boss' : enc.tier === 'elite' ? 'elite' : 'normal',
      hpLost: ACT_HP[act - 1] - r.hpLeft,
      won: r.won,
      turns: r.turns,
      hpLeft: r.hpLeft,
      biggestTurn: r.biggestTurn,
      parts: new Set(bin.map((p) => p.defId)),
      output: r.output,
    });
  }
  return { rows };
}

/** Markdown report. Byte-identical for the same inputs except the date line. */
export interface Summary {
  seed: number;
  fights: number;
  winRate: number;
  tiers: Record<string, { fights: number; winRate: number; avgHpLost: number; p90HpLost: number; avgTurns: number }>;
  encounters: Record<string, { fights: number; winRate: number; avgHpLost: number; p90HpLost: number; avgTurns: number }>;
  parts: Record<string, { inBins: number; winWith: number | null; winWithout: number | null; impact: number | null; hpLostWith: number | null; hpLostWithout: number | null; defenseImpact: number | null; outputShare: number | null }>;
  medianDefenseImpact: number | null;
  flagged: string[];
}

const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function p90(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(0.9 * s.length))];
}
const stat = (g: FightRow[]) => ({
  fights: g.length,
  winRate: g.filter((r) => r.won).length / Math.max(1, g.length),
  avgHpLost: avg(g.map((r) => r.hpLost)),
  p90HpLost: p90(g.map((r) => r.hpLost)),
  avgTurns: avg(g.map((r) => r.turns)),
});

export function buildReport(o: FightsOpts, date: string): string {
  return buildReportWithSummary(o, date).markdown;
}

export function buildReportWithSummary(o: FightsOpts, date: string): { markdown: string; summary: Summary } {
  const { rows } = runFights(o);
  const summary: Summary = { seed: o.seed, fights: rows.length, winRate: 0, tiers: {}, encounters: {}, parts: {}, medianDefenseImpact: null, flagged: [] };
  const n = rows.length;
  const wins = rows.filter((r) => r.won).length;
  const out: string[] = [];
  out.push(`# Fight balance report (seed ${o.seed}, ${n} fights)`);
  out.push('');
  out.push(`Date: ${date}`);
  out.push('');
  out.push(
    'Combat level only: the bot plays single fights with random bins (Tinker start plus 4 to 10 parts by act rarity, 8 to 12 for bosses; HP 50, 65, 80 by act). The impact ratio here is a B2 indicator, not the run-level target.',
  );
  out.push('');
  out.push('## Overall');
  out.push('');
  out.push(`- Win rate: ${pct(wins / n)} (${wins} of ${n})`);
  out.push(`- Average turns: ${f1(rows.reduce((a, r) => a + r.turns, 0) / n)}`);
  out.push(`- Average HP left in wins: ${f1(rows.filter((r) => r.won).reduce((a, r) => a + r.hpLeft, 0) / Math.max(1, wins))}`);
  out.push(`- Average biggest turn: ${f1(rows.reduce((a, r) => a + r.biggestTurn, 0) / n)}`);
  for (const act of [1, 2, 3]) {
    const a = rows.filter((r) => r.act === act);
    if (a.length) out.push(`- Act ${act} win rate: ${pct(a.filter((r) => r.won).length / a.length)} (${a.length} fights)`);
  }
  out.push('');


  summary.winRate = wins / n;
  out.push('## Tiers');
  out.push('');
  out.push('| Act and tier | Fights | Win rate | Avg HP lost | p90 HP lost | Avg turns |');
  out.push('|---|---|---|---|---|---|');
  for (const act of [1, 2, 3]) {
    for (const tier of ['normal', 'elite', 'boss']) {
      const g = rows.filter((r) => r.act === act && r.tier === tier);
      if (!g.length) continue;
      const s = stat(g);
      summary.tiers[`act${act}-${tier}`] = s;
      out.push(`| Act ${act} ${tier} | ${s.fights} | ${pct(s.winRate)} | ${f1(s.avgHpLost)} | ${f1(s.p90HpLost)} | ${f1(s.avgTurns)} |`);
    }
  }
  out.push('');

  const encs = new Map<string, FightRow[]>();
  for (const r of rows) {
    if (!encs.has(r.enc)) encs.set(r.enc, []);
    (encs.get(r.enc) as FightRow[]).push(r);
  }
  const encKeys = [...encs.keys()].sort();
  out.push('## Encounters');
  out.push('');
  out.push('| Encounter | Fights | Win rate | Avg HP lost | p90 HP lost | Avg turns |');
  out.push('|---|---|---|---|---|---|');
  for (const k of encKeys) {
    const s = stat(encs.get(k) as FightRow[]);
    summary.encounters[k] = s;
    out.push(`| ${k} | ${s.fights} | ${pct(s.winRate)} | ${f1(s.avgHpLost)} | ${f1(s.p90HpLost)} | ${f1(s.avgTurns)} |`);
  }
  out.push('');

  const MIN = 20;
  const partIds = Object.keys(PARTS)
    .filter((id) => !PARTS[id].locked)
    .sort();
  type PR = { id: string; line: string; di: number | null };
  const prs: PR[] = [];
  for (const id of partIds) {
    const withRows = rows.filter((r) => r.parts.has(id));
    let wSum = 0;
    let withW = 0;
    let withoutW = 0;
    let hpWith = 0;
    let hpWithout = 0;
    let nWith = 0;
    let nWithout = 0;
    for (const k of encKeys) {
      const g = encs.get(k) as FightRow[];
      const a = g.filter((r) => r.parts.has(id));
      const b = g.filter((r) => !r.parts.has(id));
      nWith += a.length;
      nWithout += b.length;
      if (a.length === 0 || b.length === 0) continue;
      const w = Math.min(a.length, b.length);
      wSum += w;
      withW += w * (a.filter((r) => r.won).length / a.length);
      withoutW += w * (b.filter((r) => r.won).length / b.length);
      hpWith += w * avg(a.map((r) => r.hpLost));
      hpWithout += w * avg(b.map((r) => r.hpLost));
    }
    let share = 0;
    let shareN = 0;
    for (const r of withRows) {
      const tot = Object.values(r.output).reduce((a, b) => a + b, 0);
      if (tot > 0) {
        share += (r.output[id] ?? 0) / tot;
        shareN += 1;
      }
    }
    const ok = nWith >= MIN && nWithout >= MIN && wSum > 0;
    const winWith = ok ? withW / wSum : null;
    const winWithout = ok ? withoutW / wSum : null;
    const impact = winWith !== null && winWithout !== null && winWithout > 0 ? winWith / winWithout : null;
    const hw = ok ? hpWith / wSum : null;
    const hwo = ok ? hpWithout / wSum : null;
    const di = hw !== null && hwo !== null && hw > 0 ? hwo / hw : null;
    const outShare = shareN ? share / shareN : null;
    summary.parts[id] = { inBins: withRows.length, winWith, winWithout, impact, hpLostWith: hw, hpLostWithout: hwo, defenseImpact: di, outputShare: outShare };
    const fx = (x: number | null, fn: (v: number) => string): string => (x === null ? 'n/a' : fn(x));
    prs.push({
      id,
      di,
      line: `| ${PARTS[id].name} (${id}) | ${PARTS[id].rarity} | ${withRows.length} | ${fx(winWith, pct)} | ${fx(winWithout, pct)} | ${fx(impact, (v) => v.toFixed(2))} | ${fx(hw, f1)} | ${fx(hwo, f1)} | ${fx(di, (v) => v.toFixed(2))} | ${fx(outShare, pct)} |`,
    });
  }
  prs.sort((a, b) => (b.di ?? -1) - (a.di ?? -1) || a.id.localeCompare(b.id));
  const dis = prs.map((r) => r.di).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const med = dis.length ? dis[Math.floor(dis.length / 2)] : null;
  summary.medianDefenseImpact = med;
  summary.flagged = med === null ? [] : prs.filter((r) => r.di !== null && r.di > 2 * med).map((r) => r.id);

  out.push('## Parts');
  out.push('');
  out.push(
    `Sorted by defense impact = average HP lost without the part divided by HP lost with it (above 1 means the part saves HP), compared inside the same encounter and pooled (weight: the smaller group). Win impact = win rate with divided by without. Parts with fewer than ${MIN} fights on either side show n/a. Output share = the part's damage plus Plating as a share of the machine's total, averaged over fights whose bin has it.`,
  );
  out.push('');
  out.push('| Part | Rarity | In bins | Win with | Win without | Win impact | HP lost with | HP lost without | Defense impact | Output share |');
  out.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of prs) out.push(r.line);
  out.push('');
  if (dis.length && med !== null) {
    out.push(`Defense impact: median ${med.toFixed(2)}, max ${dis[dis.length - 1].toFixed(2)}, min ${dis[0].toFixed(2)} (${dis.length} parts measured of ${partIds.length}).`);
    out.push('');
    out.push(summary.flagged.length ? `Flagged above 2x the median (${(2 * med).toFixed(2)}): ${summary.flagged.join(', ')}.` : 'No part is above 2x the median.');
    out.push('');
  }
  return { markdown: out.join('\n'), summary };
}
