# B9b browser check (35d1806)

Viewports: phone 667x375 touch, desktop 1280x800. Dev server on 5383 (stopped by PID 36408). Playwright with a throwaway browser profile, a fresh slot, no real save data. Screenshots in `review/B9b/shots/` (paths below are relative to `review/B9b/shots/`).

Because of defect M1 the build as committed shows no tier marks and an unstyled shelf. For everything after that I re-ran with the one missing `}` injected in the browser (request interception, no file edited) and label those screenshots `-fix`. Findings are split accordingly.

## Must-fix

M1. All pages, both widths. `src/ui/styles.css:3473-3478`: the rule `.watchprompt .row {` is never closed (the `}` after `flex-wrap: wrap;` is missing; looks like a bad merge, "Merge branch head into B9b.2"). Everything after it (`.tier-uncommon/rare/masterwork/legendary`, `.trophylist`, `.trophy*`, `.legendarycard`...) is swallowed into that rule and never applies. Seen: the browser holds 487 rules in that sheet and the `.tier-*` and `.trophy*` rules are not among them. Effects as committed:
  - No tier mark is visible anywhere (hand, tooltips, salvage, trader, reward, vault, Queen's pick). The `<span class="tier tier-masterwork">` is 14px wide with a transparent background. Common is hidden by design; Uncommon, Rare, Masterwork, Legendary all disappear. Acceptance AD6 cannot pass.
  - The Trophies tab is an unstyled bullet list, text run together: "Good DogEasyEarnedPet Sprocket 50 times.Red collar". Shots: `trophies-phone-1.png`, `trophies-desk-1.png`, `trophies-phone-end.png`; hand without marks: `hand-phone.png`, `hand-desk.png`.
  - The Queen's pick card loses its violet border.
  Fix: add `}` after line 3478. Re-check the tier marks and the shelf afterwards (they look fine with the fix, see Fine below).

M2. Combat, phone, Inventor's Watch held: after a Run (not a loss) the "Wind back" button joins the Run row and pushes Skip/speed off the screen. Boxes: Run 443-539, Wind back 545-641 (wraps to two lines, 96x58), speed 647-699 on a 667px viewport, so 32px of the speed button is cut off and its tap area is partly off-screen. Shot: `watch-btn-phone.png`. Probably `src/ui/Combat.tsx:844-851` plus the `.controls .row` rules in `src/ui/styles.css`: let the row wrap, shrink the buttons, or put Wind back on its own line.

M3. Combat, phone, Foresight Dial: the dimmed second-turn chip lands exactly on top of the current chip for the same part, so it is invisible. Measured rects are identical (x/y/w/h) for `part-intent-e1-imp-tail` and `part-intent2-e1-imp-tail`, same for `rust-mite` pincers and the Pressure Warden's dome and fist. Only a chip belonging to a different part (Cog Rat plate) shows, beside the part. Cause: `src/ui/machines.css:521-525` uses `margin-bottom: 28px`, but on phone `.pm.phone .pm-intent` (machines.css:407-440) anchors with `top: 50%` or `top/bottom: calc(100% + 2px)` plus a transform, so a bottom margin moves nothing. Desktop is fine (stacked 26px above, shot `foresight-...-desk.png`). Phone shots: `foresight-cog-rat+spring-imp+rust-mite-phone.png`, `foresight-pressure-warden-phone.png`. Fix: offset with `transform`/`top` per side-r/l/t/b, or stack the two chips in one flex container.

## Should-fix

S1. Combat, both widths, Two Left Hands: the placements line reads "1 swaps ready" after one swap is spent (`src/ui/Combat.tsx:838`). Use "1 swap ready".

S2. Combat, both widths, Watch prompt: the dialog title is "Defeat" while the choice is still open ("The Inventor's Watch ticks. Wind back to before that Run, once, or accept the defeat."). It reads as already settled and then offers to undo it. Title it for the choice (e.g. "The Watch ticks"). `src/ui/Combat.tsx:745`. Shots: `watch-prompt-phone.png`, `watch-prompt-desk.png`.

S3. Combat, phone, hand with long masterwork texts: the tier mark sits on its own line in the card, and a card like Cascade Piston grows to 168px. The hand tray then takes 172px of 375 and the 5x3 board shrinks from 67px cells to 45px (stage 234px to 147px; the Cog Rat shrinks too). Still above 40px, but a big jump. Put the mark inline with the name or the family label. Shots: `longcards-phone.png` (cells 45px) against `hand-phone-fix.png`. Measured with a Cascade Piston, a Perpetual Engine and a Spur Gear in hand. `src/ui/PartCard.tsx` / `Combat.tsx:803-808`, `.card` rules in `styles.css`.

S4. Salvage, phone: the tier mark touches the rarity label with no gap ("[mark]Uncommon", "[mark]Masterwork"; `salvage-phone.png`). Add a margin. `src/ui/Nodes.tsx` salvage card.

S5. Board, both widths: Masterwork and Legendary parts on the grid use the family's plain gear art, with no tier mark on the piece (Skewframe at B2 looks like a Spur Gear; `place-skewframe-phone.png`, `boardtip-skewframe-phone.png`). Only the tooltip says the tier. The brief lists the board tooltip only, so this is a note, but a Masterwork looks identical to a common once placed.

S6. Phone, tap targets under 40px (older code, still failing the checklist): enemy part buttons `enemy-part-e0-rat-jaw` etc. 28x28; `open-bin` 59x30 on the reward, salvage and trader screens. Not new in B9b.

S7. Trophies tab, phone: the list area is only about 222px high (29 rows, 2939px of scroll). Readable, but the pane's left half is the Workshop art. Consider hiding the art on this tab at 667x375. `src/ui/Workshop.tsx`. Shots `trophies-fix-phone-*.png`.

S8. Tier marks at 14px: the Masterwork "cog" polygon reads as a blob at small size (greyscale check `tiers-zoom.png`); it is distinct from the diamond, notched square and star, but weakest of the four. Optional: add visible teeth.

## Checked and fine

- Trophy shelf (with M1 patched): 35 rows (33 feats, 2 shelf rows): shows "6 of 22 feats earned now"; name, tier word, "Earned", reward with tier mark, "Opens with Bellfoot" on the 11 later feats; hidden feats show "A hidden feat / It shows itself when you earn it."; progress "0 of 3 early bells", "0 of 100 parts broken", "0 of 25 wrecking wins"; "Kept for Bellfoot" list below. Two columns on desktop, one on phone. No sideways scroll, no text under 12px. Shots `trophies-fix-*`.
- Tier marks (with M1 patched), color stripped to grey at 4x zoom: notched square (Uncommon), diamond (Rare), cog (Masterwork), star (Legendary) are distinct by shape; Common has none. `tiers-zoom.png`.
- Hand cards and board tooltips for Skewframe, Cascade Piston, Perpetual Engine, Bottled Dusk: all text fits, no clipping, 14px text or larger; tooltips fit on phone (`boardtip-*-phone.png`). Phone cards 159px wide.
- Replays (5 frames each, `replay-*`): Skewframe (diagonals), Cascade Piston, Perpetual Engine (echo pass, chain counter climbs to x4/x5), Bottled Dusk (5 ticks, "Ticks 3/3" to 5, Pressure bar): events and counters read. The "Chain xN" pill covers the top of the enemy portrait on phone for a moment; it was already there.
- Queen's pick (`legend2-phone.png`, `legend1-phone.png`, `legend2t-*`): two options "Take one of the two", one option "Take it" centered; no skip control; name, star, kind, text and "Upgraded:" line all fit at 667x375; the card is the 40px+ target.
- Reward, salvage and trader screens (`reward-phone.png`, `salvage-phone.png`, `trader-phone.png`): marks, long texts and "fits your machine" present; scroll inside the panel; no sideways scroll; trader and salvage footers overlay the last row but it scrolls into view.
- Bin overlay with Masterwork and Legendary parts shows "Gear, masterwork" / "Tempo, legendary" labels and marks (`bin-mw-phone.png`).
- Inventor's Watch: the prompt appears before the fight settles, with no result or end screen; Wind back restores turn 1, HP 1 and the placements; the button after a non-loss Run is offered; after Wind back it is once per fight. Dialog fits at 667x375, buttons 40px+. Desktop button box 96x58 at the bottom right fits.
- Foresight Dial on desktop: second chip dimmed (0.55) stacked above the current one, 14px text, no overlaps for three small enemies, two enemies, or the Pressure Warden.
- Two Left Hands: marking a board part then tapping a hand card trades it (swap counter drops); two board swaps allowed; a third gives "You can swap twice per turn."; a hand trade with no swaps left gives "No swaps left this turn."
- Twin Mainspring: hand card says "Place only on D2."; placing it elsewhere gives "The Twin Mainspring goes on D2 only." at both widths.
- No console errors or page errors in any scenario (one React duplicate-key warning came from my own test data, two fake salvage items with the same part id, not the app).
- No sideways scroll at any screen at 667 or 1280; no placeholder text seen.

## Not checked

The vault and fuse rows of the tier marks (workbench opened by `setPending` stayed blank without a section, so I skipped it); the Twin Mainspring's replay; Perpetual Engine on a real Queen win flow.
