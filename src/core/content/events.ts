// Events (docs/content.md "Events"). B3 CONTRACT: the shape below is fixed; the run-core lane fills EVENTS
// with all 22 events and implements the choice effects (applied through run.ts chooseEvent, see eventfx.ts).
import type { RunState } from '../types';
import { partDef } from './parts';
import { scrapOf } from '../rewards';

export interface EventChoice {
  label: string; // button text, e.g. "Reach in"
  detail: string; // the cost and effect in plain words, e.g. "Lose 6 HP. Gain Sprocket's Collar Tag."
  available?(run: RunState): boolean; // false greys the button (e.g. not enough Scrap)
}

export interface EventDef {
  id: string;
  title: string;
  lines: string[]; // one to three short lines
  sprocket?: boolean;
  act?: 1 | 2 | 3; // limit to one act (optional)
  choices: EventChoice[];
}

const scrap = (n: number) => (run: RunState) => scrapOf(run) >= n;
const canLose = (run: RunState) => run.bin.length > 1;
/** A resident's move choice: not offered once that resident lives in Bellfoot (`run.config.residents`). */
const notLiving = (id: string) => (run: RunState) => !(run.config.residents ?? []).includes(id);
/** The lamplighter's fix needs a Cams and levers part to give him. */
const hasCam = (run: RunState) => run.bin.some((p) => partDef(p.defId).family === 'cam');

