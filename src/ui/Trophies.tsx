// The trophy shelf (B9b, rules 5.6; docs/content.md section 7): every achievement with its condition, its reward and what has been
// earned; rewards with no system yet (journal pages, collars, landmarks, Overwind, the Scrapper) are listed below it.
import { ACHIEVEMENTS } from '../core/content/achievements';
import { PARTS } from '../core/content/parts';
import { TRINKETS } from '../core/content/trinkets';
import type { AchievementDef } from '../core/defs';
import type { Profile } from '../core/types';
import { TierMark } from './TierMark';

const TIER_LABEL: Record<AchievementDef['tier'], string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/** Counters shown as progress on the feats that count across runs. */
const PROGRESS: Record<string, { key: string; of: number; label: string }> = {
  'e-pet': { key: 'pets', of: 50, label: 'pets' },
  'm-bell3': { key: 'bells3', of: 3, label: 'early bells' },
  'm-salvager': { key: 'partsBroken', of: 100, label: 'parts broken' },
  'm-wrecker': { key: 'wreckWins', of: 25, label: 'wrecking wins' },
};

const REWARD_NOTE = {
  journal: 'A journal page, kept for the archivist.',
  collar: 'Sprocket wears it in Bellfoot.',
  landmark: 'It will change the Spire when Bellfoot opens.',
  chassis: 'It waits at the gate until Bellfoot opens it.',
};

function RewardLine({ a }: { a: AchievementDef }) {
  const r = a.reward;
  return (
    <span class="trophy-reward">
      {(r.parts ?? []).map((id) => (
        <span key={id} class="trophy-item">
          {PARTS[id] && <TierMark rarity={PARTS[id].rarity} />} {PARTS[id]?.name ?? id}
        </span>
      ))}
      {(r.trinkets ?? []).map((id) => (
        <span key={id} class="trophy-item">
          {TRINKETS[id] && <TierMark rarity={TRINKETS[id].rarity} />} {TRINKETS[id]?.name ?? id}
        </span>
      ))}
      {r.journal && <span class="trophy-item">Journal page: {r.journal}</span>}
      {r.collar && <span class="trophy-item">{r.collar}</span>}
      {r.landmark && <span class="trophy-item">Landmark: {r.landmark}</span>}
      {r.chassis && <span class="trophy-item">New chassis: {r.chassis[0].toUpperCase()}{r.chassis.slice(1)}</span>}
      {r.overwind !== undefined && <span class="trophy-item">Overwind {r.overwind}</span>}
    </span>
  );
}

export function Trophies({ p }: { p: Profile }) {
  const earned = ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;
  const available = ACHIEVEMENTS.filter((a) => a.available).length;
  const rw = p.rewards;
  const listed: [string, string, string][] = [
    ...rw.journal.map((x): [string, string, string] => ['Journal page', x, REWARD_NOTE.journal]),
    ...rw.collars.map((x): [string, string, string] => ['Collar', x, REWARD_NOTE.collar]),
    ...rw.landmarks.map((x): [string, string, string] => ['Landmark', x, REWARD_NOTE.landmark]),
    ...rw.chassis.map((x): [string, string, string] => ['Chassis', x[0].toUpperCase() + x.slice(1), REWARD_NOTE.chassis]),
    ...(rw.overwind > 0 ? ([['Overwind', `Level ${rw.overwind}`, 'It opens with Bellfoot.']] as [string, string, string][]) : []),
  ];
  return (
    <div data-testid="trophies" class="trophies">
      <p class="hint" data-testid="trophy-count">
        {earned} of {available} feats earned now. A feat met during a climb counts when the climb ends.
      </p>
      <ul class="trophylist">
        {ACHIEVEMENTS.map((a) => {
          const got = !!p.achievements[a.id];
          const secret = a.hidden && !got;
          const prog = PROGRESS[a.id];
          const n = prog ? Math.min(prog.of, p.achievementProgress[prog.key] ?? 0) : 0;
          return (
            <li key={a.id} class={`trophy ${got ? 'earned' : ''} ${a.available ? '' : 'later'}`} data-testid={`trophy-${a.id}`} data-earned={got ? 'true' : 'false'} data-available={a.available ? 'true' : 'false'}>
              <span class="trophy-head">
                <b>{secret ? 'A hidden feat' : a.name}</b>
                <span class="trophy-tier">{TIER_LABEL[a.tier]}</span>
                {got && <span class="trophy-got">Earned</span>}
              </span>
              <span class="trophy-text">{secret ? 'It shows itself when you earn it.' : a.text}</span>
              {!secret && <RewardLine a={a} />}
              {!a.available && <span class="trophy-later">Opens with Bellfoot</span>}
              {a.available && !got && prog && !secret && (
                <span class="trophy-prog">
                  {n} of {prog.of} {prog.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <h3>Kept for Bellfoot</h3>
      <ul class="trophy-rewards" data-testid="trophy-rewards">
        {listed.length === 0 && <li class="empty">Nothing yet. Collars, journal pages and landmarks you earn are kept here.</li>}
        {listed.map(([kind, name, note]) => (
          <li key={`${kind}${name}`}>
            <b>{name}</b> <span class="trophy-kind">{kind}</span>: {note}
          </li>
        ))}
      </ul>
    </div>
  );
}
