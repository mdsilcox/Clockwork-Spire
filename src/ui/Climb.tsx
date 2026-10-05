// The climb (B8): the act screen (a cut-away of the act's section), and the room screens (workbench, trader, locked door, oil).
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  benchFuse,
  benchFusePick,
  benchRemove,
  benchUpgrade,
  cancelDoor,
  doorPrompt,
  lastRestHeal,
  fuseOffer,
  leaveRoom,
  moveRoom,
  oilPolish,
  oilRest,
  pickLock,
  ringBell,
  runView,
  tradeCost,
  traderBuy,
  useKey,
  walk,
} from '../app/controller';
import { enemyDef } from '../core/content/enemies';
import { partDef, partName, partText } from '../core/content/parts';
import { trinketDef } from '../core/content/trinkets';
import { removeCost, UPGRADE_SCRAP } from '../core/rooms';
import { scrapOf } from '../core/rewards';
import { BELL_BRASS_PER_HOUR, BELL_SCRAP_PER_HOUR, LOCK_PICK_SCRAP } from '../core/section';
import type { PartInstance, Room, RoomKind, RunState } from '../core/types';
import { unlockAudio } from '../audio/synth';
import { FAMILY_COLOR, FAMILY_LABEL } from '../render/palette';
import { ACT_TITLE, ActCard, RunBar } from './Map';
import { PartCard } from './PartCard';
import { NodeIcon, TrinketIcon } from './runicons';
import { useTip } from './useTip';
import './climb.css';

// ---------- names and hints ----------

const ROOM_NAME: Record<RoomKind | 'unknown', string> = {
  entry: 'The way in',
  fight: 'A fight',
  workbench: 'Workbench',
  oil: 'Oil station',
  trader: 'Trader',
  event: 'A stranger or a place',
  vault: 'A vault',
  door: "The warden's door",
  unknown: 'An unknown room',
};

const ROOM_HINT: Record<RoomKind | 'unknown', string> = {
  entry: 'Safe. Where the climb begins.',
  fight: 'A fight. Pays Scrap and a part.',
  workbench: 'Upgrade a part, remove one, or fuse two into something better.',
  oil: 'Rest (an extra hour) or polish.',
  trader: 'Swap a part and some Scrap for something new.',
  event: 'A short story with choices.',
  vault: 'Locked, and guarded. A Masterwork part inside.',
  door: 'Ring the bell here to skip the rest of the night.',
  unknown: 'You have not been near enough to see inside.',
};

// ---------- geometry ----------

const X0 = 9;
const X1 = 97;

interface Pos {
  x: number;
  y: number;
}

/** Percent positions of every room: floors stacked bottom to top, each floor's rooms spread (and centered) left to right. */
function layout(rooms: Room[]): { pos: Map<string, Pos>; floors: number } {
  const floors = Math.max(0, ...rooms.map((r) => r.floor)) + 1;
  const byFloor: Room[][] = Array.from({ length: floors }, () => []);
  for (const r of rooms) byFloor[r.floor]?.push(r);
  const cols = Math.max(3, ...byFloor.map((f) => f.length));
  const pos = new Map<string, Pos>();
  byFloor.forEach((fl, f) => {
    fl.sort((a, b) => a.slot - b.slot);
    const off = (cols - fl.length) / 2;
    fl.forEach((r, i) => {
      pos.set(r.id, { x: X0 + ((i + 0.5 + off) / cols) * (X1 - X0), y: ((floors - 1 - f + 0.5) / floors) * 100 });
    });
  });
  return { pos, floors };
}

/** Room ids joined to the player's room by an unlocked passage (the core's connectedRooms rule, for display). */
function reachable(run: RunState, locked: boolean): string[] {
  const s = run.section;
  if (!s || !run.roomId) return [];
  const out: string[] = [];
  for (const p of s.passages) {
    if (!!p.locked !== locked) continue;
    if (p.a === run.roomId) out.push(p.b);
    else if (p.b === run.roomId) out.push(p.a);
  }
  return out;
}

// ---------- small drawings ----------

const S = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;

