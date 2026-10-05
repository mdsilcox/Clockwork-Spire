# B8 browser check (phone 667x375 touch, desktop 1280x800)

Dev server on port 5350 (stopped by PID). Path walked: title, slot, workshop, climb, event, fights with 1, 2 and 3 enemies, salvage (empty and full), workbench (upgrade, remove, fuse), trader, oil, vault guardian and trinket reward, locked passage, bell, boss intro and Foreman fight, midnight. No page errors apart from two caused by my own wrong part ids in a cheat (see note at the end).

Screenshots are in `C:\Users\mikha\.claude\projects\E--Backup-Desktop-Claude-Code-Projects-Clockwork-Spire--claude-worktrees-clockwork-spire-v2-plan-0389b9\e72a9541-6708-402e-9fbf-a5131447177e\tool-results\` (files `mcp-Claude_Browser-blob-<id>.jpg`). Worst frames:
- 3 enemies, phone: `...1791168006856-esi5ia.jpg`
- 2 enemies, corner pips on Cog Rat, phone: `...1791168017360-u5e01e.jpg`
- Chain label over enemy name and HP, phone: `...1791168041519-4yciwg.jpg`
- Salvage Skip button under footer, phone: `...1791168199304-3quapy.jpg`
- Trader half-empty, phone: `...1791168163477-g9r813.jpg`
- Lock dialog without a panel, phone: `...1791168277841-1jcs3n.jpg`
- 3 enemies, desktop: `...1791168290823-4p5imi.jpg`
- 1 enemy (Gearhound), desktop: `...1791168303785-wdfoee.jpg`

## Defects

Must-fix
1. Combat, phone: the chain/preview caption ("Chain x6, 14 damage, 9 Plating") sits over the enemy card's name and HP line, so "Cog Rat 1/15" and "(scrapped)" are unreadable and the name is clipped by the top pips. Enemy HP is hidden exactly when the player is previewing damage. Likely `src/ui/Combat.tsx` and the stage caption CSS (`src/ui/styles.css`).
2. Combat, desktop: painted enemies are far smaller than on the phone. At 1280x800 each slot is 160x290 (3 enemies) and the painting is about 90 px wide; the machine grid takes about 70% of the width. With 1 enemy (Gearhound) the painting is about 200 px wide at the top of a 440 px tall slot, with the name and HP bar floating 50 px below it. The intent chip ("11 x2") overlaps the small pip beneath it. Intents are hard to read on the main platform. Likely the combat layout CSS and `src/render/layout.ts`.

Should-fix
3. Combat, phone, 2 and 3 enemies: part markers sit at the four slot corners instead of on the body parts (Cog Rat in both fights, Brass Beetle in the 3-enemy fight), so a pip does not point at its part. The Rust Mite and a lone Cog Rat are anchored correctly. This is the known fallback, but it is visible on a normal fight.
4. Workbench, phone and desktop: "Remove (25 Scrap)" deletes the picked part at once, with no confirmation. The price then rises silently to 40 Scrap. The user's own part is lost with one tap. Add a confirm or an undo. `src/ui/Climb.tsx` WorkbenchScreen.
5. Workbench, phone: "Fuse two (free)" with fewer than two parts picked does nothing, with no message and no disabled state. After fuse, the fuse choice dialog is small (113x72 cards) and floats with a stray Back button. `src/ui/Climb.tsx`.
6. Salvage with a trinket offer, phone: the "Skip the trinket" button is cut off by the sticky footer. "Done" is disabled with no reason given. At 667x375 the part cards are about 140 px tall, so only one row shows at a time. `src/ui/Climb.tsx` salvage screen and `climb.css`.
7. Salvage, phone: the heading reads "+13 Scrap" and the footer reads "Done adds +0 Scrap" when nothing broke (and "+29 Scrap" over "Done adds +0" after the vault). Two different Scrap numbers with no label. Empty-state text ("Take down the parts, not only the core, to bring some home") is fine.
8. Climb map, phone and desktop: the elite line reads "Tinpot General / Floor 3, next floor 2" and "Gearhound / Floor 5, next floor 5". It is unclear and sometimes repeats the same floor. Say "Now on floor 3, heading to floor 2" or hide it when equal. `src/ui/Climb.tsx` line near `elitelist`.
9. Bell, phone: "36 Scrap, 12 Brass, Prepared +2" gives no hint what Prepared means. The bell starts the boss fight at once with no confirm. Add a hint ("Prepared +2: two extra placements") and a confirm or a clearer label. `src/ui/Climb.tsx` bell button.
10. Midnight, phone: after the last hour the player is dropped into the boss intro ("ACT 1 BOSS / The Foreman") with no message that midnight struck. The Foreman also shows "Shell 10" with no explanation. I did not see the Overwound warden by name; check that the midnight intro names it.
11. Lock dialog ("A heavy lock, older than the corridor..."), phone: no panel or background. The text and buttons sit over the dimmed map, and the map HUD text shows through behind them. Likely `climb.css`.
12. Trader, phone: the stock is a single column on the left and the right half is empty except for "Pick something to buy." The bottom row (Pressure Gauge, Oil can) sits under the footer, and the Oil can price is hidden. With 0 Scrap nothing says what is affordable. The oil can says "15 Scrap" while the rest say "worth 20", which is inconsistent. When a part is handed over, the footer says "You pay 0 Scrap" without naming the part given. `src/ui/Climb.tsx` TraderScreen.
13. Climb map, phone: the "Parts 8" pill (open-bin) is 59x30, under the 40 px target. It is 65x32 on desktop. `src/ui/RunBar` or `climb.css`.
14. Climb map, phone (first fixture-less climb): floor 1 nodes touch the bottom edge of the board with no padding. `climb.css` `.actboard`.
15. Combat header, phone and desktop: "Act 1: the Gearworks | Floor 1" is shown for every climb fight (also for a vault guardian fought on floor 4). Use the room or a plain "Act 1". `src/ui/Combat.tsx`.
16. Event, phone: "Share his lamp a while / Heal 6 HP" at full HP (50/50) then reports "Healed 6 HP". It should say the real amount or "no effect". The disabled choice "Buy a blueprint" does not say why (needs 60 Scrap, you have 0).
17. Oil, phone: "Elites step." in the Rest description is cryptic. The result "Smooth and quiet. You feel ready." does not say how much HP came back (+15). The result box is off-centre.
18. Boss (Foreman) fight, phone: the painting is about 100 px in a 300 px slot, with the HP ring and name overlapping ("The Foreman 170/170 Shell 10" under the ring). Not painted in the same style as the other enemies.
19. Trinket pip "C" in the HUD is 11 px (below 12 px). Reload button on the error screen is 36 px tall and uses a different (serif) font from the game.
20. Cog Rat with a big ring (HP ring) around the whole painting has no label. It reads as a target ring until the fight is understood.

## Checked and fine
- No horizontal scroll at 667 or 1280 on any screen visited (climb map, event, fights, salvage, workbench, trader, oil, vault, boss intro, bin).
- Text is 12 px or larger everywhere on phone except the HUD trinket pip. Menu, Run, Skip, Done, Continue, Leave, hand cards and map rooms (62 px) are 40 px or larger on phone.
- Part pips, core pips: visible size 28x28 on phone but the hit area reaches 40 px (checked with elementFromPoint at plus or minus 19 px); 44x44 on desktop.
- Hours: "Hour N of 12" with "N hours left" and "1 hour left" plural are correct; "Midnight comes after your next move." appears at 1 hour left.
- Bin overlay ("Your parts (8)", Close) opens and closes; "1 part scrapped" and "N parts scrapped" plurals are right in salvage.
- Painted enemies render, are visible and not clipped at both widths; intent chips show at the painting anchors; broken part notch and HP ring show on the Cog Rat; 1 enemy has anchored pips.
- Boss intro card and "Face it" work; Foreman fight starts.
- Locked passage dialog lists key, pick the lock (25 Scrap and 1 hour) and leave; key-less state explains how to get one.
- Trader: part handover reduces the price to "You pay 0 Scrap", selected part highlighted, Buy disabled until something is picked.
- Upgrade (Spur Gear to Spur Gear+, 15 Scrap) and fuse choice (Auger or Crown Gear) work and update Scrap and Parts.
- Console is clean apart from errors caused by my own test (see below).

## Notes
- I forced a crash by giving cheat parts the ids `spur-gear` (real id `spur`): the workbench threw "Unknown part: spur-gear" in `Climb.tsx` `sortedBin` and showed "Something slipped a gear". A save holding an unknown part id re-crashes after reload (it recovered after a second reload). Not a normal-play bug; a `sortedBin` guard would make bad saves survivable.
- Browser pane screenshots intermittently came back cropped or duplicated while the viewport was emulated; I re-took them. Measurements above come from DOM queries.
