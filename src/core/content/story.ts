// Workshop notes pinned on the wall, one per milestone (docs/content.md "Story beats"). The inventor's voice.
// Order here is the order they appear on the wall. A note unlocks when its story flag is set (meta.ts finishRun).

export interface StoryNote {
  id: string; // also the story flag that unlocks it
  title: string;
  text: string;
}

export const STORY_NOTES: StoryNote[] = [
  {
    id: 'first-run',
    title: 'The first climb',
    text: 'You went up and came back, which is more than the last apprentice managed. Sprocket kept your stool warm.',
  },
  {
    id: 'first-death-act1',
    title: 'A stumble in the gears',
    text: 'Even I lost my place on the first stairs. Oil the hinges and try again; Sprocket says the dark is mostly dust.',
  },
  {
    id: 'first-act2',
    title: 'Where the pipes sing',
    text: 'The second floors hiss and sigh like an old kettle. I built them to keep the cold out, once.',
  },
  {
    id: 'first-boss',
    title: 'The Foreman',
    text: 'He only ever wanted the shift to go smoothly. Do not hold it against him; he never learned to stop.',
  },
  {
    id: 'first-elite-blueprint',
    title: 'A scrap of paper',
    text: 'A blueprint, folded small. I drew these on napkins at night and forgot where I left them.',
  },
  {
    id: 'unlock-stoker',
    title: 'The Stoker',
    text: 'A frame that runs hot and loves a boiler. Keep your eye on the gauge, and mind your fingers.',
  },
  {
    id: 'unlock-horologist',
    title: 'The Horologist',
    text: 'Patient, precise, a little vain about her timing. She and the Clockmaker would have gotten along.',
  },
  {
    id: 'clockmaker-sighting',
    title: 'A familiar tick',
    text: "You heard him, didn't you? I built him to keep time for me. I never told him when to stop.",
  },
  {
    id: 'victory',
    title: 'The hour ends',
    text: 'It is quiet at last. Sprocket is asleep on my notes, and I think the clocks are finally resting too.',
  },
];

// ---------- B10a: the archivist's journal (docs/lore.md) ----------
// Pages come from achievements (`reward.journal`, by title) and from lore moments heard in a run. `profile.journal` holds page ids
// in the order found. Short, warm, a little melancholy; every page is optional to read.

export interface JournalPage {
  id: string;
  title: string;
  text: string;
}

export const JOURNAL_PAGES: JournalPage[] = [
  { id: 'dawn-at-last', title: 'Dawn, at last', text: 'The bells rang and the light came through the clock face. Somewhere in town, bread finished rising.' },
  { id: 'spare-hours', title: 'Spare hours', text: 'You came to the door with hours to spare. The Spire has not been early for anything in a very long time.' },
  { id: 'a-lamp-in-the-street', title: 'A lamp in the street', text: 'Someone moved into Bellfoot. The lamps were already lit, but it felt as if they had just been.' },
  { id: 'where-the-evening-went', title: 'Where the evening went', text: 'A ghost, a clock, a chair and a letter. Put together, they say one supper, one evening, and no one to end it.' },
  { id: 'lore-hour-ghost', title: 'The watchman', text: 'He stood one evening too long, and the evening kept him. He says the Clockmaker did not mean it unkindly.' },
  { id: 'lore-stopped-clock', title: 'Five forty-seven', text: 'Every clock in the Gearworks stopped at the same minute. The biggest has a line scratched under its face: "Wait for me."' },
  { id: 'lore-empty-chair', title: 'The empty chair', text: 'A coat on the hook, a half-eaten supper. The inventor stood up from this chair and never sat down again.' },
  { id: 'lore-unsent-letter', title: 'The unsent letter', text: 'Addressed to Bellfoot, and never sent. It begins: "If the bells stop, do not be afraid of the quiet."' },
];

export const JOURNAL_BY_ID: Record<string, JournalPage> = Object.fromEntries(JOURNAL_PAGES.map((p) => [p.id, p]));

/** The journal page id for an achievement's reward title ("Dawn, at last" becomes "dawn-at-last"). */
export function journalIdFor(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The four lore moments (run.lore): events that tell the story of the inventor and the stopped hour. */
export const LORE_MOMENTS = ['hour-ghost', 'stopped-clock', 'empty-chair', 'unsent-letter'] as const;
