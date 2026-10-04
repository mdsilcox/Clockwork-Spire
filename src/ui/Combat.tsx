import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { attachStage, combat, cycleSpeed, goTitle, newFight, place, replaying, run, speed, swap, target, view } from '../app/controller';
import { cellName, cell as cellIdx } from '../core/board';
import { previewTurn } from '../core/combat';
import { enemyDef } from '../core/content/enemies';
import { partDef, partName, partText } from '../core/content/parts';
import { COLS, MAINSPRING } from '../core/types';
import type { CombatState, TurnPreview } from '../core/types';
import { click, unlockAudio } from '../audio/synth';
import { cellRect, enemySlots } from '../render/layout';
import type { Layout } from '../render/layout';
import { FAMILY_COLOR, FAMILY_LABEL } from '../render/palette';
import { viewFromState } from '../render/replay';
import { Stage } from '../render/stage';
import { INTENT_NAME, IntentIcon } from './icons';
import { Tooltip } from './Tooltip';
import type { TipInfo } from './Tooltip';

function enemyNames(c: CombatState): string[] {
  const base = c.enemies.map((e) => enemyDef(e.defId).name);
  return base.map((n, i) => {
    const same = base.filter((x) => x === n).length;
    return same > 1 ? `${n} ${String.fromCharCode(65 + base.slice(0, i).filter((x) => x === n).length)}` : n;
  });
}

function intentNumber(c: CombatState, i: number): string {
  const it = c.enemies[i].intent;
  if (it.kind === 'attack') return `${it.amount ?? 0}${(it.hits ?? 1) > 1 ? `x${it.hits}` : ''}`;
  if (it.kind === 'defend' || it.kind === 'buff' || it.kind === 'debuff') return it.amount !== undefined ? String(it.amount) : '';
  if (it.kind === 'sabotage' && it.target !== undefined) return cellName(it.target);
  return '';
}

function intentText(c: CombatState, i: number): string {
  const it = c.enemies[i].intent;
  const where = it.kind === 'sabotage' && it.target !== undefined ? ` (cell ${cellName(it.target)})` : '';
  return `${INTENT_NAME[it.kind]}: ${it.label}${where}`;
}