function RoomGlyph({ kind }: { kind: RoomKind | 'unknown' }) {
  switch (kind) {
    case 'workbench':
      return (
        <svg class="nicon" width="32" height="32" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
          <path class="nframe" d="M10 4 H30 L37 20 L30 36 H10 L3 20 Z" />
          <g {...S}>
            <path d="M10 17 H28 C28 21 25 23 22 23 V26 H26 V29 H13 V26 H17 V23 C13 23 11 21 10 17 Z" />
            <path d="M24 9 L30 13" />
          </g>
        </svg>
      );
    case 'trader':
      return <NodeIcon type="shop" size={30} />;
    case 'fight':
      return (
        <svg class="nicon" width="32" height="32" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
          <path class="nframe" d="M5 5 H35 V22 C35 30 27 35 20 38 C13 35 5 30 5 22 Z" />
          <g {...S}>
            <path d="M12 12 L28 28 M28 12 L12 28 M10 14 L14 10 M26 30 L30 26 M30 14 L26 10 M14 30 L10 26" />
          </g>
        </svg>
      );
    case 'oil':
      return <NodeIcon type="oil" size={30} />;
    case 'event':
      return <NodeIcon type="event" size={30} />;
    case 'door':
      return <NodeIcon type="boss" size={34} />;
    case 'vault':
      return (
        <svg class="nicon" width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
          <rect class="nframe" x="4" y="6" width="32" height="28" rx="5" />
          <g {...S}>
            <circle cx="20" cy="20" r="6" />
            <path d="M20 14 V17 M20 23 V26 M14 20 H17 M23 20 H26" />
          </g>
        </svg>
      );
    case 'entry':
      return (
        <svg class="nicon" width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
          <path class="nframe" d="M6 36 V16 C6 6 34 6 34 16 V36 Z" />
          <g {...S}>
            <path d="M15 36 V22 C15 17 25 17 25 22 V36" />
          </g>
        </svg>
      );
    default:
      return (
        <svg class="nicon" width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
          <path class="nframe" d="M5 34 V16 L12 8 H28 L35 16 V34 Z" />
          <g {...S} opacity="0.55">
            <path d="M15 17 C15 11 25 11 25 17 C25 21 20 21 20 26 M20 31 V31.5" />
          </g>
        </svg>
      );
  }
}

/** The tinker, drawn in code: round head, goggles, a wrench. (The painted rig replaces this later.) */
function TinkerFigure() {
  return (
    <svg viewBox="0 0 28 34" width="26" height="32" aria-hidden="true">
      <circle cx="14" cy="9" r="6.5" fill="#e3b88a" stroke="#4b3322" stroke-width="1.5" />
      <path d="M7.5 7 C8 2 20 2 20.5 7 Z" fill="#8a6a2a" stroke="#4b3322" stroke-width="1.5" />
      <circle cx="11" cy="9" r="2" fill="#2a2018" stroke="#d1a64a" stroke-width="1" />
      <circle cx="17" cy="9" r="2" fill="#2a2018" stroke="#d1a64a" stroke-width="1" />
      <path d="M8 17 H20 L21 29 H7 Z" fill="#6b4d2e" stroke="#4b3322" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M7 31 H12 M16 31 H21" stroke="#4b3322" stroke-width="2.5" stroke-linecap="round" />
      <path d="M22 18 L26 26" stroke="#d1a64a" stroke-width="2.4" stroke-linecap="round" />
    </svg>
  );
}

/** Sprocket the corgi, drawn in code: a low loaf with big ears. */
function SprocketFigure() {
  return (
    <svg viewBox="0 0 34 24" width="32" height="22" aria-hidden="true">
      <ellipse cx="15" cy="15" rx="11" ry="6" fill="#d98a3d" stroke="#5a3514" stroke-width="1.4" />
      <path d="M8 15 Q15 20 25 15 L24 19 H9 Z" fill="#f4e3c4" />
      <circle cx="26" cy="10" r="5.5" fill="#d98a3d" stroke="#5a3514" stroke-width="1.4" />
      <path d="M23 6 L22 1 L27 4 Z M28 5 L31 1 L32 7 Z" fill="#d98a3d" stroke="#5a3514" stroke-width="1.2" stroke-linejoin="round" />
      <circle cx="27.5" cy="9.5" r="0.9" fill="#2a1a0c" />
      <circle cx="30.5" cy="11.5" r="1.1" fill="#2a1a0c" />
      <path d="M5 13 Q2 11 3 8" stroke="#5a3514" stroke-width="1.6" fill="none" stroke-linecap="round" />
      <path d="M10 20 V23 M20 20 V23" stroke="#5a3514" stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}

function EliteBadge() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#3a1c12" stroke="#e8905a" stroke-width="2" />
      <g stroke="#e8905a" stroke-width="2" stroke-linecap="round" fill="none">
        <path d="M7 7 L9.5 10 M17 7 L14.5 10" />
        <circle cx="12" cy="14" r="3" />
      </g>
    </svg>
  );
}

