// Where the game finds a painted character by id (D-033). Character modules are code-split and load on demand, so the
// first screen does not pay for the whole bestiary; `characterFor` is synchronous and answers undefined until a module has
// loaded, which is when the stage draws the code-drawn fallback. Add a line here when `src/art/<id>.ts` lands.
import { MANIFEST } from './manifest';
import type { CharacterDef } from './types';

const LOADERS: Record<string, () => Promise<{ default: CharacterDef }>> = {
  'cog-rat': () => import('./cog-rat'),
  'rust-mite': () => import('./rust-mite'),
  'brass-beetle': () => import('./brass-beetle'),
  'oil-slick': () => import('./oil-slick'),
  'spring-imp': () => import('./spring-imp'),
  gearhound: () => import('./gearhound'),
  'tinpot-general': () => import('./tinpot-general'),
  foreman: () => import('./foreman'),
  boilermaker: () => import('./boilermaker'),
  clockmaker: () => import('./clockmaker'),
  tinker: () => import('./tinker'),
  sprocket: () => import('./sprocket'),
};

const ready = new Map<string, CharacterDef>();
const pending = new Map<string, Promise<CharacterDef | undefined>>();

/** True when a painted character exists for this id (loaded or not). */
export function hasCharacter(id: string): boolean {
  return id in LOADERS;
}

export function characterFor(id: string): CharacterDef | undefined {
  return ready.get(id);
}

/** Start loading a character module; resolves when it is available (or undefined when there is none or it failed). */
export function loadCharacter(id: string): Promise<CharacterDef | undefined> {
  const have = ready.get(id);
  if (have) return Promise.resolve(have);
  const run = pending.get(id);
  if (run) return run;
  const load = LOADERS[id];
  if (!load) return Promise.resolve(undefined);
  const p = load()
    .then((m) => {
      ready.set(id, m.default);
      return m.default;
    })
    .catch(() => {
      pending.delete(id);
      return undefined;
    });
  pending.set(id, p);
  return p;
}

/** The ids of the characters an act ships (0 = Bellfoot and the player). */
export function charactersOfAct(act: 0 | 1 | 2 | 3): string[] {
  return MANIFEST.filter((e) => e.act === act).map((e) => e.id);
}

/** Fetch an act's character modules ahead of time (textures: RigHub.loadAct). */
export function loadAct(act: 0 | 1 | 2 | 3): Promise<unknown> {
  return Promise.all(charactersOfAct(act).map(loadCharacter));
}
