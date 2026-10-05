// B9a (docs/briefs/B9a-wardens.md, "Plan stats" and "Memory"). recordFight is called at every fight end (settleCombat win and
// loss, abandonRun); B9b extends it with the achievement facts, in sequence. The per-turn accumulation lives in combat.ts
// (`accumulatePlan`, from the GameEvent timeline); recordFight moves a fight's totals into the run.
import { enemyDef } from './content/enemies';
import { partDefOf, partState, phasesOf } from './framelib';
import { addScrap } from './rewards';
import type { CombatState, GameEvent, Plan, PlanStats, RunState } from './types';

const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, masterwork: 3, legendary: 4 };

/** B9b: per-fight achievement facts, from the event timeline of each Run (combat.ts `runTurn` calls it after `accumulatePlan`).
 * They live in `combat.flags` (numbers, so a saved fight keeps them) and `recordFight` moves them into the run. Also the Tow
 * Hook: when a core dies, its best standing part is salvaged as if broken (once per combat). */
export function noteFacts(c: CombatState, events: GameEvent[]): void {
  const f = (c.flags ??= {});
  const shatter: Record<number, number> = {};
  for (const ev of events) {
    if (ev.kind === 'partBroken') {
      f.fBroken = (f.fBroken ?? 0) + 1;
      f[`b:${ev.target}:${ev.part}`] = 1;
      if (ev.word === 'drill' && (ev.protectedBy?.length ?? 0) > 0) f.fDrill = 1;
      if (ev.word === 'shatter' && ev.target !== undefined) {
        shatter[ev.target] = (shatter[ev.target] ?? 0) + 1;
        if (shatter[ev.target] >= 3) f.fShatter = 1;
      }
      if (ev.by === 'sprocket') f.fWhistle = (f.fWhistle ?? 0) + 1;
    } else if (ev.kind === 'overpressure') f.fOver = 1;
    else if (ev.kind === 'playerHit') f.fHurt = (f.fHurt ?? 0) + (ev.amount ?? 0);
    else if (ev.kind === 'enemyDied' && ev.target !== undefined) {
      const e = c.enemies[ev.target];
      const standing = e ? e.parts.filter((p) => !p.broken) : [];
      if (standing.length >= 2) f.fWreck = 1;
      if (e && c.trinkets.includes('tow-hook') && !f.towUsed) {
        let best: { id: string; salvage: string; rarity: string } | null = null;
        for (const p of standing) {
          const d = partDefOf(e, p.id);
          if (!d?.salvage) continue;
          if (!best || (RARITY_RANK[d.rarity] ?? 0) > (RARITY_RANK[best.rarity] ?? 0)) best = { id: p.id, salvage: d.salvage, rarity: d.rarity };
        }
        if (best) {
          f.towUsed = 1;
          (partState(e, best.id) as { broken: boolean }).broken = true;
          c.wrecked = Math.max(0, (c.wrecked ?? 0) - 1);
          c.broken.push({ enemy: ev.target, partId: best.id, salvage: best.salvage, rarity: best.rarity as never, locked: false });
        }
      }
      if (e && c.chassis === 'scrapper' && !f.scrapUsed) {
        // the Scrapper: once per combat, one wrecked part's salvage is offered: the highest rarity, ties leftmost (no keys, no armor)
        let best: { id: string; salvage: string; rarity: string } | null = null;
        for (const p of e.parts) {
          if (p.broken) continue;
          const d = partDefOf(e, p.id);
          if (!d?.salvage || d.salvage === 'spire-key') continue;
          if (!best || (RARITY_RANK[d.rarity] ?? 0) > (RARITY_RANK[best.rarity] ?? 0)) best = { id: p.id, salvage: d.salvage, rarity: d.rarity };
        }
        if (best) {
          f.scrapUsed = 1;
          (partState(e, best.id) as { broken: boolean }).broken = true;
          c.wrecked = Math.max(0, (c.wrecked ?? 0) - 1);
          c.broken.push({ enemy: ev.target, partId: best.id, salvage: best.salvage, rarity: best.rarity as never, locked: false, scrapper: true });
        }
      }
    }
  }
}

/** Every part that stood at any point of this enemy's fight (the phases reached, the memory part and the rest). */
function everPartIds(c: CombatState, idx: number): string[] {
  const e = c.enemies[idx];
  const fr = enemyDef(e.defId).frame;
  const ids = new Set<string>(e.parts.map((p) => p.id));
  const phs = fr ? phasesOf(fr, c.overwind) : [];
  if (fr?.phases) for (let i = 0; i <= e.phase && i < phs.length; i++) for (const p of phs[i].parts) ids.add(p.id);
  else for (const p of fr?.parts ?? []) ids.add(p.id);
  return [...ids];
}

function recordFacts(run: RunState, c: CombatState, scald: number): void {
  const f = c.flags ?? {};
  const s = run.stats;
  const broke = f.fBroken ?? 0;
  s.partsBroken = (s.partsBroken ?? 0) + broke;
  if (run.act === 1) s.partsBrokenAct1 = (s.partsBrokenAct1 ?? 0) + broke;
  s.scaldBest = Math.max(s.scaldBest ?? 0, scald);
  if (f.fDrill) s.drillThrough = true;
  if (f.fShatter) s.shatterTriple = true;
  if (f.fOver) s.overpressured = true;
  if (c.outcome === 'won' && c.trinkets.includes('sprockets-whistle') && f.fWhistle) addScrap(run, f.fWhistle); // the Whistle: a part Sprocket breaks drops 1 extra Scrap
  if (c.outcome === 'won' && f.fWreck) s.wreckWins = (s.wreckWins ?? 0) + 1;
  if (c.kind === 'boss' && c.enemies.length > 0) {
    const allBroken = c.enemies.every((_, i) => everPartIds(c, i).every((id) => f[`b:${i}:${id}`]));
    (s.wardenFights ??= []).push({ enemy: c.enemies[0].defId, turns: c.log.length, hpLost: f.fHurt ?? 0, allBroken, won: c.outcome === 'won' });
  }
  for (const k of Object.keys(f)) if (/^(b:|f[A-Z])/.test(k)) delete f[k];
}


export const PLAN_ORDER: Plan[] = ['plating', 'burst', 'pressure', 'statuses'];

/** Add this fight's play style to `run.stats.plan`. Once per fight: the combat's own tally is cleared afterwards. */
export function recordFight(run: RunState, combat: CombatState): void {
  const acc = combat.planAcc;
  recordFacts(run, combat, acc?.statuses ?? 0);
  if (!acc) return;
  const plan: PlanStats = (run.stats.plan ??= { plating: 0, burst: 0, pressure: 0, statuses: 0 });
  for (const k of PLAN_ORDER) plan[k] += acc[k] ?? 0;
  combat.planAcc = undefined;
}

/** The run's main plan: the largest; ties plating, burst, pressure, statuses; all zero gives null. */
export function mainPlan(stats: PlanStats | undefined): Plan | null {
  if (!stats) return null;
  let best: Plan | null = null;
  let bestVal = 0;
  for (const k of PLAN_ORDER) {
    const v = stats[k] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return best;
}

/** The plan the Clockmaker remembers: the most frequent of the last three, a tie to the latest; null with no history. */
export function memoryPlan(history: Plan[] | undefined): Plan | null {
  const last = (history ?? []).slice(-3);
  if (last.length === 0) return null;
  const count = (p: Plan): number => last.filter((x) => x === p).length;
  let best = last[last.length - 1];
  for (let i = last.length - 1; i >= 0; i--) if (count(last[i]) > count(best)) best = last[i];
  return best;
}