// ---------- the act screen ----------

const kindOf = (r: Room): RoomKind | 'unknown' => (r.revealed || r.visited ? r.kind : 'unknown');

function eliteName(id: string): string {
  try {
    return enemyDef(id).name;
  } catch {
    return 'An elite';
  }
}

/** Arrow keys move the focus to the nearest room that way; Enter (a button's own click) walks. */
function arrowNav(e: KeyboardEvent, pos: Map<string, Pos>, hereId: string | undefined, root: HTMLElement | null): void {
  const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const d = dirs[e.key];
  if (!d || !root) return;
  const active = (document.activeElement as HTMLElement | null)?.getAttribute?.('data-room-id');
  const fromId = active && pos.has(active) ? active : hereId;
  const from = pos.get(fromId ?? '');
  if (!from) return;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const [id, p] of pos) {
    const dx = (p.x - from.x) * 5;
    const dy = (p.y - from.y) * 3;
    const along = dx * d[0] + dy * d[1];
    if (along <= 0.5) continue;
    const across = Math.abs(dx * d[1]) + Math.abs(dy * d[0]);
    const score = along + across * 1.6;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }
  e.preventDefault();
  const target = best ?? fromId;
  root.querySelector<HTMLElement>(`[data-room-id="${target}"]`)?.focus();
}

