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
