// The 33 achievements (docs/content.md section 7), all available since B10b (Bellfoot's came in B10a, the six hard ones in B10b).
// Each Masterwork and Legendary part and trinket is unlocked by exactly
// one achievement (the item def names it in `unlock`). Rewards with no system yet (journal pages, collars, landmarks, Overwind
// levels, the Scrapper) are recorded in `profile.rewards` and listed on the trophy shelf; B10 applies them.
import type { AchievementDef } from '../defs';

const a = (
  id: string,
  name: string,
  tier: AchievementDef['tier'],
  text: string,
  reward: AchievementDef['reward'],
  o: { hidden?: boolean; available?: boolean } = {},
): AchievementDef => ({ id, name, tier, text, reward, hidden: o.hidden ?? false, available: o.available ?? true });

export const ACHIEVEMENTS: AchievementDef[] = [
  a('e-first-win', 'The Last Evening', 'easy', 'Win a run on any mode.', { journal: 'Dawn, at last' }),
  a('e-pet', 'Good Dog', 'easy', 'Pet Sprocket 50 times.', { collar: 'Red collar' }),
  a('e-bell', 'Early Bird', 'easy', "Ring a warden's bell with at least 4 hours left, once.", { journal: 'Spare hours', collar: 'Brass bell collar' }),
  a('e-resident', 'New Neighbor', 'easy', 'Send a resident to Bellfoot.', { journal: 'A lamp in the street' }),
  a('e-lore', 'Five Forty-Seven', 'easy', 'Hear the Hour Ghost, read the Stopped Clock, the Empty Chair and the Unsent Letter, in any runs.', { journal: 'Where the evening went', collar: 'Dusk collar' }, { hidden: true }),

  a('m-act2-breaker', 'Spare Parts', 'medium', 'Reach act 2 having broken 12 or more enemy parts in act 1 (no win needed).', { parts: ['sapper'] }),
  a('m-bell3', 'Punctual', 'medium', "Ring a warden's bell with at least 3 hours left, three times in total (any runs).", { trinkets: ['two-left-hands'] }),
  a('m-quick-foreman', 'Clocked Out Early', 'medium', 'Defeat the Foreman in 6 turns or fewer.', { parts: ['skewframe'] }),
  a('m-break-all', 'Take Them Apart', 'medium', 'Break every part of a warden in one fight, including the optional ones.', { parts: ['night-watchman'] }),
  a('m-residents', 'Full Street', 'medium', 'Have all five residents living in Bellfoot.', { parts: ['mirror-gear'] }),
  a('m-all-chassis', 'Every Hand', 'medium', 'Win with the Tinker, the Stoker and the Horologist.', { parts: ['twin-mainspring'] }),
  a('m-calm-steam', 'Easy on the Valve', 'medium', 'Win a run with 3 or more Steam parts in your bin at the end and no overpressure.', { parts: ['free-pawl'] }),
  a('m-status', 'Slow Burn', 'medium', 'Deal 60 damage with Scald in a single fight.', { parts: ['conductors-baton'] }),
  a('m-burst', 'One Big Day', 'medium', 'Deal 100 damage in a single turn.', { parts: ['resonance-rod'] }),
  a('m-bells', 'Ahead of Time', 'medium', 'Ring the bell with at least 3 hours left in all three acts of one run.', { parts: ['hour-hand'] }),
  a('m-vaults', 'Locksmith', 'medium', 'Open the vault in every act of one run.', { parts: ['ballast-lance'], landmark: 'Opened vault' }),
  a('m-no-plating', 'Bare Metal', 'medium', 'Win a run having gained under 150 Plating in total.', { parts: ['cascade-piston'] }),
  a('m-lift', 'Going Up', 'medium', "Repair the Lamplighter's lift.", { landmark: 'Repaired lift' }),
  a('m-beacon', 'A Light on the Rim', 'medium', 'Light the Cold Beacon.', { landmark: 'Lit beacon' }),
  a('m-salvager', 'Magpie', 'medium', 'Break 100 enemy parts in total.', { chassis: 'scrapper' }),
  a('m-fuse', 'Better Together', 'medium', 'Fuse three times in one run.', { parts: ['core-drill'] }),
  a('m-drill', 'Through the Plate', 'medium', 'Break a part that a Shell, Bulwark or Governor was protecting, using a Drill.', { trinkets: ['overrun-coupler'] }, { hidden: true }),
  a('m-shatter', 'Chip Chip Chip', 'medium', 'Break 3 parts of one enemy in a single turn with Shatter.', { parts: ['sunder'] }),
  a('m-wrecker', 'Scrap Merchant', 'medium', 'Win 25 fights by killing a core with 2 or more of its parts still standing (any runs).', { trinkets: ['tow-hook'] }),
  a('m-three-elites', 'Hunter', 'medium', 'Defeat an elite in each act of one run.', { trinkets: ['foresight-dial'] }),

  a('h-master', 'Master of Hours', 'hard', 'Win a run on Master.', { parts: ['apprentices-hands'], overwind: 5 }),
  a('h-clockwork', 'Clockwork', 'hard', 'Win a run on Clockwork.', { parts: ['bottled-dusk'], overwind: 7 }),
  a('h-flawless', 'Not a Scratch', 'hard', 'Defeat any warden without taking damage during that fight.', { parts: ['sprockets-blanket'] }),
  a('h-ow5', 'Wound Tight', 'hard', 'Win a run at Overwind 5.', { parts: ['perpetual-engine'], overwind: 9 }),
  a('h-ow8', 'Wound Tighter', 'hard', 'Win a run at Overwind 8.', { overwind: 10 }),
  a('h-ow10', 'The Thirteenth Hour', 'hard', 'Win a run at Overwind 10.', { parts: ['sun-orb-core'] }, { hidden: true }),
  a('h-master-bare', 'Bare and Bold', 'hard', 'Win a run on Master gaining under 150 Plating in total.', { trinkets: ['inventors-watch'] }),
  a('h-whole-clock', 'Every Last Gear', 'hard', 'In your winning fight, break every part of the Clockmaker, the memory part included.', { trinkets: ['sprockets-whistle'] }, { hidden: true }),
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((x) => [x.id, x]));
