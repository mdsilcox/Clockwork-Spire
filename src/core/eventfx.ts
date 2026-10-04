// What each event choice does (the text lives in content/events.ts). Pure; uses the `event` stream.
import { int, next, pick } from './rng';
import { partDef, partName } from './content/parts';
import { trinketDef } from './content/trinkets';
import { addBlueprint, gainTrinket, heal, hurt, newPart, partPool, randomPart, randomTrinket, rollBlueprint } from './rewards';
import type { Family, PartInstance, Pending, RunState } from './types';

type NeedKind = NonNullable<Extract<Pending, { kind: 'event' }>['needsPart']>;

export interface Effect {
  need?: NeedKind;
  /** Restrict the part pick to this family. */
  family?: Family;
  /** With a family: if no part matches, run on a random part immediately instead of asking. */
  randomIfNone?: boolean;
  prompt?: string;
  /** Runs the effect. `part` is the chosen (or random) part when `need` is set. Returns the outcome text. */
  run(run: RunState, part?: PartInstance): string;
}

const pn = (p: PartInstance) => partName(p.defId, p.plus);
const tn = (id: string) => trinketDef(id).name;

function removePart(run: RunState, uid: number): void {
  run.bin = run.bin.filter((p) => p.uid !== uid);
}

function upgradeRandom(run: RunState, count: number): string {
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const cand = run.bin.filter((p) => !p.plus);
    if (cand.length === 0) break;
    const p = pick(run.rng, 'event', cand);
    p.plus = true;
    names.push(pn(p));
  }
  return names.length ? `Upgraded: ${names.join(', ')}.` : 'Every part is already upgraded.';
}

function giveTrinket(run: RunState, id: string): string {
  if (gainTrinket(run, id)) return `Gained ${tn(id)}.`;
  run.cogs += 30;
  return `You already had ${tn(id)}, so it turns into 30 Cogs.`;
}

function givePart(run: RunState, defId: string): string {
  newPart(run, defId);
  return `Gained ${partName(defId, false)}.`;
}

function gainBlueprint(run: RunState, first?: string): string {
  let id: string | null = first && addBlueprint(run, first) ? first : null;
  if (!id) {
    id = rollBlueprint(run, 'event');
    if (id) addBlueprint(run, id);
  }
  if (!id) {
    run.cogs += 20;
    return 'There was nothing left to find. Gain 20 Cogs instead.';
  }
  return `Found the blueprint for ${partDef(id).name}.`;
}

const lose = (run: RunState, n: number) => {
  run.cogs = Math.max(0, run.cogs - n);
};

const sprocketTag = (run: RunState): string => giveTrinket(run, 'sprocket-tag');