const list: EventDef[] = [
  {
    id: 'sprocket-blueprint',
    title: 'A Familiar Bark',
    sprocket: true,
    lines: ['Sprocket followed you up the stairs.', 'His tail is going. He wants you to come and see.'],
    choices: [
      { label: 'Follow his nose', detail: 'Gain a blueprint.' },
      { label: 'Send him home with a pat', detail: 'Heal 8 HP.' },
    ],
  },
  {
    id: 'sprocket-pipe',
    title: 'Stuck Behind the Pipes',
    sprocket: true,
    lines: ['Sprocket is wedged behind a hot pipe.', 'He looks very sorry about it.'],
    choices: [
      { label: 'Reach in', detail: "Lose 6 HP. Gain Sprocket's Collar Tag." },
      { label: 'Loosen the pipe with a part', detail: "Remove a part of your choice. Gain Sprocket's Collar Tag.", available: canLose },
    ],
  },
  {
    id: 'sprocket-nap',
    title: 'A Warm Boiler',
    sprocket: true,
    lines: ['Sprocket is fast asleep on a warm boiler.', 'There is a page of the journal under his paw.'],
    choices: [
      { label: 'Rest beside him', detail: 'Heal 25% of your max HP.' },
      { label: 'Let him sleep and read the page', detail: 'Upgrade a part of your choice.' },
    ],
  },
  {
    id: 'journal',
    title: "The Inventor's Journal",
    lines: ['A journal lies open on a workbench, the ink still dark.', 'The last entry stops in the middle of a sentence.'],
    choices: [
      { label: 'Read on', detail: 'Upgrade a random part.' },
      { label: 'Tear out the schematic', detail: 'Gain a random uncommon part.' },
    ],
  },
  {
    id: 'oil-merchant',
    title: 'The Oil Merchant',
    lines: ['A little cart rattles toward you, hung with oil cans.', '"Everything squeaks, eventually," says the merchant.'],
    choices: [
      { label: 'Buy oil', detail: 'Pay 30 Scrap. Heal 20 HP.', available: scrap(30) },
      { label: 'Sell a part', detail: 'Remove a part of your choice. Gain 25 Scrap.', available: canLose },
      { label: 'Tell him about Bellfoot', detail: 'He moves down to Bellfoot after the run. Nothing else happens now.', available: notLiving('oil-merchant') },
    ],
  },
  {
    id: 'automaton',
    title: 'A Broken Automaton',
    lines: ['An automaton sits against the wall, one arm hanging.', 'Its eyes flicker when you step close.'],
    choices: [
      { label: 'Repair it', detail: 'Lose 5 HP. Gain a random part.' },
      { label: 'Scrap it', detail: 'Gain 30 Scrap.' },
    ],
  },
  {
    id: 'gear-gamble',
    title: 'The Gear Wheel of Fortune',
    lines: ['A painted wheel stands in the corridor, its pointer worn smooth.', 'Someone left a sign: "Spin once."'],
    choices: [
      { label: 'Spin', detail: '50% chance: gain 60 Scrap. Otherwise: lose 8 HP.' },
      { label: 'Walk on', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'steam-bath',
    title: 'The Steam Bath',
    lines: ['A pipe has burst into a warm, white cloud.', 'It smells of old brass and rain.'],
    choices: [
      { label: 'Soak', detail: 'Lose 10 Scrap. Heal 15 HP.', available: scrap(10) },
      { label: 'Bottle the steam', detail: 'Gain Bellows.' },
    ],
  },
  {
    id: 'rusted-shrine',
    title: 'The Rusted Shrine',
    lines: ['Small gears are piled on a shelf, each one rubbed bright by a thumb.', 'Whoever made this shrine loved their work.'],
    choices: [
      { label: 'Pray', detail: 'Remove a part of your choice.', available: canLose },
      { label: 'Polish it', detail: 'Lose 10 Scrap. Gain 5 max HP.', available: scrap(10) },
    ],
  },
  {
    id: 'mirror-clock',
    title: 'The Mirror Clock',
    lines: ['A clock hangs in front of a mirror.', 'In the glass, its hands run the other way.'],
    choices: [
      { label: 'Step through', detail: 'Duplicate a part of your choice. Lose 10 HP.' },
      { label: 'Leave', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'toll-gate',
    title: 'The Toll Gate',
    lines: ['A brass gate blocks the stair, a slot in its side.', 'A card reads: "Mind the step. Pay the toll."'],
    choices: [
      { label: 'Pay the toll', detail: 'Pay 40 Scrap.', available: scrap(40) },
      { label: 'Climb around', detail: 'Lose 7 HP.' },
    ],
  },
  {
    id: 'choir',
    title: 'The Clockwork Choir',
    lines: ['A row of small bells and chimes sings a half-remembered tune.', 'It stops when you listen, and starts again when you stay.'],
    choices: [
      { label: 'Join in', detail: 'Gain a random Chimes part.' },
      { label: 'Conduct', detail: 'Upgrade a Chimes part of your choice (a random part if you have none).' },
    ],
  },
  {
    id: 'collapsed-stair',
    title: 'The Collapsed Stair',
    lines: ['The stair ends in a gap, and something glints on the far side.'],
    choices: [
      { label: 'Jump', detail: 'Lose 8 HP. Gain 15 Brass.' },
      { label: 'Take the long way', detail: 'Lose 10 Scrap.', available: scrap(10) },
    ],
  },
  {
    id: 'apprentice',
    title: "The Apprentice's Bench",
    lines: ['A small workbench, a stool, a lamp turned low.', 'An apprentice automaton waves a screwdriver hopefully.'],
    choices: [
      { label: 'Let them tinker', detail: 'Upgrade 2 random parts.' },
      { label: 'Show them how', detail: 'Upgrade a part of your choice. Lose 5 HP.' },
      { label: 'Invite them to Bellfoot', detail: 'They move down to Bellfoot after the run. Nothing else happens now.', available: notLiving('apprentice') },
    ],
  },
  {
    id: 'lantern',
    title: 'A Lantern in the Dark',
    lines: ['A lantern hangs on a hook, still lit.', 'It has been burning a long time for no one.'],
    choices: [
      { label: 'Take it', detail: 'Gain a random uncommon trinket. Lose 8 HP.' },
      { label: 'Leave it lit', detail: 'Heal 5 HP.' },
    ],
  },
  {
    id: 'pressure-leak',
    title: 'The Pressure Leak',
    lines: ['A pipe hisses, and the whole corridor hums with it.', 'A good patch would keep it quiet for years.'],
    choices: [
      { label: 'Patch it with a part', detail: 'Remove a Steam part of your choice (a random part if you have none). Gain 40 Scrap.', available: canLose },
      { label: 'Let it vent', detail: 'Lose 5 HP.' },
    ],
  },
  {
    id: 'hour-ghost',
    title: 'The Hour Ghost',
    lines: ['A faint figure winds a clock that is not there.', 'It does not look up, but it slows its hands for you.'],
    choices: [
      { label: 'Help', detail: 'Transform a part of your choice into a random part of the same rarity.' },
      { label: 'Ask about the inventor', detail: 'Hear a little of the story. Gain 10 Brass.' },
      { label: 'Ask him to come down to Bellfoot', detail: 'He moves down after the run and sits beside the archivist. Nothing else happens now.', available: notLiving('hour-ghost') },
    ],
  },
  {
    id: 'scrap-heap',
    title: 'The Scrap Heap',
    lines: ['A heap of broken machines, gone quiet.', 'Something in there still ticks.'],
    choices: [
      { label: 'Dig', detail: 'Gain a random common part.' },
      { label: 'Dig deeper', detail: 'Lose 12 HP. Gain a random rare part.' },
    ],
  },
  {
    id: 'old-forge',
    title: 'The Forgotten Forge',
    lines: ['A forge stands cold in an alcove, tools still on their hooks.', 'The coals are not quite dead.'],
    choices: [
      { label: 'Use it', detail: 'Upgrade a part of your choice.' },
      { label: 'Stoke it', detail: 'Lose 6 HP. Upgrade 2 random parts.' },
    ],
  },
  {
    id: 'teacup',
    title: 'A Teacup, Still Warm',
    lines: ['A teacup rests on a ledge, steam curling from it.', 'Nobody is here. The tea is just right.'],
    choices: [
      { label: 'Drink', detail: 'Heal 12 HP.' },
      { label: 'Pocket the cup', detail: 'Gain Tin Cup.' },
    ],
  },
  {
    id: 'ticking-box',
    title: 'The Ticking Box',
    lines: ['A small box sits in the middle of the floor.', 'It ticks, slowly, like a heart that is thinking it over.'],
    choices: [
      { label: 'Open it', detail: 'Gain a random rare part. Lose 6 max HP.' },
      { label: 'Leave it ticking', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'lamplighter',
    act: 1,
    title: 'The Lamplighter',
    lines: ['An old lamplighter trims the wicks one by one.', '"The inventor sent me a few plans," he says. "I kept some."'],
    choices: [
      { label: 'Buy a blueprint', detail: 'Pay 60 Scrap. Gain a blueprint.', available: scrap(60) },
      { label: 'Share his lamp a while', detail: 'Heal 6 HP.' },
      { label: 'Fix the lift', detail: 'Give him a Cams and levers part. The lift runs again, and he moves down to Bellfoot after the run.', available: (run) => hasCam(run) && notLiving('lamplighter')(run) },
    ],
  },
  {
    id: 'traders-cousin',
    title: "The Trader's Cousin",
    lines: ['A lost trader sits on a cart of oddities.', '"My cousin said the Spire had a market," he says. "It had one room."'],
    choices: [
      { label: 'Buy his map', detail: "Pay 20 Scrap. This act's layout is revealed.", available: scrap(20) },
      { label: 'Tell him about Bellfoot', detail: 'He moves down to Bellfoot after the run. Nothing else happens now.', available: notLiving('traders-cousin') },
    ],
  },
  {
    id: 'stopped-clock',
    act: 1,
    title: 'Five Forty-Seven',
    lines: ['Every clock in the Gearworks reads the same hour, and none are wound.', 'Under the biggest, something is scratched into the brass.'],
    choices: [
      { label: 'Read the inscription', detail: 'Hear a little of the story. Heal 6 HP.' },
      { label: 'Take the cogs from its face', detail: 'Gain 25 Scrap.' },
    ],
  },
  {
    id: 'empty-chair',
    act: 2,
    title: 'The Empty Chair',
    lines: ['A workshop chair pushed back from a desk. A half-eaten supper, a coat on the hook.', 'The tea is still faintly warm.'],
    choices: [
      { label: 'Sit a while', detail: 'Hear a little of the story. Heal 10 HP.' },
      { label: 'Search the desk', detail: 'Gain 30 Scrap. One time in three, a blueprint.' },
    ],
  },
  {
    id: 'unsent-letter',
    act: 3,
    title: 'The Unsent Letter',
    lines: ['A letter lies on the stair, addressed to Bellfoot.', 'The stamp is the old one. It was never sent.'],
    choices: [
      { label: 'Carry it down', detail: 'Hear a little of the story. Gain 15 Brass, and a journal page after the run.' },
      { label: 'Read it aloud to Sprocket', detail: 'Heal 12 HP.' },
    ],
  },
  {
    id: 'beacon',
    act: 3,
    title: 'The Cold Beacon',
    lines: ['The great lamp on the Belfry rim, unlit since the inventor left.', 'The wick is dry. The match is in your pocket.'],
    choices: [
      { label: 'Light it', detail: 'Lose 8 HP and 1 hour. From the next climb, act 3 shows every patrol and the warden door, and has 1 extra hour.' },
      { label: 'Walk on', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'vault-wheel',
    title: 'The Vault Wheel',
    lines: ['A wheel on a vault door, big as a cartwheel, with a keyhole at its hub.', 'Whatever sleeps inside is sleeping heavily.'],
    choices: [
      { label: 'Turn it with a Spire Key', detail: 'Use a Spire Key. The vault opens and the guardian is not woken.', available: (run) => (run.keys ?? 0) >= 1 },
      { label: 'Pick the lock', detail: 'Pay 25 Scrap and 1 hour. The vault opens.', available: scrap(25) },
      { label: 'Walk on', detail: 'Nothing happens.' },
    ],
  },
];

export const EVENTS: Record<string, EventDef> = Object.fromEntries(list.map((e) => [e.id, e]));
