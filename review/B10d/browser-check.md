# B10d browser check (front door), commit 22dd5ff

Server: `npx vite --port 5390` in b10d-gate (stopped by PID). Phone 667x375 touch-sized viewport and desktop 1280x800, fresh storage. Shots in `review/B10d/shots/` (p- = phone, d- = desktop).
Walked: title, Climb, all 6 tutorial steps by tap, tray (keep and scrap), closing, slot screen, name dialog, Bellfoot; skip at step 3; replay from the Tutorial pill (returns to title); v1 banner (cs.tutorialDone=1 only); delayed painting (proxy delayed painting.webp 15 s). Console: no errors or warnings (only a "Autofocus processing was blocked" info, see S1).

## Must-fix
None found that blocks the flow. The tutorial completes at both sizes and never gets stuck.

## Should-fix
- S1 Name dialog, both widths: the "Who is climbing?" input is not focused when it opens (console: "Autofocus processing was blocked because a document already has a focused element"; the Begin button keeps focus). Typing straight away goes nowhere and Enter does nothing; once I lost a typed name and got "Tinkerer" (not reproduced after, likely the same cause). Focus and select the input in an effect. Shot d-07. `src/ui/Slots.tsx` ~line 109-117.
- S2 Step 3 "The Strut attacks every turn. Tap it to aim your Strikes there.", both widths: nothing on screen is labeled "Strut". The two enemy parts are identical round badges (6 and 8; on desktop identical gear glyphs), no name, no pulse on the target. A new player cannot tell which is the Strut (it is the left one, with the red sword "2"). Add a name label or a pulse ring on the Strut for this step. Shots p-04, d-03. `src/ui/Coach.tsx`, enemy part render in `src/ui/Combat.tsx`.
- S3 Phone, step 3: the Strut badge is 28x28 px (`enemy-part-e0-rig-strut`), under the 40 px tap rule, and it is the one thing the step needs you to tap. Enlarge the hit area (padding or an invisible 44 px target). Shot p-04.
- S4 Tapping the wrong thing gives vague errors: step 1 placing Escapement elsewhere says "That part cannot go there." (does not say the step wants a Spur Gear); step 3 tapping the rig body says "That target is out of reach." (it is the Strut that is wanted). Shots p-12, p-13. Make the tutorial-gated messages say what to do ("Place a Spur Gear next to the Mainspring", "Tap the Strut, the small part above the rig").
- S5 Run button looks live in steps 1, 3 and 5 but does nothing when tapped, with no feedback (step 5 especially: "Got it" is the only way on). Dim/disable it with a reason, or show a toast "Finish this step first".
- S6 Step 1 "Motion starts at the Mainspring": the Mainspring is a bare spiral icon at A2 with no label. First-timer does not know which cell it is. Give it a name tag or pulse for step 1. Shot p-02.
- S7 Tray (step 6), both widths: "Keep any of these parts for your bin. What you leave is scrapped for 3 Scrap each." and the prompt "Keep the Spur Gear or scrap it for Scrap" use "bin" and "Scrap" with no explanation, and the prompt mismatches the story (the Strut broke, the tray offers a Spur Gear). Reword, e.g. "The Strut left a Spur Gear. Keep it for your next climb, or scrap it for 3 Scrap (spare metal)". Shots p-07, d-06.
- S8 Tray layout: on desktop the tray is a small card stuck at the top of a nearly empty dark screen with Done pinned far away at the bottom right (d-06); on phone the dimmed hand text ("Escapem...", "ing, 3 ticks") shows through at the edges (p-07). Center the tray, or keep Done beside it.
- S9 Closing line (p-08): "Sprocket thumps his tail..." names Sprocket but he is neither shown nor introduced. A new player does not know who that is. Show the corgi portrait with the line or say "Your corgi, Sprocket, thumps his tail". `src/app/tutorial.ts` closing text, `src/ui/Coach.tsx`.
- S10 Phone, step 3 to 4: layout shifts when the preview appears. The "Incoming 2" pill disappears from the top bar and the grid/stage columns narrow by about 30 px (p-04 vs p-05), then jump back during the run. Keep a fixed width.
- S11 Slot screen after the tutorial (p-09, "Choose a save", three "Empty slot"/"Begin" cards) gives no sign this is the next step; add a one-line hint ("Pick a slot to start your climb") for fresh profiles.
- S12 Title with an existing save: "Climb the Spire" opens the slot list instead of continuing (d, after name). With one save it could go straight to Bellfoot. Optional.
- S13 Step 4 preview chip "18 damage (6 to parts), 0 Plating, 3 ticks" is boxed tight against the Run button on phone and wraps to two lines (p-05). Jargon "(6 to parts)" is not explained until the Strut breaks. Minor.

## Checked and fine
- Title, phone and desktop: painted tower visible, buttons stay left of the tower (desktop buttons end x=384, tower starts x=526), one primary "Climb the Spire" (44 px), pills 40 px tall, 13/14 px text, no sideways scroll (scrollWidth equals viewport), nothing below 12 px. Desktop shows tagline "Wind the Mainspring. Watch the machine do the fighting."; phone omits it.
- Delayed image: text title and all buttons are usable at once on the teal gradient; painting appears after load with no layout jump (p-15).
- Banner "There's a new tutorial for the new Spire." shows with only cs.tutorialDone=1, 12 px, fits above the primary button, no overflow at 375 tall (last button bottom 353 px); Climb then opens the slot list, not the tutorial (p-14).
- First launch: fresh storage lands on the title; Climb starts the tutorial, finishing goes to "Choose a save", then the name dialog (Begin disabled with an empty name, default "Tinkerer", 20 char max), then Bellfoot with the typed name.
- Tutorial steps 1 to 6 advance correctly by tap on phone and by click on desktop; step 4 preview shows "cancelled" on the Strut intent on desktop; step 5 "The Strut broke, and its attack went with it. Broken parts can be salvaged." with "Got it"; tray Keep it toggles to "Keeping it" and back, footer text changes ("Scrapping the rest adds +3 Scrap" / "Nothing left to scrap"); Done (kept or scrapped) goes to the closing line, Finish goes on.
- Skip at step 3 (phone) returns straight to the title with no stuck state. Replay from the Tutorial pill (existing save, desktop) runs all six steps and returns to the title.
- No console errors, no placeholder text, American spelling, no em dashes seen in tutorial or title text.
- Bellfoot (outside B10d): a horizontal pan scene (street 3221 px in a 1280 px view) with its own scrollbar, page itself does not scroll sideways. Panels in the painted street show hard seams (p-11, d-08); not judged here.

Not tested: a failed (404) painting; the real service worker; physical touch (clicks only).