export function CombatScreen() {
  const live = combat.value;
  const rep = replaying.value;
  const c = rep ?? live;
  const busy = rep !== null;
  const over = !!c && c.outcome !== 'ongoing';

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number>(cellIdx('B2'));
  const [mark, setMark] = useState<number>(-1);
  const [tipInfo, setTipInfo] = useState<TipInfo | null>(null);
  const longTimer = useRef<number>(0);
  const hideTimer = useRef<number>(0);
  const longFired = useRef(false);
  const [kbd, setKbd] = useState(false);
  const [toast, setToast] = useState<string>('');
  const [ghost, setGhost] = useState<{ x: number; y: number; idx: number } | null>(null);
  const toastTimer = useRef<number>(0);
  const dragRef = useRef<{ idx: number; sx: number; sy: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);

  const preview: TurnPreview | null = useMemo(
    () => (c && !busy && c.outcome === 'ongoing' ? previewTurn(c) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, busy],
  );

  // The stage lives as long as this screen.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const stage = new Stage(canvas);
    stageRef.current = stage;
    const measure = (): void => {
      stage.resize();
      setLayout(stage.layout);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    if (combat.value) stage.setState(combat.value);
    attachStage(stage);
    stage.start();
    return () => {
      ro.disconnect();
      attachStage(null);
      stage.stop();
      stageRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!replaying.value && combat.value) stageRef.current?.setState(combat.value);
  }, [live, busy]);

  useEffect(() => {
    stageRef.current?.setPreview(preview);
    stageRef.current?.setCursor(over ? -1 : cursor, mark);
  }, [preview, cursor, mark, over]);

  const flash = (msg: string): void => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  };

  if (!c) return null;
  const vw = view.value ?? viewFromState(c);
  const names = enemyNames(c);

  const doPlace = (handIndex: number, cell: number): void => {
    if (!live) return;
    if (place(handIndex, cell)) {
      setSel(null);
      setMark(-1);
      setCursor(cell);
      click();
    } else if (live.placementsLeft <= 0) flash('No placements left this turn. Press Run.');
    else if (cell === MAINSPRING) flash('The Mainspring cannot be replaced.');
    else flash('That part cannot go there.');
  };

  const tapCell = (i: number): void => {
    if (busy || over || !live) return;
    setKbd(false);
    setCursor(i);
    if (sel !== null) {
      doPlace(sel, i);
      return;
    }
    if (i === MAINSPRING) return;
    if (live.board[i]) {
      if (mark === -1) setMark(i);
      else if (mark === i) setMark(-1);
      else if (swap(mark, i)) {
        setMark(-1);
        click();
      } else {
        setMark(-1);
        flash('You can swap once per turn.');
      }
    } else if (mark !== -1) {
      setMark(-1);
    }
  };

  const doRun = (): void => {
    if (busy || over) return;
    unlockAudio();
    setSel(null);
    setMark(-1);
    void run();
  };

  const latest = useRef({ tapCell, doRun, sel, cursor, c, busy, over });
  latest.current = { tapCell, doRun, sel, cursor, c, busy, over };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const L = latest.current;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      unlockAudio();
      if (e.key.startsWith('Arrow') || e.key === 'Enter') setKbd(true);
      const inButton = (e.target as HTMLElement | null)?.closest?.('button') != null;
      if (L.busy || L.over) return;
      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < L.c.hand.length) setSel(L.sel === idx ? null : idx);
        return;
      }
      const move = (dx: number, dy: number): void => {
        const col = (L.cursor % COLS) + dx;
        const row = Math.floor(L.cursor / COLS) + dy;
        if (col < 0 || col >= COLS || row < 0 || row > 2) return;
        setCursor(row * COLS + col);
      };
      if (e.key === 'ArrowLeft') move(-1, 0);
      else if (e.key === 'ArrowRight') move(1, 0);
      else if (e.key === 'ArrowUp') move(0, -1);
      else if (e.key === 'ArrowDown') move(0, 1);
      else if (e.key === 'Enter' && !inButton) {
        L.tapCell(L.cursor);
        setKbd(true);
      }
      else if (e.key === 'r' || e.key === 'R') L.doRun();
      else if (e.key === 'Escape') {
        setSel(null);
        setMark(-1);
      } else return;
      if (e.key.startsWith('Arrow')) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- drag from a card ----------
  const onCardDown = (e: PointerEvent, idx: number): void => {
    if (busy || over) return;
    unlockAudio();
    dragRef.current = { idx, sx: e.clientX, sy: e.clientY, active: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onCardMove = (e: PointerEvent): void => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.active && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10) {
      d.active = true;
      setSel(d.idx);
    }
    if (d.active) setGhost({ x: e.clientX, y: e.clientY, idx: d.idx });
  };
  const onCardUp = (e: PointerEvent): void => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d?.active) return;
    setGhost(null);
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const target = el?.closest?.('[data-cell]') as HTMLElement | null;
    if (target) doPlace(d.idx, Number(target.dataset.cell));
  };
  const onCardClick = (idx: number): void => {
    if (longFired.current) {
      longFired.current = false;
      return;
    }
    if (suppressClick.current || busy || over) return;
    setSel(sel === idx ? null : idx);
    setMark(-1);
  };

  // ---------- rules tooltip: hover, focus, long press ----------
  const showTip = (el: Element, info: Omit<TipInfo, 'rect'> | null): void => {
    if (!info) return setTipInfo(null);
    const r = el.getBoundingClientRect();
    setTipInfo({ ...info, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } });
  };
  const hideTip = (): void => {
    window.clearTimeout(longTimer.current);
    window.clearTimeout(hideTimer.current);
    setTipInfo(null);
  };
  /** Event handlers that show `info()` on hover, keyboard focus and a 400 ms press. */
  const tipHandlers = (info: () => Omit<TipInfo, 'rect'> | null) => ({
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') showTip(e.currentTarget as Element, info());
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') hideTip();
    },
    onFocus: (e: FocusEvent) => showTip(e.currentTarget as Element, info()),
    onBlur: () => hideTip(),
    onPointerDown: (e: PointerEvent) => {
      longFired.current = false;
      const el = e.currentTarget as Element;
      window.clearTimeout(longTimer.current);
      longTimer.current = window.setTimeout(() => {
        longFired.current = true;
        showTip(el, info());
        hideTimer.current = window.setTimeout(() => setTipInfo(null), 3000);
      }, 400);
    },
    onPointerUp: () => window.clearTimeout(longTimer.current),
  });
  const cellInfo = (i: number): Omit<TipInfo, 'rect'> | null => {
    if (i === MAINSPRING) return { title: 'Mainspring.', text: 'The source of all motion. It cannot be replaced.' };
    const p = c.board[i];
    if (!p) return null;
    const bits: string[] = [];
    if (partDef(p.defId).threshold !== undefined && partDef(p.defId).id === 'coil') bits.push(`Charge ${p.charge}/${partDef(p.defId).threshold}.`);
    else if (p.charge > 0) bits.push(`Charge ${p.charge}.`);
    if (p.defId === 'cam') bits.push(`Fired ${p.counter} ${p.counter === 1 ? 'time' : 'times'} this fight.`);
    if (p.rusted > 0) bits.push('Rusted: it will not fire or pass motion on the next run.');
    return { title: `${partName(p.defId, p.plus)}.`, text: partText(p.defId, p.plus), detail: bits.join(' ') || undefined };
  };
  const cardInfo = (idx: number): Omit<TipInfo, 'rect'> | null => {
    const uid = c.hand[idx];
    if (uid === undefined) return null;
    const inst = c.parts[uid];
    return { title: `${partName(inst.defId, inst.plus)}.`, text: partText(inst.defId, inst.plus), detail: `${FAMILY_LABEL[partDef(inst.defId).family]} part. Fresh: no charge yet.` };
  };

  // keyboard cursor shows the tip of the part under it
  useEffect(() => {
    if (!kbd || busy || over) return;
    const el = document.querySelector(`[data-cell="${cursor}"]`);
    if (el) showTip(el, cellInfo(cursor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbd, cursor, live]);

  // ---------- derived display ----------
  const slots = layout ? enemySlots(layout, c.enemies.length) : [];
  const incoming = c.enemies.reduce((sum, e, i) => {
    if (vw.enemyHp[i] <= 0 || e.intent.kind !== 'attack') return sum;
    return sum + (e.intent.amount ?? 0) * (e.intent.hits ?? 1);
  }, 0);
  const pressurePct = Math.min(100, (vw.pressure / 30) * 100);

  return (
    <main class="combat" data-testid="combat" data-outcome={c.outcome}>
      <header class="hud">
        <div class="pill hp" data-testid="hp" title="Your HP">
          <span class="lbl">HP</span>
          <span class="bar">
            <i style={{ width: `${(vw.playerHp / c.playerMaxHp) * 100}%` }} />
          </span>
          <b>
            {vw.playerHp}/{c.playerMaxHp}
          </b>
        </div>
        <div class="pill plating" data-testid="plating" title="Plating absorbs damage until your next turn">
          <span class="lbl">Plating</span>
          <b>{vw.plating}</b>
          {preview && preview.plating > 0 && <span class="gain">+{preview.plating}</span>}
        </div>
        <div class={`pill pressure ${preview?.overpressure ? 'danger' : ''} ${c.outcome === 'lost' && !busy ? 'sputter' : ''}`} data-testid="pressure" title="Pressure above 20 at the end of your turn costs 6 HP">
          <span class="lbl">Pressure</span>
          <span class="bar gauge">
            <i style={{ width: `${pressurePct}%` }} />
            <em style={{ left: `${(20 / 30) * 100}%` }} />
          </span>
          <b>{vw.pressure}</b>
          {preview && preview.pressureAfter !== vw.pressure && (
            <span class={preview.overpressure ? 'warn' : 'gain'}>{preview.overpressure ? 'Overpressure -6 HP' : `to ${preview.pressureAfter}`}</span>
          )}
        </div>
        <div class="pill" data-testid="ticks" title="Ticks this turn">
          <span class="lbl">Ticks</span>
          <b>{vw.tick > 0 ? `${vw.tick}/${vw.ticks}` : vw.ticks}</b>
        </div>
        <div class="pill" data-testid="turn">
          <span class="lbl">Turn</span>
          <b>{c.turn}</b>
        </div>
        {incoming > 0 && (
          <div class="pill incoming" data-testid="incoming" title="Attack damage shown on the enemy intents">
            <span class="lbl">Incoming</span>
            <b>{incoming}</b>
          </div>
        )}
        <button class="ghostbtn menu" onClick={goTitle}>
          Menu
        </button>
      </header>

      <section class="stage" ref={wrapRef} data-testid="stage">
        <canvas ref={canvasRef} class="canvas" />
        {layout && (
          <>
            <div class="cells">
              {Array.from({ length: 15 }, (_, i) => {
                const r = cellRect(layout, i);
                const part = c.board[i];
                const n = preview?.firing[i] ?? 0;
                const style = { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` };
                if (i === MAINSPRING) {
                  return (
                    <div
                      key={i}
                      class={`cell spring ${cursor === i ? 'cursor' : ''}`}
                      style={style}
                      data-cell={i}
                      data-testid="cell-A2"
                      aria-label="A2, the Mainspring: the source of all motion"
                      title="Mainspring: the source of all motion"
                      {...tipHandlers(() => cellInfo(i))}
                      onClick={() => {
                        if (!longFired.current) tapCell(i);
                        longFired.current = false;
                      }}
                    />
                  );
                }
                const label = part ? `${cellName(i)}, ${partName(part.defId, part.plus)}. ${partText(part.defId, part.plus)}${part.rusted > 0 ? ' Rusted.' : ''}` : `${cellName(i)}, empty`;
                return (
                  <button
                    key={i}
                    tabIndex={part ? 0 : -1}
                    class={`cell ${part ? 'has' : ''} ${cursor === i ? 'cursor' : ''} ${mark === i ? 'marked' : ''} ${sel !== null ? 'drop' : ''}`}
                    style={style}
                    data-cell={i}
                    data-testid={`cell-${cellName(i)}`}
                    aria-label={label}
                    title={part ? `${partName(part.defId, part.plus)}: ${partText(part.defId, part.plus)}` : undefined}
                    disabled={busy || over}
                    {...tipHandlers(() => cellInfo(i))}
                    onClick={() => {
                      if (!longFired.current) tapCell(i);
                      longFired.current = false;
                    }}
                  >
                    {n > 0 && (
                      <span class="badge" data-testid={`badge-${cellName(i)}`}>
                        x{n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div class="enemies">
              {c.enemies.map((e, i) => {
                const slot = slots[i];
                if (!slot) return null;
                const hp = vw.enemyHp[i];
                const shell = vw.enemyShell[i];
                const dead = hp <= 0;
                const dmg = preview?.damageByEnemy[i] ?? 0;
                const num = intentNumber(c, i);
                return (
                  <button
                    key={i}
                    class={`enemy ${c.targetIdx === i && !dead ? 'target' : ''} ${dead ? 'dead' : ''}`}
                    style={{ left: `${slot.x}px`, top: `${slot.y}px`, width: `${slot.w}px`, height: `${slot.h}px` }}
                    data-testid={`enemy-${i}`}
                    aria-pressed={c.targetIdx === i && !dead}
                    aria-label={`${names[i]}, ${hp} of ${e.maxHp} HP${shell > 0 ? `, Shell ${shell}` : ''}. ${dead ? 'Scrapped.' : intentText(c, i)}. ${c.targetIdx === i ? 'Targeted.' : 'Tap to target.'}`}
                    disabled={dead || busy || over}
                    onClick={() => target(i)}
                  >
                    {!dead ? (
                      <span class={`intent k-${e.intent.kind}`} title={intentText(c, i)} data-testid={`intent-${i}`}>
                        <IntentIcon kind={e.intent.kind} />
                        {num && <b>{num}</b>}
                      </span>
                    ) : (
                      <span class="intent none" />
                    )}
                    <span class="body" />
                    <span class="info">
                      <span class="ename">{names[i]}</span>
                      <span class="ehp" data-testid={`ehp-${i}`}>
                        {dead ? 'Scrapped' : `${hp}/${e.maxHp}`}
                        {shell > 0 && <span class="shell"> Shell {shell}</span>}
                      </span>
                      {dmg > 0 && !dead && (
                        <span class="edmg" data-testid={`edmg-${i}`}>
                          Run: -{dmg}
                          {dmg >= hp ? ' (scrapped)' : ''}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div class="chain" key={vw.chain} data-testid="chain" aria-live="off" hidden={vw.chain <= 0}>
              Chain x{vw.chain}
            </div>
          </>
        )}
        {toast && (
          <div class="toast" role="status" data-testid="toast">
            {toast}
          </div>
        )}
        {over && !busy && (
          <div class="result" data-testid="result" role="dialog" aria-label={c.outcome === 'won' ? 'Victory' : 'Defeat'}>
            <div class="panel">
              <h2>{c.outcome === 'won' ? 'Victory' : 'Defeat'}</h2>
              <p>
                {c.outcome === 'won'
                  ? `The machine scrapped every enemy in ${c.turn} ${c.turn === 1 ? 'turn' : 'turns'}.`
                  : 'You ran out of HP. A good machine is built one tick at a time.'}
              </p>
              <button class="primary" data-testid="again" onClick={() => newFight()}>
                Again
              </button>
            </div>
          </div>
        )}
      </section>

      <footer class="tray">
        <div class="hand" data-testid="hand">
          {c.hand.length === 0 && !over && <p class="empty">No parts in hand. Press Run.</p>}
          {c.hand.map((uid, idx) => {
            const inst = c.parts[uid];
            const def = partDef(inst.defId);
            return (
              <button
                key={uid}
                class={`card ${sel === idx ? 'sel' : ''}`}
                data-testid="hand-card"
                data-hand-index={idx}
                aria-pressed={sel === idx}
                aria-label={`${idx + 1}: ${partName(inst.defId, inst.plus)}, ${FAMILY_LABEL[def.family]}. ${partText(inst.defId, inst.plus)}`}
                disabled={busy || over}
                {...tipHandlers(() => cardInfo(idx))}
                onPointerDown={(e) => {
                  tipHandlers(() => cardInfo(idx)).onPointerDown(e);
                  onCardDown(e, idx);
                }}
                onPointerMove={(e) => {
                  if (dragRef.current && Math.hypot(e.clientX - dragRef.current.sx, e.clientY - dragRef.current.sy) > 10) hideTip();
                  onCardMove(e);
                }}
                onPointerUp={(e) => {
                  window.clearTimeout(longTimer.current);
                  onCardUp(e);
                }}
                onPointerCancel={() => {
                  dragRef.current = null;
                  setGhost(null);
                }}
                onClick={() => onCardClick(idx)}
              >
                <span class="band" style={{ background: FAMILY_COLOR[def.family] }} />
                <span class="key">{idx + 1}</span>
                <span class="cname">{partName(inst.defId, inst.plus)}</span>
                <span class="cfam" style={{ color: FAMILY_COLOR[def.family] }}>
                  {FAMILY_LABEL[def.family]}
                </span>
                <span class="ctext">{partText(inst.defId, inst.plus)}</span>
              </button>
            );
          })}
        </div>
        <div class="controls">
          <p class="summary" data-testid="preview" aria-live="polite">
            {preview ? (
              <>
                {preview.damageByEnemy.reduce((a, b) => a + b, 0)} damage, {preview.plating} Plating, {preview.ticks} ticks
              </>
            ) : (
              <>&nbsp;</>
            )}
          </p>
          <p class="placements" data-testid="placements">
            Placements: <b>{c.placementsLeft}</b>
            {c.swapUsed ? '' : ' | Swap ready'}
          </p>
          <div class="row">
            <button class="primary run" data-testid="run" disabled={busy || over} onClick={doRun}>
              Run
            </button>
            <button class="speed" data-testid="speed" onClick={cycleSpeed} aria-label={`Animation speed ${speed.value}. Tap to change.`}>
              {speed.value === 'skip' ? 'Skip' : speed.value}
            </button>
          </div>
        </div>
      </footer>
      {tipInfo && <Tooltip tip={tipInfo} />}
      {ghost && c.hand[ghost.idx] !== undefined && (
        <div class="dragghost" style={{ left: `${ghost.x}px`, top: `${ghost.y}px` }}>
          {partName(c.parts[c.hand[ghost.idx]].defId, c.parts[c.hand[ghost.idx]].plus)}
        </div>
      )}
    </main>
  );
}

