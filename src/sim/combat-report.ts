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
  return list.filter((e) => e.tier !== 'boss' && e.enemies.every((id) => ENEMIES[id]));
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

export function randomBin(rng: RngState, act: number): PartInstance[] {
  const ids = Object.keys(PARTS).filter((id) => !PARTS[id].locked);
  const byRarity: Record<Rarity, string[]> = { common: [], uncommon: [], rare: [] };
  for (const id of ids) byRarity[PARTS[id].rarity].push(id);
  const bin: PartInstance[] = [];
  const add = (defId: string): void => {
    if (PARTS[defId]) bin.push({ uid: bin.length + 1, defId, plus: false });
  };
  for (const id of CHASSIS_TINKER) add(id);
  const extra = 4 + int(rng, 'reward', 7);
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
    const bin = randomBin(rng, act);
    const r = playFight({ seed: o.seed * 7919 + i, bin, enemies: enc.enemies, hp: ACT_HP[act - 1] });
    rows.push({
      enc: `Act ${act}: ${enc.enemies.join(' + ')}`,
      act,
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
export function buildReport(o: FightsOpts, date: string): string {
  const { rows } = runFights(o);
  const n = rows.length;
  const wins = rows.filter((r) => r.won).length;
  const out: string[] = [];
  out.push(`# Fight balance report (seed ${o.seed}, ${n} fights)`);
  out.push('');
  out.push(`Date: ${date}`);
  out.push('');
  out.push(
    'Combat level only: the bot plays single fights with random bins (Tinker start plus 4 to 10 parts by act rarity; HP 50, 65, 80 by act). The impact ratio here is a B2 indicator, not the run-level target.',
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

  const encs = new Map<string, FightRow[]>();
  for (const r of rows) {
    if (!encs.has(r.enc)) encs.set(r.enc, []);
    (encs.get(r.enc) as FightRow[]).push(r);
  }
  const encKeys = [...encs.keys()].sort();
  out.push('## Encounters');
  out.push('');
  out.push('| Encounter | Fights | Win rate | Avg turns | Avg HP left |');
  out.push('|---|---|---|---|---|');
  for (const k of encKeys) {
    const g = encs.get(k) as FightRow[];
    const w = g.filter((r) => r.won).length;
    out.push(
      `| ${k} | ${g.length} | ${pct(w / g.length)} | ${f1(g.reduce((a, r) => a + r.turns, 0) / g.length)} | ${f1(g.reduce((a, r) => a + r.hpLeft, 0) / g.length)} |`,
    );
  }
  out.push('');

  const MIN = 20;
  const partIds = Object.keys(PARTS)
    .filter((id) => !PARTS[id].locked)
    .sort();
  out.push('## Parts');
  out.push('');
  out.push(
    `Impact = win rate with the part divided by win rate without it, compared inside the same encounter and pooled (weight: the smaller group). Parts with fewer than ${MIN} fights on either side show n/a. Output share = the part's damage plus Plating as a share of the machine's total, averaged over fights whose bin has it.`,
  );
  out.push('');
  out.push('| Part | Rarity | In bins | Win with | Win without | Impact | Output share |');
  out.push('|---|---|---|---|---|---|---|');
  const impacts: number[] = [];
  for (const id of partIds) {
    const withRows = rows.filter((r) => r.parts.has(id));
    let wSum = 0;
    let withW = 0;
    let withoutW = 0;
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
    const winWith = ok ? withW / wSum : NaN;
    const winWithout = ok ? withoutW / wSum : NaN;
    const impact = ok && winWithout > 0 ? winWith / winWithout : null;
    if (impact !== null) impacts.push(impact);
    out.push(
      `| ${PARTS[id].name} (${id}) | ${PARTS[id].rarity} | ${withRows.length} | ${ok ? pct(winWith) : 'n/a'} | ${ok ? pct(winWithout) : 'n/a'} | ${impact === null ? 'n/a' : impact.toFixed(2)} | ${shareN ? pct(share / shareN) : 'n/a'} |`,
    );
  }
  out.push('');
  impacts.sort((a, b) => a - b);
  if (impacts.length) {
    const med = impacts[Math.floor(impacts.length / 2)];
    out.push(
      `Median impact: ${med.toFixed(2)}; highest ${impacts[impacts.length - 1].toFixed(2)}; lowest ${impacts[0].toFixed(2)} (${impacts.length} parts measured of ${partIds.length}).`,
    );
    out.push('');
  }
  return out.join('\n');
}
