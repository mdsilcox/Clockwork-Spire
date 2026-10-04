// Content checks computed from the defs (docs/rules.md 7.4 target 7, docs/content.md section 3.0).
// B7 CONTRACT: signature fixed; the enemy-content lane implements it.

export interface BypassShare {
  act: 1 | 2 | 3;
  damage: number; // expected damage per turn, all regulars of the act, averaged over each part's cadence cycle
  pierce: number;
  siphon: number;
  corrodeCredit: number; // reported, not in the share
  share: number; // (pierce + siphon) / damage
}

/** The act's regular pool, equally weighted: escalating numbers at their cycle average; Ratchet growth not counted. */
export function bypassShare(act: 1 | 2 | 3): BypassShare {
  void act;
  throw new Error('B7: bypassShare not implemented');
}
