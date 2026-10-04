// Small UI preferences and overlay state. Stored in localStorage for now; the settings screen arrives in B5.
import { signal } from '@preact/signals';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode or full: the preference just won't stick */
  }
}

/** "Color-blind icons": a text label under every intent icon. */
export const colorBlind = signal<boolean>(read('cs.colorBlind') === '1');

export function setColorBlind(on: boolean): void {
  colorBlind.value = on;
  write('cs.colorBlind', on ? '1' : '0');
}

export function tutorialDone(): boolean {
  return read('cs.tutorialDone') === '1';
}

export function markTutorialDone(): void {
  write('cs.tutorialDone', '1');
}

/** The glossary overlay: null = closed, otherwise the term to scroll to (empty string = just open). */
export const glossaryOpen = signal<string | null>(null);

export function openGlossary(term = ''): void {
  glossaryOpen.value = term;
}

export function closeGlossary(): void {
  glossaryOpen.value = null;
}

/** The bin viewer overlay (all the parts of the current run). */
export const binOpen = signal(false);

/** The settings and how-to-play overlays. */
export const settingsOpen = signal(false);
export const howtoOpen = signal(false);
/** A phone held upright: the game asks to be turned sideways. */
export const portrait = signal(false);

export function openSettings(): void {
  settingsOpen.value = true;
}
export function openHowTo(): void {
  howtoOpen.value = true;
}

/** Close the topmost overlay. Returns whether one was open. */
export function closeTopOverlay(): boolean {
  // the glossary sits on top of everything, so it closes first
  if (glossaryOpen.value !== null) glossaryOpen.value = null;
  else if (settingsOpen.value) settingsOpen.value = false;
  else if (howtoOpen.value) howtoOpen.value = false;
  else if (binOpen.value) binOpen.value = false;
  else return false;
  return true;
}

/** A new version of the game has downloaded (offline worker): offer it quietly, never during a fight. */
export const showUpdate = signal(false);
let updater: (() => void) | null = null;
export function setUpdater(fn: (() => void) | null): void {
  updater = fn;
}
export function applyUpdate(): void {
  updater?.();
}
