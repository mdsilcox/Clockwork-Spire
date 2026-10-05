// Bellfoot (B10a): the town between runs. One street, wider than the screen, that scrolls inside its own frame; the tinker walks to
// a place, Sprocket follows; every place opens a panel over the street. The street is drawn in code (bellfootScene.ts) until a
// painted scene exists (src/art/scenes/bellfoot.ts); the tinker and Sprocket are painted rigs drawn by the shared RigHub.
import { signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  checkSleepy,
  newFight,
  news,
  openPlaceId,
  openPractice,
  openSlots,
  petSprocket,
  poke,
  pose,
  profileView,
  setCollar,
  slotNo,
  speed,
  startTutorial,
  goTitle,
  townJump,
  townPlace,
} from '../app/controller';
import { colorBlind, openGlossary, openHowTo, openSettings, setColorBlind } from '../app/prefs';
import { loadCharacter } from '../art';
import type { CharacterDef } from '../art/types';
import { BELLFOOT } from '../art/scenes/bellfoot';
import type { SceneDef } from '../art/scenes/bellfoot';
import { COLLARS } from '../core/content/collars';
import { CHASSIS } from '../core/content/chassis';
import { EVENTS } from '../core/content/events';
import { RESIDENT_BY_ID } from '../core/content/residents';
import type { Profile } from '../core/types';
import { playMood, playPet } from '../audio/sprocket';
import { unlockAudio } from '../audio/synth';
import type { RigHandle } from '../render/rig';
import { sharedRigHub } from '../render/rig';
import { Archivist } from './Archivist';
import { ClockTower } from './ClockTower';
import { drawAmbience, drawStreet, VIEW_H, VIEW_TOP } from './bellfootScene';
import { drawStalls } from './bellfootStalls';
import { fmt } from './format';
import { Trophies } from './Trophies';
import { GatePanel, WorkshopPanel } from './Workshop';
import { GROUND_Y, SCENE_H, SCENE_W, townPlaces } from './town';
import type { TownPlace } from './town';
import './bellfoot.css';


const SCENE = BELLFOOT as SceneDef | null;

/** The label on a place's button, in one case style: "Spire gate", "Trophy shelf", "Oil Merchant" (a stall shows its resident). */
function shortLabel(q: TownPlace): string {
  if (q.id.startsWith('stall-')) return RESIDENT_BY_ID[q.id.slice(6)]?.name.replace(/^The /, '').replace("Trader's Cousin", 'Cousin') ?? q.label;
  const s = q.label.replace(/^The /, '');
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace('sprocket', 'Sprocket');
}

const LINE: Record<string, string> = {
  celebrate: 'Sprocket spins in circles. He is very proud of you.',
  happy: 'Sprocket wiggles all over.',
  comfort: 'Sprocket trots over and leans on your leg.',
  sleepy: 'Sprocket is asleep, one ear twitching.',
  pet: 'Boof!',
  walk: 'Sprocket trots along beside you.',
  idle: '',
};

/** The rig mood for Sprocket's state (his rig knows idle, happy, sleepy, walk). */
const SPROCKET_RIG: Record<string, string> = { idle: 'idle', happy: 'happy', celebrate: 'happy', comfort: 'happy', pet: 'happy', sleepy: 'sleepy', walk: 'walk', sniff: 'idle', run: 'walk' };

const WALK_SPEED: Record<string, number> = { '1x': 700, '2x': 1400, skip: 1e9 };

// ---------- the walk, shared between the street and the town menu ----------

/** True while the tinker walks (data-walking). */
const walking = signal(false);

function earnedCollars(p: Profile): { id: string; name: string; color: string }[] {
  const names = p.rewards?.collars ?? [];
  return COLLARS.filter((c) => (p.collars ?? []).includes(c.id) || names.includes(c.name));
}

// ---------- the street ----------

