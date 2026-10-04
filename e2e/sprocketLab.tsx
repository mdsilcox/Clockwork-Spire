// Test scaffolding for e2e/sprocket.spec.ts: the spec imports this module in the running dev page and mounts
// Sprocket, the event art and the Ending on top of the app. It is not part of the game and no route links to it.
import { render } from 'preact';
import { Ending } from '../src/ui/Ending';
import { Sprocket, SprocketEventArt } from '../src/ui/Sprocket';
import type { SprocketPose } from '../src/ui/Sprocket';

const counts = { pets: 0, done: 0 };
(window as unknown as { __lab: typeof counts }).__lab = counts;

function host(): HTMLElement {
  let el = document.getElementById('sprocket-lab');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sprocket-lab';
    el.style.cssText = 'position:fixed;inset:0;z-index:100;background:#3a2b1f;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px';
    document.body.appendChild(el);
  }
  return el;
}

export function mountSprocket(mood: SprocketPose, size: number): void {
  render(<Sprocket mood={mood} size={size} onPet={() => counts.pets++} />, host());
}

export function mountEvent(eventId: string): void {
  render(<SprocketEventArt eventId={eventId} />, host());
}

export function mountEnding(): void {
  render(<Ending stats={{ runs: 3, turns: 41, biggestTurn: 57, chassis: 'tinker' }} onDone={() => counts.done++} />, host());
}

export function unmount(): void {
  render(null, host());
}
