import { climbing, continueRun, enterWorkshop, hasOngoingFight, newFight, openPractice, openSlots, resume, startTutorial } from '../app/controller';
import { openGlossary, openHowTo, openSettings } from '../app/prefs';
import { unlockAudio } from '../audio/synth';
import { useEffect, useRef, useState } from 'preact/hooks';
import { tutorialDone, tutorialV2Seen } from '../app/prefs';
import { startTitleAmbience, TITLE_SIZE, TITLE_TOWER, titleView } from './titleAmbience';
import './title.css';

const PAINTING = `${(import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/'}art/title/painting.webp`;

/** The painting's place on screen for the viewport, the tower's box on it, and the two control columns that flank the tower. */
function useTitleLayout() {
  const [vp, setVp] = useState<[number, number]>([window.innerWidth, window.innerHeight]);
  useEffect(() => {
    const on = (): void => setVp([window.innerWidth, window.innerHeight]);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const [W, H] = vp;
  const { s, ox, oy } = titleView(W, H);
  const tx0 = ox + TITLE_TOWER[0] * s;
  const tx1 = ox + TITLE_TOWER[2] * s;
  const ty0 = oy + TITLE_TOWER[1] * s;
  const ty1 = oy + TITLE_TOWER[3] * s;
  const gap = W < 700 ? 10 : 24;
  const leftW = Math.max(150, Math.min(360, tx0 - gap * 2));
  const rightL = tx1 + gap;
  const rightW = Math.max(150, Math.min(340, W - rightL - gap));
  return { W, H, s, ox, oy, tower: { x: tx0, y: ty0, w: tx1 - tx0, h: ty1 - ty0 }, gap, leftW, rightL, rightW };
}


export function Title() {
  const ongoing = hasOngoingFight();
  const inRun = climbing();
  const L = useTitleLayout();
  const [loaded, setLoaded] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const amb = useRef<{ resize(): void } | null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const a = startTitleAmbience(canvas.current, { still });
    amb.current = a;
    return () => a.stop();
  }, []);
  useEffect(() => amb.current?.resize(), [L.W, L.H]);
  const banner = tutorialDone() && !tutorialV2Seen();
  const style = { '--lw': `${L.leftW}px`, '--rl': `${L.rightL}px`, '--rw': `${L.rightW}px`, '--gap': `${L.gap}px` } as Record<string, string>;
  return (
    <main class="tt" data-testid="title" style={style}>
      <img
        class="tt-art"
        data-testid="title-art"
        data-loaded={loaded ? 'true' : 'false'}
        src={PAINTING}
        alt=""
        aria-hidden="true"
        width={TITLE_SIZE[0]}
        height={TITLE_SIZE[1]}
        style={{ left: `${L.ox}px`, top: `${L.oy}px`, width: `${TITLE_SIZE[0] * L.s}px`, height: `${TITLE_SIZE[1] * L.s}px`, opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
      />
      <canvas class="tt-amb" data-testid="title-ambience" ref={canvas} aria-hidden="true" style={{ opacity: loaded ? 1 : 0 }} />
      <div class="tt-vig" aria-hidden="true" />
      <div class="tt-tower" data-testid="title-tower" aria-hidden="true" style={{ left: `${L.tower.x}px`, top: `${L.tower.y}px`, width: `${L.tower.w}px`, height: `${L.tower.h}px` }} />
      <div class="tt-col tt-left">
        <p class="eyebrow">A machine-building roguelite</p>
        <h1 class="tt-logo" data-testid="title-heading">
          <span>Clockwork</span> <span>Spire</span>
        </h1>
        <p class="lede">Place the parts. Wind the Mainspring. Watch the machine do the fighting.</p>
        {banner && (
          <p class="tt-banner" data-testid="title-banner">
            There's a new tutorial for the new Spire.
          </p>
        )}
        <div class="title-actions">
          {inRun ? (
            <button
              class="primary"
              data-testid="continue-run"
              onClick={() => {
                unlockAudio();
                continueRun();
              }}
            >
              Continue climb
            </button>
          ) : (
            <button
              class="primary"
              data-testid="climb"
              onClick={() => {
                unlockAudio();
                enterWorkshop();
              }}
            >
              Climb the Spire
            </button>
          )}
        </div>
        <div class="tt-pills">
          {ongoing && (
            <button
              class="secondary pill"
              data-testid="continue"
              onClick={() => {
                unlockAudio();
                resume();
              }}
            >
              Resume practice
            </button>
          )}
          <button class="secondary pill" data-testid="open-slots" onClick={() => void openSlots()}>
            Save slots
          </button>
          <button
            class="secondary pill"
            data-testid="practice"
            onClick={() => {
              unlockAudio();
              newFight();
            }}
          >
            {ongoing ? 'New practice fight' : 'Practice fight'}
          </button>
          <button class="secondary pill" data-testid="sandbox" onClick={openPractice}>
            Sandbox
          </button>
          <button
            class="secondary pill"
            data-testid="tutorial"
            onClick={() => {
              unlockAudio();
              startTutorial();
            }}
          >
            Tutorial
          </button>
          <button class="secondary pill" data-testid="open-howto" onClick={() => openHowTo()}>
            How to play
          </button>
          <button class="secondary pill" data-testid="open-glossary" onClick={() => openGlossary()}>
            Glossary
          </button>
          <button class="secondary pill" data-testid="open-settings" onClick={() => openSettings()}>
            Settings
          </button>
        </div>
      </div>
    </main>
  );
}