export function ActScreen() {
  const run = runView.value;
  const tip = useTip();
  const boardRef = useRef<HTMLDivElement>(null);
  const w = walk.value;
  const [arrived, setArrived] = useState(false);
  const [bellSure, setBellSure] = useState(false);
  useEffect(() => {
    setArrived(false);
    if (!w) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setArrived(true)));
    return () => cancelAnimationFrame(id);
  }, [w]);
  const lay = useMemo(() => (run?.section ? layout(run.section.rooms) : null), [run?.section?.rooms.length, run?.section?.act]);
  if (!run || !run.section || !lay) return null;
  const s = run.section;
  const hour = run.hour ?? 0;
  const hours = run.hours ?? 12;
  const left = Math.max(0, hours - hour);
  const near = reachable(run, false);
  const lockedNear = reachable(run, true);
  const hereId = run.roomId ?? s.entry;
  const heading = w ? w.to : hereId;
  const walkerAt = w && !arrived ? w.from : heading;
  const wp = lay.pos.get(walkerAt) ?? { x: 50, y: 50 };
  const atDoor = hereId === s.door && run.phase === 'section';
  const bellScrap = left * BELL_SCRAP_PER_HOUR;
  const bellBrass = left * BELL_BRASS_PER_HOUR;
  const prepared = Math.min(2, Math.floor(left / 3));
  const elites = (run.elites ?? []).map((e, i) => ({ e, i })).filter((x) => !x.e.defeated);

  const roomInfo = (r: Room) => () => {
    const k = kindOf(r);
    const state =
      r.id === hereId ? 'You are here.' : near.includes(r.id) ? 'Tap to walk here: 1 hour.' : lockedNear.includes(r.id) ? 'Behind a locked door. Tap to see your choices.' : r.cleared ? 'Cleared.' : '';
    return { title: `${ROOM_NAME[k]}.`, text: ROOM_HINT[k], detail: `Floor ${r.floor + 1}. ${state}`.trim() };
  };

  return (
    <main class="actscreen" data-testid="act-screen" onKeyDown={(e) => arrowNav(e as unknown as KeyboardEvent, lay.pos, hereId, boardRef.current)}>
      <RunBar run={run} />
      <div class="actbody">
        <aside class="actside" data-testid="act-side">
          <div class="clockface" aria-label="The Spire clock">
            <b class="clocktext" data-testid="clock">
              Hour {hour} of {hours}
            </b>
            <span class="hoursleft" data-testid="hours-left">
              {left === 1 ? '1 hour left' : `${left} hours left`}
            </span>
            <span class="ticks" aria-hidden="true">
              {Array.from({ length: hours }, (_, i) => (
                <i key={i} class={i < hour ? 'spent' : ''} />
              ))}
            </span>
            {left <= 1 && left > 0 && <span class="late">Midnight comes after your next move.</span>}
          </div>
          {elites.length > 0 && (
            <ul class="elitelist" data-testid="elite-list">
              {elites.map(({ e, i }) => {
                const at = s.rooms.find((r) => r.id === e.patrol[e.at]);
                const nx = s.rooms.find((r) => r.id === e.patrol[(e.at + 1) % e.patrol.length]);
                return (
                  <li key={i} data-testid={`elite-info-${i}`}>
                    <EliteBadge />
                    <span>
                      <b>{eliteName(e.defId)}</b>
                      <span class="sub">
                        On floor {(at?.floor ?? 0) + 1}. Next hour it moves to the ringed room{nx && nx.floor !== at?.floor ? ` on floor ${nx.floor + 1}` : ''}.
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {atDoor && (
            <div class="bellbox">
              <button class="primary bellbtn" data-testid="bell" aria-expanded={bellSure} onClick={() => setBellSure(!bellSure)}>
                <b>Ring the bell</b>
                <span>
                  {bellScrap} Scrap, {bellBrass} Brass{prepared > 0 ? `, Prepared +${prepared}` : ''}
                </span>
              </button>
              {prepared > 0 && <span class="acthint">Prepared +{prepared}: {prepared} extra {prepared === 1 ? 'placement' : 'placements'} on your first turn against the warden.</span>}
              {bellSure && (
                <div class="dooroverlay" data-testid="bell-sure" role="dialog" aria-label="Ring the bell?">
                 <section class="forgebox doorbox">
                  <p class="evline">This starts the warden fight now. Your {left} spare {left === 1 ? 'hour' : 'hours'} pay out.</p>
                  <button
                    class="primary"
                    data-testid="bell-confirm"
                    onClick={() => {
                      unlockAudio();
                      setBellSure(false);
                      ringBell();
                    }}
                  >
                    Yes, ring it
                  </button>
                  <button class="secondary" data-testid="bell-cancel" onClick={() => setBellSure(false)}>
                    Not yet
                  </button>
                 </section>
                </div>
              )}
            </div>
          )}
          {!atDoor && hour === 0 && <p class="acthint">Tap a lit room to walk there. Each step takes an hour.</p>}
        </aside>
        <div class="actboard" ref={boardRef} data-testid="act-section" style={{ '--floors': String(lay.floors) }} aria-label={`${ACT_TITLE[s.act]}, a cut-away of the section`}>
          {Array.from({ length: lay.floors }, (_, f) => (
            <div key={f} class="floorband" style={{ top: `${((lay.floors - 1 - f) / lay.floors) * 100}%`, height: `${100 / lay.floors}%` }}>
              <span class="flabel" aria-hidden="true">
                {f + 1}
              </span>
            </div>
          ))}
          <svg class="passages" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {elites.map(({ e, i }) => (
              <polygon
                key={`pat${i}`}
                class="patrol"
                vector-effect="non-scaling-stroke"
                points={e.patrol
                  .map((id) => lay.pos.get(id))
                  .filter((p): p is Pos => !!p)
                  .map((p) => `${p.x},${p.y}`)
                  .join(' ')}
              />
            ))}
            {s.passages.map((p, i) => {
              const a = lay.pos.get(p.a);
              const b = lay.pos.get(p.b);
              if (!a || !b) return null;
              return (
                <g key={i} class={`passage k-${p.kind} ${p.locked ? 'locked' : ''}`} data-testid={`passage-${i}`} data-locked={p.locked ? 'true' : 'false'} data-kind={p.kind}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} vector-effect="non-scaling-stroke" class="pl" />
                  {p.kind === 'duct' && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} vector-effect="non-scaling-stroke" class="pl2" />}
                </g>
              );
            })}
          </svg>
          {s.passages.map((p, i) => {
            const a = lay.pos.get(p.a);
            const b = lay.pos.get(p.b);
            if (!a || !b || !p.locked) return null;
            return (
              <button key={`lk${i}`} class="lockmark" style={{ left: `${(a.x + b.x) / 2}%`, top: `${(a.y + b.y) / 2}%` }} data-testid={`lock-${i}`} aria-label="A locked door" onClick={() => (p.a === hereId || p.b === hereId) && (doorPrompt.value = i)}>
                <svg viewBox="0 0 16 16" width="16" height="16">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" fill="#3a1c12" stroke="#ff9a55" stroke-width="1.5" />
                  <path d="M5.5 7 V5 C5.5 1.8 10.5 1.8 10.5 5 V7" fill="none" stroke="#ff9a55" stroke-width="1.5" />
                </svg>
              </button>
            );
          })}
          {s.rooms.map((r) => {
            const p = lay.pos.get(r.id);
            if (!p) return null;
            const k = kindOf(r);
            const here = r.id === hereId;
            const reach = near.includes(r.id);
            const lockedReach = lockedNear.includes(r.id);
            return (
              <button
                key={r.id}
                class={`aroom k-${k} ${here ? 'here' : ''} ${reach ? 'reach' : ''} ${lockedReach && !reach ? 'lockedreach' : ''} ${r.cleared ? 'cleared' : ''} ${r.visited ? 'visited' : ''}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                data-testid={`room-${r.id}`}
                data-room-id={r.id}
                data-kind={k}
                data-here={here ? 'true' : 'false'}
                aria-label={`${ROOM_NAME[k]}, floor ${r.floor + 1}${here ? ', you are here' : reach ? ', you can walk here' : lockedReach ? ', behind a locked door' : ''}${r.cleared ? ', cleared' : ''}`}
                {...tip.on(roomInfo(r))}
                onClick={tip.guard(() => {
                  unlockAudio();
                  moveRoom(r.id);
                })}
              >
                <RoomGlyph kind={k} />
                {r.cleared && <span class="rcheck" aria-hidden="true" />}
              </button>
            );
          })}
          {elites.map(({ e, i }) => {
            const at = lay.pos.get(e.patrol[e.at]);
            const nid = e.patrol[(e.at + 1) % e.patrol.length];
            const nx = lay.pos.get(nid);
            return (
              <span key={i}>
                {nx && <span class="elitenext" data-testid={`elite-next-${i}`} data-room={nid} style={{ left: `${nx.x}%`, top: `${nx.y}%` }} aria-hidden="true" />}
                {at && (
                  <span class="elitemark" data-testid={`elite-${i}`} data-room={e.patrol[e.at]} style={{ left: `${at.x}%`, top: `${at.y}%` }} role="img" aria-label={`${eliteName(e.defId)} is here`}>
                    <EliteBadge />
                  </span>
                )}
              </span>
            );
          })}
          <span class={`walker wtinker ${w ? 'walking' : ''}`} data-testid="walker-tinker" data-room={heading} data-walking={w ? 'true' : 'false'} style={{ left: `${wp.x}%`, top: `${wp.y}%` }}>
            <TinkerFigure />
          </span>
          <span class={`walker wsprocket ${w ? 'walking' : ''}`} data-testid="walker-sprocket" data-room={heading} data-walking={w ? 'true' : 'false'} style={{ left: `${wp.x}%`, top: `${wp.y}%` }}>
            <SprocketFigure />
          </span>
        </div>
      </div>
      <ActCard run={run} />
      <DoorPrompt />
      {tip.node}
    </main>
  );
}

// ---------- room screens ----------

function RoomShell({ run, title, testid, children }: { run: RunState; title: string; testid: string; children: ComponentChildren }) {
  return (
    <main class="nodescreen roomscreen" data-testid={testid}>
      <RunBar run={run} title={title} />
      <div class="nodebody">{children}</div>
    </main>
  );
}

function PartChip({ p, selected, onClick, testid }: { p: PartInstance; selected: boolean; onClick: () => void; testid: string }) {
  const d = partDef(p.defId);
  return (
    <button class={`partchip ${selected ? 'sel' : ''}`} data-testid={testid} aria-pressed={selected} onClick={onClick}>
      <span class="band" style={{ background: FAMILY_COLOR[d.family] }} />
      <span class="pname">{partName(p.defId, p.plus)}</span>
      <span class="pfam" style={{ color: FAMILY_COLOR[d.family] }}>
        {FAMILY_LABEL[d.family]}
        {d.rarity !== 'common' ? `, ${d.rarity}` : ''}
      </span>
    </button>
  );
}

function known(id: string): boolean {
  try {
    partDef(id);
    return true;
  } catch {
    return false;
  }
}

function sortedBin(bin: PartInstance[]): PartInstance[] {
  return bin
    .filter((b) => known(b.defId))
    .slice().sort((a, b) => partName(a.defId, a.plus).localeCompare(partName(b.defId, b.plus)) || a.uid - b.uid);
}

export function WorkbenchScreen() {
  const run = runView.value;
  const [sel, setSel] = useState<number[]>([]);
  const [sureRemove, setSureRemove] = useState(false);
  const offer = fuseOffer.value;
  if (!run || run.pending?.kind !== 'workbench') return null;
  const p = run.pending;
  const scrap = scrapOf(run);
  const parts = sortedBin(run.bin);
  const chosen = sel.map((u) => run.bin.find((x) => x.uid === u)).filter((x): x is PartInstance => !!x);
  const one = chosen.length === 1 ? chosen[0] : null;
  const toggle = (uid: number): void => {
    fuseOffer.value = null;
    setSureRemove(false);
    setSel(sel.includes(uid) ? sel.filter((u) => u !== uid) : [...sel, uid].slice(-2));
  };
  const upCost = one ? (UPGRADE_SCRAP[partDef(one.defId).rarity] ?? 0) : 0;
  const rmCost = removeCost(run);
  const done = (ok: boolean): void => {
    if (ok) setSel([]);
  };
  const showOffer = offer && chosen.length === 2 && chosen.some((c) => c.uid === offer.a) && chosen.some((c) => c.uid === offer.b);
  return (
    <RoomShell run={run} title="The workbench" testid="workbench">
      <section class="benchgrid">
        <div class="benchparts" data-testid="wb-parts">
          <p class="phint">Pick a part. Pick two of a kind to fuse them.</p>
          <div class="chips">
            {parts.map((x) => (
              <PartChip key={x.uid} p={x} selected={sel.includes(x.uid)} testid={`wb-part-${x.uid}`} onClick={() => toggle(x.uid)} />
            ))}
            {parts.length === 0 && <p class="empty">Your bin is empty.</p>}
          </div>
        </div>
        <div class="benchside">
          <p class="scrapline">
            Scrap <b data-testid="scrap-count">{scrap}</b>
          </p>
          <div class="benchdetail" data-testid="wb-detail">
            {chosen.length === 0 && <p class="phint">Nothing picked yet.</p>}
            {chosen.map((c) => (
              <div key={c.uid} class="benchsel">
                <b>{partName(c.defId, c.plus)}</b>
                <span class="phint">{partText(c.defId, c.plus)}</span>
              </div>
            ))}
            {one && !one.plus && <span class="phint upnote">Upgraded: {partText(one.defId, true)}</span>}
          </div>
          <div class="benchbtns">
            <button class="secondary" data-testid="wb-upgrade" disabled={!one || one.plus || p.usedUpgrade || scrap < upCost} onClick={() => one && done(benchUpgrade(one.uid))}>
              Upgrade{one && !one.plus ? ` (${upCost} Scrap)` : ''}
            </button>
            <button class="secondary" data-testid="wb-remove" disabled={!one || p.usedRemove || scrap < rmCost} onClick={() => setSureRemove(true)}>
              Remove ({rmCost} Scrap)
            </button>
            <button class="secondary" data-testid="wb-fuse" disabled={chosen.length !== 2 || p.usedFuse} onClick={() => benchFuse(chosen[0].uid, chosen[1].uid)}>
              Fuse two (free)
            </button>
            {sureRemove && one && (
              <div class="removesure" data-testid="wb-remove-sure" role="alertdialog">
                <span>
                  Remove {partName(one.defId, one.plus)} for good? It costs {rmCost} Scrap. The next removal costs {rmCost + 15}.
                </span>
                <button
                  class="primary"
                  data-testid="wb-remove-confirm"
                  onClick={() => {
                    setSureRemove(false);
                    done(benchRemove(one.uid));
                  }}
                >
                  Remove it
                </button>
                <button class="ghostbtn" onClick={() => setSureRemove(false)}>
                  Keep it
                </button>
              </div>
            )}
            <button class="primary" data-testid="wb-leave" onClick={() => leaveRoom()}>
              Leave
            </button>
          </div>
          {chosen.length !== 2 && !p.usedFuse && <p class="phint">Fusing needs two parts picked.</p>}
          {p.usedFuse && <p class="phint">You already fused here.</p>}
        </div>
      </section>
      {showOffer && (
        <div class="fuseoffer" data-testid="fuse-offer" role="dialog" aria-label="Fuse: pick a result">
          <p class="phint fusehint">{offer.candidates.length > 0 ? 'Fuse into one of these:' : (offer.reason ?? 'These two cannot fuse.')}</p>
          <div class="fusecards">
            {offer.candidates.map((id, n) => (
              <PartCard key={id} defId={id} testid={`fuse-candidate-${n}`} onClick={() => done(benchFusePick(offer.a, offer.b, n))} />
            ))}
          </div>
          {offer.candidates.length === 0 && (
            <button class="ghostbtn" data-testid="fuse-back" onClick={() => (fuseOffer.value = null)}>
              Back
            </button>
          )}
        </div>
      )}
    </RoomShell>
  );
}

function itemName(it: { kind: string; id?: string }): { name: string; text: string } {
  try {
    if (it.kind === 'part' && it.id) return { name: partName(it.id, false), text: partText(it.id, false) };
    if (it.kind === 'trinket' && it.id) {
      const d = trinketDef(it.id);
      return { name: d.name, text: d.text };
    }
  } catch {
    // fall through
  }
  if (it.kind === 'oil') return { name: 'Oil can', text: 'Heal 15 HP, any time you like.' };
  return { name: 'Something', text: '' };
}

export function TraderScreen() {
  const run = runView.value;
  const [item, setItem] = useState<number | null>(null);
  const [offerUid, setOfferUid] = useState<number | null>(null);
  if (!run || run.pending?.kind !== 'trader') return null;
  const stock = run.pending.stock;
  const scrap = scrapOf(run);
  const sel = item !== null ? stock[item] : undefined;
  const canOffer = !!sel && sel.kind !== 'oil' && !sel.sold;
  const cost = item !== null ? tradeCost(run, item, canOffer ? offerUid : null) : 0;
  const bin = sortedBin(run.bin);
  const handed = bin.find((x) => x.uid === offerUid);
  const handName = handed ? partName(handed.defId, handed.plus) : 'a part';
  const buy = (): void => {
    if (item === null) return;
    if (traderBuy(item, canOffer ? offerUid : null)) {
      setItem(null);
      setOfferUid(null);
    }
  };
  return (
    <RoomShell run={run} title="The trader" testid="trader">
      <section class="tradegrid">
        <div class="tradestock">
          <p class="phint">Their stock. Pick one.</p>
          <div class="stocklist">
            {stock.map((it, i) => {
              const n = itemName(it);
              return (
                <button
                  key={i}
                  class={`stockitem ${item === i ? 'sel' : ''}`}
                  data-testid={`trade-item-${i}`}
                  aria-pressed={item === i}
                  disabled={it.sold}
                  onClick={() => {
                    setItem(i);
                    setOfferUid(null);
                  }}
                >
                  {it.kind === 'trinket' && <TrinketIcon name={n.name} size={26} />}
                  <span class="sname">{n.name}</span>
                  <span class="stext">{it.sold ? 'Sold' : n.text}</span>
                  <span class="sval">worth {it.value}</span>
                </button>
              );
            })}
            {stock.length === 0 && <p class="empty">Nothing on the shelves today.</p>}
          </div>
        </div>
        <div class="tradeoffer">
          <p class="phint">{canOffer ? 'Hand over a part to pay less. Tap it again to keep it.' : 'Pick something to buy.'}</p>
          <div class="chips">
            {canOffer &&
              bin.map((x) => <PartChip key={x.uid} p={x} selected={offerUid === x.uid} testid={`trade-offer-${x.uid}`} onClick={() => setOfferUid(offerUid === x.uid ? null : x.uid)} />)}
          </div>
        </div>
        <div class="tradebar">
          <span class="scrapline">
            Scrap <b data-testid="scrap-count">{scrap}</b>
          </span>
          {sel && !sel.sold ? (
            <span class="costline">
              {offerUid !== null && canOffer ? `Handing over ${handName}. ` : ''}You pay <b data-testid="trade-cost">{cost}</b>
              <span class="unit"> Scrap</span>
            </span>
          ) : (
            <span class="costline phint">Nothing picked.</span>
          )}
          <button class="primary" data-testid="trade-buy" disabled={!sel || sel.sold || cost > scrap} onClick={buy}>
            Buy
          </button>
          <button class="secondary" data-testid="trade-leave" onClick={() => leaveRoom()}>
            Leave
          </button>
        </div>
      </section>
    </RoomShell>
  );
}

export function DoorPrompt() {
  const run = runView.value;
  const passage = doorPrompt.value;
  if (!run || passage === null) return null;
  const keys = run.keys ?? 0;
  const scrap = scrapOf(run);
  const lateAfter = (run.hour ?? 0) + 1 >= (run.hours ?? 12);
  return (
    <div class="dooroverlay" data-testid="door" role="dialog" aria-label="A locked door">
      <section class="forgebox doorbox">
        <p class="evline">A heavy lock, older than the corridor around it. Behind it, a shortcut or a vault.</p>
        <div class="choices two">
          <button class="choice" data-testid="door-key" disabled={keys < 1} onClick={() => useKey(passage)}>
            <b>Use a Spire Key</b>
            <span>{keys > 0 ? `You have ${keys}. No time passes.` : 'You have no key. Some salvage drops one.'}</span>
          </button>
          <button class="choice" data-testid="door-pick" disabled={scrap < LOCK_PICK_SCRAP} onClick={() => pickLock(passage)}>
            <b>Pick the lock</b>
            <span>
              {LOCK_PICK_SCRAP} Scrap and 1 hour.{scrap < LOCK_PICK_SCRAP ? ' You do not have enough Scrap.' : lateAfter ? ' Midnight comes after it.' : ''}
            </span>
          </button>
        </div>
        <div class="nodeactions">
          <button class="secondary" data-testid="door-cancel" onClick={() => cancelDoor()}>
            Leave it shut
          </button>
        </div>
      </section>
    </div>
  );
}

export function OilRoomScreen() {
  const run = runView.value;
  if (!run || !run.section) return null;
  const room = run.section.rooms.find((r) => r.id === run.roomId);
  const used = run.pending?.kind === 'oil' ? run.pending.done : !!room?.used;
  const [justUsed, setJustUsed] = useState(false);
  const heal = Math.max(0, Math.min(run.maxHp - run.hp, Math.floor(run.maxHp * 0.3)));
  const left = Math.max(0, (run.hours ?? 12) - (run.hour ?? 0));
  return (
    <RoomShell run={run} title="The oil station" testid="oil">
      <section class="forgebox">
        {!used ? (
          <>
            <p class="evline">A quiet bench, a drip of oil. Choose one.</p>
            <div class="choices two">
              <button class="choice" data-testid="oil-rest" disabled={heal <= 0 || left < 1} onClick={() => (setJustUsed(true), oilRest())}>
                <b>Rest: +1 hour</b>
                <span data-testid="oil-rest-text">
                  {heal <= 0 ? 'Already at full HP.' : `Heal ${Math.floor(run.maxHp * 0.3)} HP (30% of your max). You are at ${run.hp} of ${run.maxHp}. The hour passes, and the elites move.`}
                </span>
              </button>
              <button class="choice" data-testid="oil-polish" onClick={() => (setJustUsed(true), oilPolish())}>
                <b>Polish</b>
                <span>
                  +4 max HP, from {run.maxHp} to {run.maxHp + 4}. No time passes.
                </span>
              </button>
            </div>
          </>
        ) : (
          <p class="evresult" data-testid="oil-done">
            {justUsed ? `Smooth and quiet. You feel ready.${lastRestHeal.value > 0 ? ` Healed ${lastRestHeal.value} HP, now ${run.hp} of ${run.maxHp}.` : ''}` : `Already used. The oil here is spent. You are at ${run.hp} of ${run.maxHp} HP.`}
          </p>
        )}
        <div class="nodeactions">
          <button class={used ? 'primary' : 'secondary'} data-testid="oil-leave" onClick={() => leaveRoom()}>
            {used ? 'Continue' : 'Leave without using it'}
          </button>
        </div>
      </section>
    </RoomShell>
  );
}
