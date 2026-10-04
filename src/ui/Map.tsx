// The act map, the run bar (HP, Cogs, parts, trinkets) and the bin viewer.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { abandonClimb, availableNow, goNode, runToTitle, runView } from '../app/controller';
import { binOpen, colorBlind, openGlossary, setColorBlind } from '../app/prefs';
import { partName } from '../core/content/parts';
import { trinketDef } from '../core/content/trinkets';
import type { MapNode, NodeType, RunState } from '../core/types';
import { unlockAudio } from '../audio/synth';
import { PartCard } from './PartCard';
import { NODE_HINT, NODE_NAME, NodeIcon, TrinketIcon } from './runicons';
import { useTip } from './useTip';

export const ACT_TITLE: Record<number, string> = { 1: 'Act 1: the Gearworks', 2: 'Act 2: the Steamworks', 3: 'Act 3: the Belfry' };

const TYPES: NodeType[] = ['fight', 'elite', 'event', 'forge', 'oil', 'shop', 'boss'];
const FLOOR_H = 78;
const PAD = 44;

export function TrinketBar({ run }: { run: RunState }) {
  const tip = useTip();
  if (run.trinkets.length === 0) return <div class="trinkets empty-bar" data-testid="trinkets" />;
  return (
    <div class="trinkets" data-testid="trinkets">
      {run.trinkets.map((id, i) => {
        let d;
        try {
          d = trinketDef(id);
        } catch {
          return null;
        }
        return (
          <span key={`${id}${i}`} class="trinket" tabIndex={0} data-testid={`trinket-${id}`} aria-label={`${d.name}: ${d.text}`} {...tip.on(() => ({ title: `${d.name}.`, text: d.text, detail: d.rarity }))}>
            <TrinketIcon name={d.name} />
          </span>
        );
      })}
      {tip.node}
    </div>
  );
}