function Street({ places, p }: { places: TownPlace[]; p: Profile }) {
  const frame = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLCanvasElement>(null);
  const tinkerEl = useRef<HTMLDivElement>(null);
  const sprocketEl = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ w: 640, h: 300 });
  const scale = Math.max(size.h / VIEW_H, size.w / SCENE_W);
  const cssW = Math.round(SCENE_W * scale);
  const cssH = Math.round(VIEW_H * scale);
  // mutable walk state (the animation loop reads it every frame)
  const s = useRef({ tx: places[0].x, target: places[0].x, heading: townPlace.peek(), sx: places[0].x - 80, mood: 'idle', tmood: 'idle', collarKey: '', settle: 0 });
  const lastTap = useRef<string | null>(null);
  const placesRef = useRef(places);
  placesRef.current = places;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const collarRef = useRef<string | null>(p.collar ?? null);
  collarRef.current = p.collar ?? null;
  const walkMood = walking.value;
  const mood = walkMood ? 'walk' : pose.value;

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let raf = 0;
    const measure = (): void => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((o) => (o.w === w && o.h === h ? o : { w, h }));
    };
    measure();
    // measured on the next frame: a resize that sets state in the observer callback trips "ResizeObserver loop" errors
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const placeX = (id: string): number => placesRef.current.find((q) => q.id === id)?.x ?? placesRef.current[0].x;

  /** Put the camera so the place is on screen, at once (a smooth scroll would still be moving when the walk starts). */
  const look = (x: number): void => {
    const el = frame.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, x * scaleRef.current - el.clientWidth / 2));
  };

  /** Walk to a place (or arrive at once at skip speed). */
  const walkTo = (id: string): void => {
    const st = s.current;
    st.heading = id;
    lastTap.current = id;
    townPlace.value = id;
    st.target = placeX(id);
    poke();
    look(st.target);
    const el = frame.current;
    if (el && scaleRef.current > 0) {
      const left = el.scrollLeft / scaleRef.current;
      const right = (el.scrollLeft + el.clientWidth) / scaleRef.current;
      // a long walk enters from the edge of the screen
      if (st.tx < left - 60) st.tx = left - 60;
      if (st.tx > right + 60) st.tx = right + 60;
    }
    if (speed.value === 'skip') {
      st.tx = st.target;
      walking.value = false;
    } else if (Math.abs(st.tx - st.target) > 4) walking.value = true;
  };

  const arrive = (): void => {
    s.current.tx = s.current.target;
    walking.value = false;
  };

  /** A tap on a place: walk there; at the place (or while still walking to it) open it. */
  const tapPlace = (id: string): void => {
    unlockAudio();
    // the first tap walks (or just says "here"); a second tap on the same place, walking or not, opens it at once
    if (s.current.heading === id && lastTap.current === id) {
      arrive();
      openPlaceId.value = id;
      return;
    }
    walkTo(id);
  };

  // the town menu (or a Continue) moved the tinker without walking: jump to it
  const jump = townJump.value;
  useEffect(() => {
    const tp = townPlace.peek();
    const st = s.current;
    if (st.heading !== tp) {
      st.heading = tp;
      st.target = placeX(tp);
      st.tx = st.target;
      walking.value = false;
      look(st.target);
    }
  }, [jump]);

  const onKey = (e: KeyboardEvent): void => {
    const list = placesRef.current;
    const i = Math.max(0, list.findIndex((q) => q.id === s.current.heading));
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      walkTo(list[Math.min(list.length - 1, i + 1)].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      walkTo(list[Math.max(0, i - 1)].id);
    } else if (e.key === 'Enter' && e.target === e.currentTarget) {
      e.preventDefault();
      arrive();
      openPlaceId.value = s.current.heading;
    }
  };

  // the static street, drawn once per size
  useEffect(() => {
    const cv = bg.current;
    if (!cv || cssW < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2, 4096 / cssW);
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    const c = cv.getContext('2d');
    if (!c) return;
    const k = scale * dpr;
    c.setTransform(k, 0, 0, k, 0, -VIEW_TOP * k);
    if (!SCENE) drawStreet(c, places);
  }, [cssW, cssH, places.map((q) => q.id).join(',')]);

  // the painted scene's layers, with parallax, once an art lane ships one
  const layerRefs = useRef<HTMLImageElement[]>([]);
  const onScroll = (): void => {
    const el = frame.current;
    if (!el || !SCENE) return;
    SCENE.layers.forEach((l, i) => {
      const im = layerRefs.current[i];
      if (im) im.style.transform = `translateX(${el.scrollLeft * (1 - l.parallax)}px)`;
    });
  };

  // the live layer: rigs through the shared hub, the collar, lamp flicker and steam
  useEffect(() => {
    const cv = stage.current;
    const box = wrap.current;
    if (!cv || !box || cssW < 2) return;
    const hub = sharedRigHub();
    const dpr = Math.min(window.devicePixelRatio || 1, 2, 4096 / cssW);
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const gl = hub.mount(cv);
    let top: HTMLCanvasElement | null = null;
    let tctx: CanvasRenderingContext2D | null = null;
    if (gl) {
      top = document.createElement('canvas');
      top.className = cv.className;
      top.setAttribute('aria-hidden', 'true');
      top.width = cv.width;
      top.height = cv.height;
      gl.after(top);
      tctx = top.getContext('2d');
    }
    hub.resize(cssW, cssH, dpr);
    let dead = false;
    let raf = 0;
    const handles: { tinker?: RigHandle; sprocket?: RigHandle } = {};
    const defs: { tinker?: CharacterDef; sprocket?: CharacterDef } = {};
    void Promise.all([loadCharacter('tinker'), loadCharacter('sprocket'), hub.loadAct(0)]).then(([tk, sp]) => {
      if (dead) return;
      defs.tinker = tk;
      defs.sprocket = sp;
    });

    const rectFor = (def: CharacterDef, cx: number, artH: number): { x: number; y: number; w: number; h: number } => {
      const k = scaleRef.current;
      const WW = def.size[0] + 2 * def.pad[0];
      const WH = def.size[1] + 2 * def.pad[1];
      const h = ((artH * k) / def.size[1]) * WH;
      const w = (h / WH) * WW;
      const artBottom = ((def.pad[1] + def.size[1]) / WH) * h;
      return { x: cx * k - w / 2, y: (GROUND_Y + 14 - VIEW_TOP) * k - artBottom, w, h };
    };

    const t0 = performance.now();
    let last = t0;
    const frameFn = (nowMs: number): void => {
      raf = requestAnimationFrame(frameFn);
      const st = s.current;
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      const now = (nowMs - t0) / 1000;
      const k = scaleRef.current;
      // walk
      const dx = st.target - st.tx;
      if (Math.abs(dx) > 0.5) {
        const step = (WALK_SPEED[speed.value] ?? 700) * dt;
        st.tx += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;
        if (Math.abs(st.target - st.tx) <= 0.5) walking.value = false;
      } else if (walking.value) walking.value = false;
      const want = st.tx - 80 * (st.target >= st.tx - 1 ? 1 : -1);
      st.sx += (want - st.sx) * Math.min(1, dt * 5);
      // the camera keeps the walker (and the dog behind him) fully on screen
      const sc = frame.current;
      // only while he walks and for a moment after, so a reader's own scrolling is left alone
      if (Math.abs(dx) > 0.5) st.settle = 12;
      else if (st.settle > 0) st.settle--;
      if (sc && st.settle > 0) {
        const px = st.tx * k;
        const lo = Math.min(st.sx, st.tx) * k - 70;
        const hi = px + 90;
        if (hi > sc.scrollLeft + sc.clientWidth) sc.scrollLeft = hi - sc.clientWidth;
        else if (lo < sc.scrollLeft) sc.scrollLeft = Math.max(0, lo);
      }
      // markers
      if (tinkerEl.current) tinkerEl.current.style.transform = `translate(${st.tx * k}px, ${(GROUND_Y - VIEW_TOP) * k}px)`;
      if (sprocketEl.current) sprocketEl.current.style.transform = `translate(${st.sx * k - 36}px, ${(GROUND_Y + 14 - VIEW_TOP) * k - 56}px)`;
      // rigs
      ctx.clearRect(0, 0, cv.width, cv.height);
      tctx?.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (hub.ready()) {
        if (defs.tinker && !handles.tinker) handles.tinker = hub.add(defs.tinker, rectFor(defs.tinker, st.tx, 210));
        if (defs.sprocket && !handles.sprocket) handles.sprocket = hub.add(defs.sprocket, rectFor(defs.sprocket, st.sx, 78));
        if (handles.tinker && defs.tinker) {
          handles.tinker.setRect(rectFor(defs.tinker, st.tx, 210));
          const m = walking.peek() ? 'walk' : pose.peek() === 'celebrate' ? 'cheer' : 'idle';
          if (m !== st.tmood) {
            st.tmood = m;
            handles.tinker.setMood(m);
          }
        }
        if (handles.sprocket && defs.sprocket) {
          handles.sprocket.setRect(rectFor(defs.sprocket, st.sx, 78));
          const m = SPROCKET_RIG[walking.peek() ? 'walk' : pose.peek()] ?? 'idle';
          if (m !== st.mood) {
            st.mood = m;
            handles.sprocket.setMood(m);
          }
        }
        hub.frame(ctx, now, tctx ?? ctx);
        // the collar: a band at his neck anchor, over the painting
        const col = COLLARS.find((c) => c.id === collarRef.current);
        const a = col && handles.sprocket?.ready() ? handles.sprocket.anchor('collar') : null;
        if (col && a && tctx) {
          const r = Math.max(5, a[2] * ((78 * k) / (defs.sprocket?.size[1] ?? 780)));
          tctx.save();
          tctx.translate(a[0], a[1]);
          tctx.rotate(-0.25);
          tctx.fillStyle = col.color;
          tctx.fillRect(-r * 0.9, -r * 0.32, r * 1.8, r * 0.64);
          tctx.strokeStyle = 'rgba(0,0,0,0.45)';
          tctx.lineWidth = 1;
          tctx.strokeRect(-r * 0.9, -r * 0.32, r * 1.8, r * 0.64);
          if (col.id === 'bell') {
            tctx.fillStyle = '#e8c860';
            tctx.beginPath();
            tctx.arc(0, r * 0.45, r * 0.3, 0, Math.PI * 2);
            tctx.fill();
          }
          tctx.restore();
        }
      }
      // the living layer, in scene units: lamp glow and chimney steam
      const c2 = tctx ?? ctx;
      c2.save();
      c2.scale(k, k);
      c2.translate(0, -VIEW_TOP);
      if (SCENE) drawAmbience(c2, now, SCENE.ambience?.lamps ?? [], SCENE.ambience?.chimneys ?? []);
      else drawAmbience(c2, now);
      drawStalls(c2, now, new Set(placesRef.current.map((q) => q.id)));
      c2.restore();
      st.collarKey = collarRef.current ?? '';
    };
    raf = requestAnimationFrame(frameFn);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      handles.tinker?.dispose();
      handles.sprocket?.dispose();
      hub.unmount();
      top?.remove();
    };
  }, [cssW, cssH]);

  // Sprocket's sounds follow his mood
  useEffect(() => {
    playMood((mood === 'walk' ? 'run' : mood) as never);
  }, [mood]);

  useEffect(() => {
    const t = window.setInterval(checkSleepy, 1000);
    return () => window.clearInterval(t);
  }, []);

  const label = (q: TownPlace): string => q.label;
  const btnW = (q: TownPlace): number => (q.id.startsWith('stall-') ? 76 : 96);
  /** Left edges of the place buttons: centered under their fronts, pushed apart so none overlaps, kept inside the scene. */
  const lefts = new Map<string, number>();
  {
    let edge = 2;
    for (const q of places) {
      const l = Math.max(edge, q.x * scale - btnW(q) / 2);
      lefts.set(q.id, l);
      edge = l + btnW(q) + 4;
    }
    let limit = cssW - 2;
    for (let i = places.length - 1; i >= 0; i--) {
      const q = places[i];
      const l = Math.min(lefts.get(q.id) ?? 0, limit - btnW(q));
      lefts.set(q.id, l);
      limit = l - 4;
    }
  }
  /** One painted layer: as tall as the scene, bottom-aligned (the sky above the street's view is cropped), moved by parallax on scroll. */
  const layerImg = (l: { src: string; parallax: number }, i: number) => (
    <img
      key={l.src}
      ref={(el) => {
        if (el) layerRefs.current[i] = el;
      }}
      src={`${import.meta.env.BASE_URL}${l.src}`}
      style={{ height: `${(SCENE?.size[1] ?? SCENE_H) * scale}px` }}
      alt=""
      draggable={false}
    />
  );
  return (
    <div class="streetframe">
      <div class="street" data-testid="town-street" ref={frame} tabIndex={0} aria-label="The street. Left and Right walk to the next place, Enter opens it." onKeyDown={(e) => onKey(e as unknown as KeyboardEvent)} onScroll={onScroll}>
        <div class="scene" style={{ width: `${cssW}px`, height: `${cssH}px` }}>
          {SCENE && <div class="scenelayers" aria-hidden="true">{SCENE.layers.slice(0, -1).map((l, i) => layerImg(l, i))}</div>}
          <canvas class="streetbg" ref={bg} aria-hidden="true" />
          <div class="stagewrap" ref={wrap}>
            <canvas class="townstage" ref={stage} aria-hidden="true" />
          </div>
          {SCENE && <div class="scenelayers" aria-hidden="true">{SCENE.layers.slice(-1).map((l) => layerImg(l, SCENE.layers.length - 1))}</div>}
          {places.map((q) => (
            <button
              key={q.id}
              class={`place ${q.id.startsWith('stall-') ? 'stall' : ''} ${townPlace.value === q.id ? 'here' : ''}`}
              style={{ left: `${lefts.get(q.id) ?? 0}px`, top: `${(GROUND_Y - VIEW_TOP) * scale + 40}px`, width: `${btnW(q)}px` }}
              data-testid={`place-${q.id}`}
              aria-label={label(q)}
              title={label(q)}
              onClick={() => tapPlace(q.id)}
            >
              <span class="plabel">{shortLabel(q)}</span>
            </button>
          ))}
          <div class="tinkermark" ref={tinkerEl} data-testid="town-tinker" data-at={townPlace.value} data-walking={walkMood ? 'true' : 'false'} aria-hidden="true" />
          <button
            class="sprocketmark"
            ref={sprocketEl}
            data-testid="sprocket"
            data-mood={mood}
            data-collar={p.collar ?? ''}
            aria-label="Sprocket the corgi. Tap to pet him."
            onClick={() => {
              playPet();
              petSprocket();
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- the place panels ----------

function SprocketCorner({ p }: { p: Profile }) {
  const mine = earnedCollars(p);
  return (
    <section class="cornerpanel" data-testid="corner">
      <p class="cornerline">{LINE[pose.value] || 'A blanket, a bowl and a ball with a dent in it. Sprocket is somewhere nearby.'}</p>
      <h3>Collars</h3>
      {mine.length === 0 && <p class="empty">He has no collars yet. Some feats come with one.</p>}
      <div class="collars">
        {mine.map((c) => (
          <button key={c.id} class="collarbtn" data-testid={`collar-${c.id}`} aria-pressed={p.collar === c.id} onClick={() => setCollar(c.id)}>
            <i style={{ background: c.color }} aria-hidden="true" />
            {c.name}
          </button>
        ))}
        <button class="collarbtn" data-testid="collar-none" aria-pressed={!p.collar} onClick={() => setCollar(null)}>
          No collar
        </button>
      </div>
    </section>
  );
}

/** What each resident does for every later climb (content/residents.ts effects, in words). */
const STALL_DOES: Record<string, string> = {
  'oil-merchant': 'Oil Flasks: 2 per climb. Drink one in any room: heal 15 HP, no hour passes.',
  apprentice: 'One of your starting parts is already upgraded.',
  lamplighter: "Every act's rooms are lit: you see what each one is before you walk in.",
  'hour-ghost': 'The archivist writes fuller journal pages and bestiary entries.',
  'traders-cousin': 'One extra trader in every act, and a fight room fewer.',
};

function Stall({ id }: { id: string }) {
  const r = RESIDENT_BY_ID[id.replace(/^stall-/, '')];
  if (!r) return <p class="empty">Nobody is here.</p>;
  const ev = EVENTS[r.eventId];
  return (
    <section class="stallpanel" data-testid="stall">
      <p class="stallsay">{r.stall}</p>
      <dl class="stalldl">
        <dt>Every climb</dt>
        <dd>{STALL_DOES[r.id] ?? 'A little help, kept for you.'}</dd>
        <dt>How they came</dt>
        <dd>You met them in the Spire: {ev ? `"${ev.title}"` : 'a chance meeting'}. They moved to Bellfoot when the climb ended.</dd>
      </dl>
    </section>
  );
}

function PlacePanel({ id, p, places }: { id: string; p: Profile; places: TownPlace[] }) {
  const q = places.find((x) => x.id === id);
  let body;
  if (id === 'gate') body = <GatePanel p={p} />;
  else if (id === 'workshop') body = <WorkshopPanel p={p} />;
  else if (id === 'sprocket') body = <SprocketCorner p={p} />;
  else if (id === 'trophies') body = <div class="trophywrap"><Trophies p={p} /></div>;
  else if (id === 'archivist') body = <Archivist p={p} />;
  else if (id.startsWith('stall-')) body = <Stall id={id} />;
  else body = <ClockTower p={p} />;
  const wide = id === 'workshop' || id === 'archivist' || id === 'trophies' || id === 'gate';
  return (
    <div class="placepanel" data-testid="place-panel" data-place={id} role="dialog" aria-label={q?.label ?? id} onClick={(e) => e.target === e.currentTarget && (openPlaceId.value = null)}>
      <div class={`placecard ${wide ? 'wide' : ''}`}>
        <header class="placehead">
          <h2>{q?.label ?? id}</h2>
          <button class="ghostbtn" data-testid="place-close" onClick={() => (openPlaceId.value = null)}>
            Close
          </button>
        </header>
        <div class="placebody">{body}</div>
      </div>
    </div>
  );
}

// ---------- the screen ----------

export function BellfootScreen() {
  const p = profileView.value;
  const [menu, setMenu] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const cb = colorBlind.value;
  const newsNow = news.value;
  const open = openPlaceId.value;
  const residents = p?.residents ?? [];
  const places = useMemo(() => townPlaces(residents), [residents.join(',')]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && openPlaceId.peek()) {
        openPlaceId.value = null;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    openPlaceId.value = null;
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // the menus close on a tap outside them
  useEffect(() => {
    if (!menu && !placesOpen) return;
    const away = (e: PointerEvent): void => {
      if (!(e.target as HTMLElement | null)?.closest?.('.menuwrap')) {
        setMenu(false);
        setPlacesOpen(false);
      }
    };
    window.addEventListener('pointerdown', away, true);
    return () => window.removeEventListener('pointerdown', away, true);
  }, [menu, placesOpen]);

  if (!p) return null;
  const mood = walking.value ? 'walk' : pose.value;
  return (
    <main class="bellfoot" data-testid="bellfoot" data-slot={slotNo.value ?? ''} onPointerDown={poke} onKeyDown={poke}>
      <header class="wshead">
        <div class="wstitle">
          <b data-testid="ws-name">{p.name}</b>
          <span>Bellfoot</span>
        </div>
        <div class="pill brass" data-testid="ws-brass">
          <b>{fmt(p.brass)}</b>
          <span class="lbl">Brass</span>
        </div>
        <div class="pill" data-testid="ws-blueprints">
          <b>{p.blueprints.length}</b>
          <span class="lbl">Blueprints</span>
        </div>
        <div class="menuwrap">
          <button class="ghostbtn menu" data-testid="town-menu" aria-expanded={placesOpen} onClick={() => (setPlacesOpen(!placesOpen), setMenu(false))}>
            Places
          </button>
          {placesOpen && (
            <div class="menupanel" role="menu" data-testid="town-menu-panel">
              {places.map((q) => (
                <button
                  key={q.id}
                  role="menuitem"
                  data-testid={`town-menu-${q.id}`}
                  onClick={() => {
                    setPlacesOpen(false);
                    unlockAudio();
                    townPlace.value = q.id;
                    townJump.value++;
                    openPlaceId.value = q.id;
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div class="menuwrap">
          <button class="ghostbtn menu" data-testid="ws-menu" aria-expanded={menu} onClick={() => (setMenu(!menu), setPlacesOpen(false))}>
            Menu
          </button>
          {menu && (
            <div class="menupanel" role="menu" data-testid="ws-menu-panel">
              <button role="menuitem" onClick={() => (setMenu(false), openGlossary())}>
                Glossary
              </button>
              <button role="menuitem" data-testid="ws-howto" onClick={() => (setMenu(false), openHowTo())}>
                How to play
              </button>
              <button role="menuitem" data-testid="ws-settings" onClick={() => (setMenu(false), openSettings())}>
                Settings
              </button>
              <label class="check">
                <input type="checkbox" checked={cb} onChange={(e) => setColorBlind((e.currentTarget as HTMLInputElement).checked)} />
                Color-blind icons
              </label>
              <button role="menuitem" onClick={() => (setMenu(false), unlockAudio(), newFight())}>
                Practice fight
              </button>
              <button role="menuitem" onClick={() => (setMenu(false), openPractice())}>
                Practice sandbox
              </button>
              <button role="menuitem" onClick={() => (setMenu(false), unlockAudio(), startTutorial())}>
                Tutorial
              </button>
              <button role="menuitem" data-testid="ws-slots" onClick={() => (setMenu(false), void openSlots())}>
                Save slots
              </button>
              <button role="menuitem" data-testid="ws-title" onClick={goTitle}>
                Title
              </button>
            </div>
          )}
        </div>
      </header>
      <div class="townbody">
        <Street places={places} p={p} />
        {(newsNow?.moment || (newsNow && (newsNow.unlocks.length > 0 || newsNow.notes.length > 0))) && (
          <div class="townnews">
            {newsNow.moment && (
              <button class="pinnote" data-testid="moment-note" onClick={() => (news.value = { ...newsNow, moment: undefined })} aria-label={`${newsNow.moment.title}. ${newsNow.moment.text} Tap to put it away.`}>
                <span class="pin" aria-hidden="true" />
                <b>{newsNow.moment.title}</b>
                <span>{newsNow.moment.text}</span>
              </button>
            )}
            {(newsNow.unlocks.length > 0 || newsNow.notes.length > 0) && (
              <div class="newsstrip" data-testid="ws-news">
                {newsNow.unlocks.map((u) => (
                  <span key={u}>New: {CHASSIS[u]?.name ?? u} is unlocked.</span>
                ))}
                {newsNow.notes.length > 0 && <span>A new note is in the Workshop.</span>}
                <button class="ghostbtn small" onClick={() => (news.value = null)}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}
        {open && <PlacePanel id={open} p={p} places={places} />}
      </div>
      <p class="sprocketline" data-testid="sprocket-line" aria-live="polite">
        {LINE[mood]}
      </p>
    </main>
  );
}
