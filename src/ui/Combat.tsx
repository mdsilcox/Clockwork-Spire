import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { attachStage, banner, bossIntro, combat, cycleSpeed, goTitle, lastResult, newFight, place, replaying, run, runView, screen, speed, swap, target, toggleTarget, tutorial, tutorialAck, view } from '../app/controller';
import { colorBlind, glossaryOpen, openGlossary, openHowTo, openSettings, setColorBlind } from '../app/prefs';
import { intentTargets } from '../app/intents';
import { glossaryFor } from '../core/content/glossary';
import { cellName, cell as cellIdx } from '../core/board';
import { previewTurn } from '../core/combat';
import { enemyDef } from '../core/content/enemies';
import { partDef, partName, partText } from '../core/content/parts';
import { COLS, MAINSPRING } from '../core/types';
import type { CombatState, TargetRef, TurnPreview } from '../core/types';
import { click, unlockAudio } from '../audio/synth';
import { cellRect, enemySlots, isCompact, machineGeometry, textBlock } from '../render/layout';
import type { Layout } from '../render/layout';
import { FAMILY_COLOR, FAMILY_LABEL } from '../render/palette';
import { viewFromState } from '../render/replay';
import { Stage } from '../render/stage';
import { INTENT_NAME, IntentIcon, STATUS_NAME, StatusIcon } from './icons';
import { Coach, tutorialTargets } from './Coach';
import { familyHint } from './synergy';
import { ACT_TITLE, TrinketBar } from './Map';
import { EnemyMachine } from './EnemyParts';
import { damageText, enemyPartDef, pendingRatchet } from './partText';
import { TierMark } from './TierMark';
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
  if (it.kind === 'attack') return `${it.amount ?? 0}${(it.hits ?? 1) > 1 ? ` x${it.hits}` : ''}`;
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
  const tipAnchor = useRef<{ el: Element; label: string | null } | null>(null);
  const longTimer = useRef<number>(0);
  const hideTimer = useRef<number>(0);
  const longFired = useRef(false);
  const [kbd, setKbd] = useState(false);
  const [hoverEnemy, setHoverEnemy] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const tut = tutorial.value;
  const runNow = screen.value === 'run' ? runView.value : null;
  const intro = bossIntro.value;
  const ban = banner.value;
  // the warden's phase line shows for about 2.5 s (under a second on skip speed) and a tap dismisses it
  const [beatGone, setBeatGone] = useState(0);
  const beatN = ban && ban.kind === 'phase' ? ban.n : 0;
  useEffect(() => {
    if (!beatN) return;
    const id = window.setTimeout(() => setBeatGone(beatN), speed.value === 'skip' ? 900 : 2500);
    return () => window.clearTimeout(id);
  }, [beatN]);
  const gloss = glossaryOpen.value !== null;
  const cb = colorBlind.value;
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

  // a tooltip closes when the thing it describes changes or goes away (a part breaks, the order changes)
  useEffect(() => {
    const a = tipAnchor.current;
    if (!tipInfo || !a) return;
    if (!a.el.isConnected || (a.el as HTMLButtonElement).disabled || a.el.getAttribute('aria-label') !== a.label) {
      window.clearTimeout(hideTimer.current);
      setTipInfo(null);
    }
  }, [live, busy, view.value]);

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
      hideTip();
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
    hideTip();
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
      if (glossaryOpen.value !== null) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
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
      else if (e.key === 't' || e.key === 'T') {
        // cycle keyboard focus over the target markers; Enter on a focused marker toggles it
        const marks = Array.from(document.querySelectorAll<HTMLElement>('[data-target-marker]')).filter((m) => !(m as HTMLButtonElement).disabled);
        if (marks.length === 0) return;
        const at = marks.indexOf(document.activeElement as HTMLElement);
        marks[(at + 1) % marks.length].focus();
        setKbd(false);
      }
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
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* a pointer that is already gone cannot be captured */
    }
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
    tipAnchor.current = { el, label: el.getAttribute('aria-label') };
    setTipInfo({ ...info, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } });
  };
  const hideTip = (): void => {
    window.clearTimeout(longTimer.current);
    window.clearTimeout(hideTimer.current);
    setTipInfo(null);
  };
  const hideSoon = (): void => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setTipInfo(null), 160);
  };
  const keepTip = (): void => window.clearTimeout(hideTimer.current);
  /** Event handlers that show `info()` on hover, keyboard focus and a 400 ms press. */
  const tipHandlers = (info: () => Omit<TipInfo, 'rect'> | null) => ({
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        window.clearTimeout(hideTimer.current);
        showTip(e.currentTarget as Element, info());
      }
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') hideSoon();
    },
    // a tap or click focuses a button too: only keyboard focus opens the tooltip
    onFocus: (e: FocusEvent) => {
      const el = e.currentTarget as Element;
      if (el.matches(':focus-visible')) showTip(el, info());
    },
    onBlur: () => hideSoon(),
    onPointerDown: (e: PointerEvent) => {
      e.stopPropagation();
      longFired.current = false;
      const el = e.currentTarget as Element;
      window.clearTimeout(longTimer.current);
      longTimer.current = window.setTimeout(() => {
        longFired.current = true;
        showTip(el, info());
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setTipInfo(null), 6000);
      }, 400);
    },
    onPointerUp: () => window.clearTimeout(longTimer.current),
    onPointerCancel: () => window.clearTimeout(longTimer.current),
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
    return { title: `${partName(p.defId, p.plus)}.`, rarity: partDef(p.defId).rarity, text: partText(p.defId, p.plus), detail: [bits.join(' '), familyHint(p.defId)].filter(Boolean).join(' ') };
  };
  const cardInfo = (idx: number): Omit<TipInfo, 'rect'> | null => {
    const uid = c.hand[idx];
    if (uid === undefined) return null;
    const inst = c.parts[uid];
    return { title: `${partName(inst.defId, inst.plus)}.`, rarity: partDef(inst.defId).rarity, text: partText(inst.defId, inst.plus), detail: `${familyHint(inst.defId)} Fresh: no charge yet.` };
  };

  // a tap or click anywhere outside the tooltip dismisses it
  useEffect(() => {
    const away = (e: PointerEvent): void => {
      if ((e.target as HTMLElement | null)?.closest?.('.tip')) return;
      window.clearTimeout(hideTimer.current);
      setTipInfo(null);
    };
    window.addEventListener('pointerdown', away, true);
    return () => window.removeEventListener('pointerdown', away, true);
  }, []);

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
    if (vw.enemyHp[i] <= 0) return sum;
    if (e.parts.length > 0) {
      const gone = new Set((preview?.cancelled ?? []).filter((x) => x.enemy === i).map((x) => x.partId));
      return (
        sum +
        e.intents
          .filter((it) => !gone.has(it.partId))
          .reduce((t, it) => t + it.actions.filter((a) => a.kind === 'attack' || a.kind === 'pierce').reduce((u, a) => u + ((a.amount ?? 0) + pendingRatchet(c, i, preview)) * (a.hits ?? 1), 0), 0)
      );
    }
    if (e.intent.kind !== 'attack') return sum;
    return sum + (e.intent.amount ?? 0) * (e.intent.hits ?? 1);
  }, 0);
  const tapTarget = (ref: TargetRef): void => {
    if (longFired.current) {
      longFired.current = false;
      return;
    }
    if (busy || over) return;
    if (!toggleTarget(ref)) {
      const sealed = ref.endsWith('.core') && c.enemies[Number(ref.slice(1, ref.indexOf('.')))]?.sealed;
      flash(sealed ? 'The core is sealed. Break its keystones first.' : c.order.length >= 6 ? 'The order holds 6 targets at most.' : 'That target is out of reach.');
    }
  };
  const pressurePct = Math.min(100, (vw.pressure / 30) * 100);
  const calm = !busy && !over;
  const targets = c.enemies.map((_, i) => (calm ? intentTargets(c, i) : { cells: [] as number[], mainspring: false, pressure: false }));
  const saboCells = new Set(targets.flatMap((t) => t.cells));
  const hotCells = new Set(hoverEnemy !== null && targets[hoverEnemy] ? targets[hoverEnemy].cells : []);
  const jamNow = targets.some((t) => t.mainspring);
  const drainNow = targets.some((t) => t.pressure);
  const glow = tut && live ? tutorialTargets(tut.step, c) : new Set<string>();
  const last = lastResult.value;
  const rebuilt = last ? last.events.filter((x) => x.kind === 'partRebuilt').map((x) => (x.target !== undefined && x.part ? `${enemyPartDef(c.enemies[x.target]?.defId ?? '', x.part)?.name ?? 'A part'} rebuilt` : '')).filter(Boolean) : [];
  const recap = last && !busy ? `Chain x${last.preview.momentum}, ${damageText(last.preview)}, ${last.preview.plating} Plating${rebuilt.length ? `. ${rebuilt.join(', ')}` : ''}` : '';
  const pillTip = (title: string, text: string, detail?: string) => tipHandlers(() => ({ title, text, detail }));
  const statusInfo = (id: string, n: number, who: string) => () => {
    const e = glossaryFor(id);
    return { title: `${STATUS_NAME[id] ?? id} ${n}.`, text: e ? e.text : 'A status effect.', detail: who };
  };

  return (
    <main class="combat" data-testid="combat" data-outcome={c.outcome}>
      <header class="hud">
        <div class="pill hp" data-testid="hp" tabIndex={0} {...pillTip('HP.', 'Your health. At 0 the machine stops for good.')}>
          <span class="lbl">HP</span>
          <span class="bar">
            <i style={{ width: `${(vw.playerHp / c.playerMaxHp) * 100}%` }} />
          </span>
          <b>
            {vw.playerHp}/{c.playerMaxHp}
          </b>
        </div>
        <div class="pill plating" data-testid="plating" tabIndex={0} {...pillTip('Plating.', 'Block. It absorbs damage you take, and falls away at the start of your next turn.')}>
          <StatusIcon kind="plating" size={14} />
          <span class="lbl">Plating</span>
          <b>{vw.plating}</b>
          {preview && preview.plating > 0 && <span class="gain">+{preview.plating}</span>}
        </div>
        <div
          class={`pill pressure ${preview?.overpressure ? 'danger' : ''} ${c.outcome === 'lost' && !busy ? 'sputter' : ''}`}
          data-testid="pressure"
          tabIndex={0}
          {...pillTip('Pressure.', 'A shared steam gauge. Above 20 at the end of your turn it overpressures: 6 damage to you, then it drops to 10.', `Now ${vw.pressure} of 30.`)}
        >
          <StatusIcon kind="pressure" size={14} />
          <span class="lbl">Pressure</span>
          <span class="bar gauge">
            <i style={{ width: `${pressurePct}%` }} />
            <em style={{ left: `${(20 / 30) * 100}%` }} />
          </span>
          <b>{vw.pressure}</b>
          {drainNow && (
            <span class="sabbadge" data-testid="drain-badge" aria-label="An enemy will Drain Pressure">
              <IntentIcon kind="sabotage" size={14} />
            </span>
          )}
          {preview && preview.pressureAfter !== vw.pressure && (
            <span class={preview.overpressure ? 'warn' : 'gain'}>{preview.overpressure ? 'Overpressure -6 HP' : `to ${preview.pressureAfter}`}</span>
          )}
        </div>
        <div class="pill" data-testid="ticks" tabIndex={0} {...pillTip('Ticks.', 'How many beats the machine runs this turn. Each tick, motion spreads from the Mainspring.')}>
          <span class="lbl">Ticks</span>
          <b>{vw.tick > 0 ? `${vw.tick}/${vw.ticks}` : vw.ticks}</b>
        </div>
        <div class="pill" data-testid="momentum" tabIndex={0} {...pillTip('Momentum.', 'How many times any part has fired this turn. Some parts read it.')}>
          <span class="lbl">Momentum</span>
          <b>{vw.chain}</b>
        </div>
        <div class="pill" data-testid="turn">
          <span class="lbl">Turn</span>
          <b>{c.turn}</b>
        </div>
        {Object.entries(c.playerStatuses).map(([id, n]) => (
          <span key={id} class="pip" tabIndex={0} data-testid={`pip-${id}`} {...tipHandlers(statusInfo(id, n, 'On you.'))}>
            <StatusIcon kind={id} />
            <span class="lbl">{STATUS_NAME[id] ?? id}</span>
            <b>{n}</b>
          </span>
        ))}
        {incoming > 0 && (
          <div class="pill incoming" data-testid="incoming" tabIndex={0} {...pillTip('Incoming.', 'Attack damage shown on the enemy intents, before your Plating.')}>
            <span class="lbl">Incoming</span>
            <b>{incoming}</b>
          </div>
        )}
        <div class="menuwrap">
          <button class="ghostbtn menu" data-testid="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            Menu
          </button>
          {menuOpen && (
            <div class="menupanel" role="menu" data-testid="menu-panel">
              <button
                role="menuitem"
                data-testid="menu-glossary"
                onClick={() => {
                  setMenuOpen(false);
                  openGlossary();
                }}
              >
                Glossary
              </button>
              <button role="menuitem" data-testid="menu-howto" onClick={() => (setMenuOpen(false), openHowTo())}>
                How to play
              </button>
              <button role="menuitem" data-testid="menu-settings" onClick={() => (setMenuOpen(false), openSettings())}>
                Settings
              </button>
              <label class="check">
                <input type="checkbox" data-testid="menu-colorblind" checked={cb} onChange={(e) => setColorBlind((e.currentTarget as HTMLInputElement).checked)} />
                Color-blind icons
              </label>
              <button
                role="menuitem"
                data-testid="menu-title"
                onClick={() => {
                  setMenuOpen(false);
                  goTitle();
                }}
              >
                {tut ? 'Quit the tutorial' : 'Back to title'}
              </button>
            </div>
          )}
        </div>
      </header>
      <Coach />
      {runNow && (
        <div class="runstrip" data-testid="runstrip">
          <b data-testid="run-where">
            {ACT_TITLE[runNow.act]} <span class="dot">|</span> {runNow.section ? `Hour ${runNow.hour ?? 0} of ${runNow.hours ?? 12}` : `Floor ${runNow.floor}`}
          </b>
          <TrinketBar run={runNow} />
        </div>
      )}

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
                      tabIndex={0}
                      aria-label="A2, the Mainspring: the source of all motion"
                      {...tipHandlers(() => cellInfo(i))}
                      onClick={() => {
                        if (!longFired.current) tapCell(i);
                        longFired.current = false;
                      }}
                    >
                      {jamNow && (
                        <span class="sabbadge wedge" data-testid="jam-badge" aria-label="An enemy will Jam the Mainspring">
                          <StatusIcon kind="jam" size={16} />
                        </span>
                      )}
                    </div>
                  );
                }
                const label = part ? `${cellName(i)}, ${partName(part.defId, part.plus)}. ${partText(part.defId, part.plus)}${part.rusted > 0 ? ' Rusted.' : ''}` : `${cellName(i)}, empty`;
                return (
                  <button
                    key={i}
                    tabIndex={part ? 0 : -1}
                    class={`cell ${part ? 'has' : ''} ${cursor === i ? 'cursor' : ''} ${mark === i ? 'marked' : ''} ${sel !== null ? 'drop' : ''} ${saboCells.has(i) ? 'sabo' : ''} ${hotCells.has(i) ? 'hot' : ''} ${glow.has(`cell:${i}`) ? 'tut-glow' : ''}`}
                    style={style}
                    data-cell={i}
                    data-testid={`cell-${cellName(i)}`}
                    aria-label={label}
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
                    {saboCells.has(i) && (
                      <span class="sabbadge" data-testid={`sabo-${cellName(i)}`}>
                        <IntentIcon kind="sabotage" size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div class={`enemies ${c.enemies.length > 2 ? 'dense' : ''}`}>
              {c.enemies.map((e, i) => {
                const slot = slots[i];
                if (!slot) return null;
                const hp = vw.enemyHp[i];
                const shell = vw.enemyShell[i];
                const dead = hp <= 0;
                const dmg = preview?.damageByEnemy[i] ?? 0;
                const mg = e.parts.length > 0 ? machineGeometry(slot, e.parts.length) : null;
                const num = intentNumber(c, i);
                const isTarget = c.targetIdx === i && !dead;
                const pips = Object.entries(e.statuses).filter(([, n]) => n > 0);
                const def = enemyDef(e.defId);
                const enemyInfo = (): Omit<TipInfo, 'rect'> => ({
                  title: `${names[i]}.`,
                  text: dead ? 'Scrapped.' : `Acts: ${e.intent.label || 'waits'}.`,
                  detail: `${hp} of ${e.maxHp} HP${shell > 0 ? `. Shell ${shell}` : ''}. ${def.tier === 'normal' ? '' : `${def.tier[0].toUpperCase()}${def.tier.slice(1)}. `}${isTarget ? 'Targeted: your Strikes go here.' : 'Tap to target.'}`,
                });
                const where = targets[i].cells.length > 0 ? ` It will hit ${targets[i].cells.map(cellName).join(', ')}.` : targets[i].mainspring ? ' It will hit the Mainspring.' : targets[i].pressure ? ' It will hit your Pressure.' : '';
                const intentInfo = (): Omit<TipInfo, 'rect'> => ({ title: `${INTENT_NAME[e.intent.kind]}.`, text: `${e.intent.label || INTENT_NAME[e.intent.kind]}.${where}`, detail: e.intent.kind === 'attack' ? 'Plating soaks this up first.' : undefined });
                return (
                  <div
                    key={i}
                    class={`enemy ${isTarget ? 'target' : ''} ${dead ? 'dead' : ''} ${isCompact(slot) ? 'compact' : ''} ${cb ? 'cb' : ''} ${mg ? `machine ${mg.mode}` : ''}`}
                    style={{ left: `${slot.x}px`, top: `${slot.y}px`, width: `${slot.w}px`, height: `${slot.h}px`, ...(mg?.column ? { '--col-x': `${mg.column.x}px` } : {}) }}
                    onPointerEnter={(ev) => ev.pointerType === 'mouse' && setHoverEnemy(i)}
                    onPointerLeave={(ev) => ev.pointerType === 'mouse' && setHoverEnemy(null)}
                  >
                    <button
                      class="etap"
                      data-testid={`enemy-${i}`}
                      aria-pressed={isTarget}
                      aria-label={`${names[i]}, ${hp} of ${e.maxHp} HP${shell > 0 ? `, Shell ${shell}` : ''}. ${dead ? 'Scrapped.' : intentText(c, i)}. ${isTarget ? 'Targeted.' : 'Tap to target.'}`}
                      disabled={dead || busy || over}
                      {...tipHandlers(enemyInfo)}
                      onClick={() => {
                        if (!longFired.current) target(i);
                        longFired.current = false;
                      }}
                    />
                    {e.parts.length > 0 ? null : !dead ? (
                      <span
                        class={`intent k-${e.intent.kind} ${glow.has('intent') ? 'tut-glow' : ''}`}
                        tabIndex={0}
                        data-testid={`intent-${i}`}
                        data-kind={e.intent.kind}
                        aria-label={intentText(c, i)}
                        {...tipHandlers(intentInfo)}
                        onFocus={(ev) => {
                          setHoverEnemy(i);
                          tipHandlers(intentInfo).onFocus(ev);
                        }}
                        onBlur={() => {
                          setHoverEnemy(null);
                          hideSoon();
                        }}
                      >
                        <span class="irow">
                          <IntentIcon kind={e.intent.kind} size={isCompact(slot) ? 18 : 22} />
                          {num && <b>{num}</b>}
                        </span>
                        {cb && <span class="ilabel">{INTENT_NAME[e.intent.kind]}</span>}
                      </span>
                    ) : (
                      <span class="intent none" />
                    )}
                    <span class="body" />
                    <EnemyMachine c={c} i={i} slot={slot} vw={vw} preview={preview} name={names[i]} cb={cb} interactive={calm} tip={tipHandlers as never} onTap={tapTarget} />
                    <span class="info" style={mg && !mg.column ? { height: `${textBlock(slot)}px` } : undefined}>
                      <span class="nameline">
                        <span class="ename">{names[i]}</span>
                        <span class="ehp" data-testid={`ehp-${i}`}>
                          {dead ? 'Scrapped' : `${hp}/${e.maxHp}`}
                          {shell > 0 && <span class="shell"> Shell {shell}</span>}
                        </span>
                      </span>
                      {dmg > 0 && !dead && (
                        <span class="edmg" data-testid={`edmg-${i}`}>
                          Run: -{dmg}
                          {dmg >= hp ? ' (scrapped)' : ''}
                        </span>
                      )}
                      {!dead && (shell > 0 || pips.length > 0) && (
                        <span class="pips">
                          {shell > 0 && (
                            <span class="pip" tabIndex={0} data-testid={`pip-shell-${i}`} {...tipHandlers(statusInfo('shell', shell, `On ${names[i]}.`))}>
                              <StatusIcon kind="shell" />
                              <b>{shell}</b>
                            </span>
                          )}
                          {pips.map(([id, n]) => (
                            <span key={id} class="pip" tabIndex={0} data-testid={`pip-${id}-${i}`} {...tipHandlers(statusInfo(id, n, `On ${names[i]}.`))}>
                              <StatusIcon kind={id} />
                              <b>{n}</b>
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div class="chain" key={vw.chain} data-testid="chain" aria-live="off" hidden={vw.chain <= 0}>
              Chain x{vw.chain}
            </div>
          </>
        )}
        {ban && !(ban.kind === 'phase' && beatGone === ban.n) && (
          <div
            class={`phasebanner ${ban.kind}`}
            key={ban.n}
            data-testid={ban.kind === 'phase' ? 'phase-beat' : 'phase-banner'}
            role="status"
            onClick={ban.kind === 'phase' ? () => setBeatGone(ban.n) : undefined}
          >
            {ban.text}
          </div>
        )}
        {recap && !over && (
          <div class="recap" data-testid="turn-summary">
            {recap}
          </div>
        )}
        {toast && (
          <div class="toast" role="status" data-testid="toast">
            {toast}
          </div>
        )}
        {over && !busy && !runNow && (
          <div class="result" data-testid="result" role="dialog" aria-label={c.outcome === 'won' ? 'Victory' : 'Defeat'}>
            <div class="panel">
              <h2>{c.outcome === 'won' ? 'Victory' : 'Defeat'}</h2>
              <p>
                {c.outcome === 'won'
                  ? `The machine scrapped every enemy in ${c.turn} ${c.turn === 1 ? 'turn' : 'turns'}.`
                  : 'You ran out of HP. A good machine is built one tick at a time.'}
              </p>
              {tut ? (
                <button class="primary" data-testid="again" onClick={() => tutorialAck()}>
                  Finish
                </button>
              ) : (
                <button class="primary" data-testid="again" onClick={() => newFight()}>
                  Again
                </button>
              )}
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
                class={`card ${sel === idx ? 'sel' : ''} ${glow.has(`card:${inst.defId}`) ? 'tut-glow' : ''}`}
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
                <TierMark rarity={def.rarity} />
                <span class="cfam" style={{ color: FAMILY_COLOR[def.family] }}>
                  {FAMILY_LABEL[def.family]}
                </span>
                <span class="ctext">{partText(inst.defId, inst.plus)}</span>
              </button>
            );
          })}
        </div>
        <div class="controls">
          <p class={`summary ${glow.has('preview') ? 'tut-glow' : ''}`} data-testid="preview" aria-live="polite">
            {preview ? (
              <>
                {damageText(preview)}, {preview.plating} Plating, {preview.ticks} ticks
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
            <button class={`primary run ${glow.has('run') ? 'tut-glow' : ''}`} data-testid="run" disabled={busy || over} onClick={doRun}>
              Run
            </button>
            <button class="speed" data-testid="speed" onClick={cycleSpeed} aria-label={`Animation speed ${speed.value}. Tap to change.`}>
              {speed.value === 'skip' ? 'Skip' : speed.value}
            </button>
          </div>
        </div>
      </footer>
      {intro && (
        <div class="bossintro" role="dialog" aria-label="Boss" data-testid="boss-intro">
          <div class="introcard">
            <p class="eyebrow">Act {intro.act} boss</p>
            <h2>{intro.name}</h2>
            <p>{intro.line}</p>
            <button class="primary" data-testid="boss-intro-go" onClick={() => (bossIntro.value = null)}>
              Face it
            </button>
          </div>
        </div>
      )}
      {tipInfo && !gloss && <Tooltip tip={tipInfo} onEnter={keepTip} onLeave={hideSoon} />}
      {ghost && c.hand[ghost.idx] !== undefined && (
        <div class="dragghost" style={{ left: `${ghost.x}px`, top: `${ghost.y}px` }}>
          {partName(c.parts[c.hand[ghost.idx]].defId, c.parts[c.hand[ghost.idx]].plus)}
        </div>
      )}
    </main>
  );
}