export const EFFECTS: Record<string, Effect[]> = {
  'sprocket-blueprint': [
    { run: (r) => gainBlueprint(r, 'sprocket-wheel') },
    {
      run: (r) => {
        heal(r, 8);
        return 'Sprocket trots off. You feel lighter. Healed 8 HP.';
      },
    },
  ],
  'sprocket-pipe': [
    {
      run: (r) => {
        hurt(r, 6);
        return `A scorched knuckle later, he is free. Lost 6 HP. ${sprocketTag(r)}`;
      },
    },
    {
      need: 'remove',
      prompt: 'Choose a part to loosen the pipe with.',
      run: (r, p) => {
        removePart(r, p!.uid);
        return `${pn(p!)} is gone, and so is the pipe's grip. ${sprocketTag(r)}`;
      },
    },
  ],
  'sprocket-nap': [
    {
      run: (r) => {
        const n = Math.floor(r.maxHp * 0.25);
        heal(r, n);
        return `You doze beside him. Healed ${n} HP.`;
      },
    },
    {
      need: 'upgrade',
      prompt: 'Choose a part to upgrade.',
      run: (_r, p) => {
        p!.plus = true;
        return `The page is a sketch of a better ${partDef(p!.defId).name}. Upgraded ${pn(p!)}.`;
      },
    },
  ],
  journal: [
    { run: (r) => upgradeRandom(r, 1) },
    { run: (r) => givePart(r, randomPart(r, 'uncommon', 'event')) },
  ],
  'oil-merchant': [
    {
      run: (r) => {
        lose(r, 30);
        heal(r, 20);
        return 'Cool, thick oil. Healed 20 HP.';
      },
    },
    {
      need: 'sell',
      prompt: 'Choose a part to sell.',
      run: (r, p) => {
        removePart(r, p!.uid);
        r.cogs += 25;
        return `Sold ${pn(p!)} for 25 Cogs.`;
      },
    },
    { run: () => 'The cart rattles away.' },
  ],
  automaton: [
    {
      run: (r) => {
        hurt(r, 5);
        const id = randomPart(r, null, 'event');
        newPart(r, id);
        return `A hot spark, and it whirs. It leaves you ${partName(id, false)}. Lost 5 HP.`;
      },
    },
    {
      run: (r) => {
        r.cogs += 30;
        return 'Gain 30 Cogs.';
      },
    },
  ],
  'gear-gamble': [
    {
      run: (r) => {
        if (next(r.rng, 'event') < 0.5) {
          r.cogs += 60;
          return 'Click, click, click. Gain 60 Cogs.';
        }
        hurt(r, 8);
        return 'The wheel snaps back at you. Lost 8 HP.';
      },
    },
    { run: () => 'You walk on.' },
  ],
  'steam-bath': [
    {
      run: (r) => {
        lose(r, 10);
        heal(r, 15);
        return 'Warm and quiet. Healed 15 HP.';
      },
    },
    { run: (r) => giveTrinket(r, 'bellows') },
  ],
  'rusted-shrine': [
    {
      need: 'remove',
      prompt: 'Choose a part to leave on the shelf.',
      run: (r, p) => {
        removePart(r, p!.uid);
        return `You leave ${pn(p!)} among the gears.`;
      },
    },
    {
      run: (r) => {
        lose(r, 10);
        r.maxHp += 5;
        heal(r, 5);
        return 'Everything shines a little. Gain 5 max HP.';
      },
    },
  ],
  'mirror-clock': [
    {
      need: 'duplicate',
      prompt: 'Choose a part to duplicate.',
      run: (r, p) => {
        hurt(r, 10);
        newPart(r, p!.defId, p!.plus);
        return `The mirror hands back a second ${pn(p!)}. Lost 10 HP.`;
      },
    },
    { run: () => 'The hands run on, backwards.' },
  ],
  'toll-gate': [
    {
      run: (r) => {
        lose(r, 40);
        return 'The gate swings open. Paid 40 Cogs.';
      },
    },
    {
      run: (r) => {
        hurt(r, 7);
        return 'A scraped shin later, you are past. Lost 7 HP.';
      },
    },
  ],
  choir: [
    {
      run: (r) => {
        const chimes = partPool(r).filter((d) => d.family === 'chime');
        const id = chimes.length ? pick(r.rng, 'event', chimes).id : randomPart(r, null, 'event');
        return givePart(r, id);
      },
    },
    {
      need: 'upgrade',
      family: 'chime',
      randomIfNone: true,
      prompt: 'Choose a Chimes part to upgrade.',
      run: (_r, p) => {
        p!.plus = true;
        return `The choir settles into tune. Upgraded ${pn(p!)}.`;
      },
    },
  ],
  'collapsed-stair': [
    {
      run: (r) => {
        hurt(r, 8);
        r.stats.bonusBrass = (r.stats.bonusBrass ?? 0) + 15;
        return 'A rough landing, but the glint was real. Lost 8 HP. Gain 15 Brass.';
      },
    },
    {
      run: (r) => {
        lose(r, 10);
        return 'The long way costs a few Cogs in tolls and tips. Lost 10 Cogs.';
      },
    },
  ],
  apprentice: [
    { run: (r) => upgradeRandom(r, 2) },
    {
      need: 'upgrade',
      prompt: 'Choose a part to show them.',
      run: (r, p) => {
        hurt(r, 5);
        p!.plus = true;
        return `They nod and take notes. Upgraded ${pn(p!)}. Lost 5 HP.`;
      },
    },
  ],
  lantern: [
    {
      run: (r) => {
        hurt(r, 8);
        const id = randomTrinket(r, ['uncommon'], 'event');
        if (!id) return 'The lantern burns your hand and goes out. Lost 8 HP.';
        return `${giveTrinket(r, id)} It is hot to hold. Lost 8 HP.`;
      },
    },
    {
      run: (r) => {
        heal(r, 5);
        return 'You sit in its glow a moment. Healed 5 HP.';
      },
    },
  ],
  'pressure-leak': [
    {
      need: 'remove',
      family: 'steam',
      randomIfNone: true,
      prompt: 'Choose a Steam part to patch the pipe with.',
      run: (r, p) => {
        removePart(r, p!.uid);
        r.cogs += 40;
        return `${pn(p!)} seals the leak. Gain 40 Cogs.`;
      },
    },
    {
      run: (r) => {
        hurt(r, 5);
        return 'The steam finds you on the way out. Lost 5 HP.';
      },
    },
  ],
  'hour-ghost': [
    {
      need: 'transform',
      prompt: 'Choose a part to transform.',
      run: (r, p) => {
        const rarity = partDef(p!.defId).rarity;
        const id = randomPart(r, rarity, 'event', [p!.defId]);
        removePart(r, p!.uid);
        newPart(r, id, p!.plus);
        return `${pn(p!)} winds down and ${partName(id, p!.plus)} winds up in its place.`;
      },
    },
    {
      run: (r) => {
        r.stats.bonusBrass = (r.stats.bonusBrass ?? 0) + 10;
        return 'It speaks of a lonely maker and a clock that would not stop. Gain 10 Brass.';
      },
    },
  ],
  'scrap-heap': [
    { run: (r) => givePart(r, randomPart(r, 'common', 'event')) },
    {
      run: (r) => {
        hurt(r, 12);
        return `${givePart(r, randomPart(r, 'rare', 'event'))} Lost 12 HP.`;
      },
    },
  ],
  'old-forge': [
    {
      need: 'upgrade',
      prompt: 'Choose a part to upgrade.',
      run: (_r, p) => {
        p!.plus = true;
        return `The coals flare. Upgraded ${pn(p!)}.`;
      },
    },
    {
      run: (r) => {
        hurt(r, 6);
        return `${upgradeRandom(r, 2)} Lost 6 HP.`;
      },
    },
  ],
  teacup: [
    {
      run: (r) => {
        heal(r, 12);
        return 'Still warm. Healed 12 HP.';
      },
    },
    { run: (r) => giveTrinket(r, 'tin-cup') },
  ],
  'ticking-box': [
    {
      run: (r) => {
        r.maxHp = Math.max(1, r.maxHp - 6);
        r.hp = Math.min(r.hp, r.maxHp);
        return `${givePart(r, randomPart(r, 'rare', 'event'))} Lost 6 max HP.`;
      },
    },
    { run: () => 'It keeps ticking behind you.' },
  ],
  lamplighter: [
    {
      run: (r) => {
        lose(r, 60);
        return `${gainBlueprint(r)} Paid 60 Cogs.`;
      },
    },
    {
      run: (r) => {
        heal(r, 6);
        return 'He says little, and it is enough. Healed 6 HP.';
      },
    },
  ],
};

/** Parts the player may pick for this effect (family-restricted if any match). */
export function candidates(run: RunState, fx: Effect): PartInstance[] {
  let base = run.bin;
  if (fx.need === 'upgrade') base = base.filter((p) => !p.plus);
  if ((fx.need === 'remove' || fx.need === 'sell') && base.length <= 1) return [];
  if (fx.family) {
    const m = base.filter((p) => partDef(p.defId).family === fx.family);
    return m;
  }
  return base;
}

export function randomPartOf(run: RunState, fx: Effect): PartInstance | null {
  let base = run.bin;
  if (fx.need === 'upgrade') base = base.filter((p) => !p.plus);
  if (base.length === 0) return null;
  return base[int(run.rng, 'event', base.length)];
}