/** HP, Cogs, parts, trinkets and the menu: the top bar of every run screen except combat. */
export function RunBar({ run, title }: { run: RunState; title?: string }) {
  const [menu, setMenu] = useState(false);
  const [sure, setSure] = useState(false);
  const cb = colorBlind.value;
  return (
    <header class="runbar" data-testid="runbar">
      <div class="rtitle">
        <b data-testid="act-title">{title ?? ACT_TITLE[run.act]}</b>
        <span class="rfloor">{run.floor > 0 ? `Floor ${run.floor} of 13` : 'Before the first floor'}</span>
      </div>
      <div class="pill hp" data-testid="run-hp">
        <span class="lbl">HP</span>
        <span class="bar">
          <i style={{ width: `${(run.hp / run.maxHp) * 100}%` }} />
        </span>
        <b>
          {run.hp}/{run.maxHp}
        </b>
      </div>
      <div class="pill" data-testid="run-cogs">
        <span class="lbl">Cogs</span>
        <b>{run.cogs}</b>
      </div>
      <button class="pill pillbtn" data-testid="open-bin" onClick={() => (binOpen.value = true)}>
        <span class="lbl">Parts</span>
        <b>{run.bin.length}</b>
      </button>
      <TrinketBar run={run} />
      <div class="menuwrap">
        <button class="ghostbtn menu" data-testid="run-menu" aria-expanded={menu} onClick={() => (setMenu(!menu), setSure(false))}>
          Menu
        </button>
        {menu && (
          <div class="menupanel" role="menu" data-testid="run-menu-panel">
            <button
              role="menuitem"
              onClick={() => {
                setMenu(false);
                openGlossary();
              }}
            >
              Glossary
            </button>
            <label class="check">
              <input type="checkbox" checked={cb} onChange={(e) => setColorBlind((e.currentTarget as HTMLInputElement).checked)} />
              Color-blind icons
            </label>
            <button role="menuitem" data-testid="run-to-title" onClick={() => runToTitle()}>
              Back to title
            </button>
            {!sure ? (
              <button role="menuitem" data-testid="abandon" onClick={() => setSure(true)}>
                Give up this climb
              </button>
            ) : (
              <button role="menuitem" class="danger" data-testid="abandon-sure" onClick={() => abandonClimb()}>
                Really give up? Tap again
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export function BinViewer() {
  const run = runView.value;
  if (!binOpen.value || !run) return null;
  const groups = new Map<string, { defId: string; plus: boolean; n: number }>();
  for (const p of run.bin) {
    const k = `${p.defId}${p.plus ? '+' : ''}`;
    const g = groups.get(k);
    if (g) g.n += 1;
    else groups.set(k, { defId: p.defId, plus: p.plus, n: 1 });
  }
  const list = [...groups.values()].sort((a, b) => partName(a.defId, a.plus).localeCompare(partName(b.defId, b.plus)));
  return (
    <div class="glossary binview" role="dialog" aria-label="Your parts" data-testid="bin-viewer">
      <header class="ghead">
        <h2>Your parts ({run.bin.length})</h2>
        <span class="grow" />
        <button class="ghostbtn gclose" data-testid="bin-close" onClick={() => (binOpen.value = false)}>
          Close
        </button>
      </header>
      <div class="glist cardlist">
        {list.length === 0 && <p class="empty">Your bin is empty.</p>}
        {list.map((g) => (
          <PartCard key={`${g.defId}${g.plus}`} defId={g.defId} plus={g.plus} testid="bin-part" extra={g.n > 1 ? `x${g.n}` : undefined} />
        ))}
      </div>
    </div>
  );
}

function nodeX(lane: number): number {
  return ((lane + 0.5) / 4) * 100;
}
function nodeY(floor: number): number {
  return PAD + (13 - floor) * FLOOR_H;
}

export function MapScreen() {
  const run = runView.value;
  const scrollRef = useRef<HTMLDivElement>(null);
  const tip = useTip();
  const avail = useMemo(() => {
    try {
      return run && run.phase === 'map' ? availableNow() : [];
    } catch {
      return [];
    }
  }, [run]);

  const height = PAD * 2 + 12 * FLOOR_H;
  const cur = run?.nodeId ?? null;
  // open scrolled so the next floor sits in the middle
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !run) return;
    const target = nodeY(Math.min(13, run.floor + 1));
    el.scrollTop = Math.max(0, target - el.clientHeight * 0.55);
  }, [run?.floor, run?.act]);

  if (!run) return null;
  const nodes = run.map.nodes;
  const byId = new Map<string, MapNode>(nodes.map((n) => [n.id, n]));

  const lines: { key: string; x1: number; y1: number; x2: number; y2: number; cls: string }[] = [];
  for (const n of nodes) {
    for (const t of n.next) {
      const m = byId.get(t);
      if (!m) continue;
      const trail = n.visited && (m.visited || m.id === cur);
      const live = (n.id === cur || (cur === null && false)) && avail.includes(m.id);
      lines.push({ key: `${n.id}>${t}`, x1: nodeX(n.lane), y1: nodeY(n.floor), x2: nodeX(m.lane), y2: nodeY(m.floor), cls: trail ? 'trail' : live ? 'live' : '' });
    }
  }

  return (
    <main class="mapscreen" data-testid="map">
      <RunBar run={run} />
      <div class="mapscroll" ref={scrollRef} data-testid="map-scroll">
        <div class="mapboard" style={{ height: `${height}px` }}>
          <svg class="mappaths" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
            {lines.map((l) => (
              <line key={l.key} class={`mpath ${l.cls}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} vector-effect="non-scaling-stroke" />
            ))}
          </svg>
          {nodes.map((n) => {
            const reach = avail.includes(n.id);
            const here = n.id === cur;
            const info = () => ({ title: `${NODE_NAME[n.type]}.`, text: NODE_HINT[n.type], detail: `Floor ${n.floor}${n.visited ? '. Visited.' : reach ? '. Tap to enter.' : n.floor === 13 ? '' : '. Not reachable yet.'}` });
            return (
              <button
                key={n.id}
                class={`mnode t-${n.type} ${n.visited ? 'visited' : ''} ${here ? 'here' : ''} ${reach ? 'reach' : ''}`}
                style={{ left: `${nodeX(n.lane)}%`, top: `${nodeY(n.floor)}px` }}
                data-testid={`node-${n.id}`}
                data-type={n.type}
                data-floor={n.floor}
                disabled={!reach}
                aria-label={`${NODE_NAME[n.type]}, floor ${n.floor}${here ? ', you are here' : n.visited ? ', visited' : reach ? ', you can enter' : ''}`}
                {...tip.on(info)}
                onClick={tip.guard(() => {
                  unlockAudio();
                  goNode(n.id);
                })}
              >
                <NodeIcon type={n.type} size={46} />
                {n.visited && !here && <span class="vmark" aria-hidden="true" />}
                {here && <span class="hmark" aria-hidden="true" />}
              </button>
            );
          })}
          <div class="floorlabel" style={{ top: `${nodeY(13) - 38}px` }}>
            The top of the act
          </div>
        </div>
      </div>
      <footer class="legend" data-testid="legend">
        {TYPES.map((t) => (
          <span key={t} class="lg">
            <NodeIcon type={t} size={22} />
            {NODE_NAME[t]}
          </span>
        ))}
      </footer>
      {tip.node}
    </main>
  );
}
