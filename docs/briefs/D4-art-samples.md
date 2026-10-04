# D4 art samples: shared brief (lanes sprocket-art, boss-art, enemy-art, title-art)

The owner signs off the v2 art style on these four samples before anything else is produced. Read `docs/art-direction.md` first (style, quality bar, rig contract); it is the standard you are judged against. The owner liked the trial rigs: open `art/trial/sprocket/sprocket.html` and `art/trial/foreman/foreman.html` in a browser to see the level of motion expected, and read `art/trial/foreman/foreman.template.html` for how a full character is written.

## Already done for you (orchestrator)
- Seeds generated and picked; `art/<asset>/source.png` is the pick, `art/<asset>/cut.png` the cut-out (rembg plus `art/lib/keymask.py`, which unions a background-color key with rembg's alpha). The GPU server is stopped: do not start ComfyUI. If a pose truly needs a second painting, stop and report instead.
- `art/lib/`: `rig.js` (the engine; never edit it), `example-foreman.template.html` (copy this to start a character), `inline.py`, `record.mjs`, `clip.py`, `keymask.py`. The project rig.js adds `api.anchor(id)` from `ch.anchors {id: [x, y, r]}` (image pixels): declare your anchors in the character object.
- Toolkit helpers (read-only): `python ~/.claude/tools/art/prep.py grid|zoom|warp ...` to map joints in pixels (run with `E:/AI/rembg/.venv/Scripts/python.exe`, which has PIL, numpy and scipy).

## The recipe
1. Map joints and regions on `cut.png` (`prep.py grid art/<asset>/cut.png <scratch>/grid.png 50`, `zoom` for eyes and small parts). Write them in `art/<asset>/notes.md`.
2. Clean the cut-out if needed (remaining specks or a ground line: fix with a small PIL script that edits only alpha; keep the script in `art/<asset>/clean.py` so it reruns).
3. Write `art/<asset>/<asset>.template.html` from the example: weights per bone, children deformed before parents, `part`/`tear` between separate pieces, `pad` for limbs that leave the painting, moods with timelines, code effects on the overlay, `anchors`.
4. Build: `E:/AI/rembg/.venv/Scripts/python.exe art/lib/inline.py art/<asset>/<asset>.template.html art/<asset>/<asset>.html art/<asset>/cut.png`.
5. Serve the repo root in the background with your port: `python -m http.server <PORT> --bind 127.0.0.1` (2-hour timeout), stop it by PID at the end (`netstat -ano | grep :<PORT>`). Never kill by image name.
6. Record from the repo root: `node art/lib/record.mjs http://127.0.0.1:<PORT>/art/<asset>/<asset>.html art/<asset>/frames <mood>:<secs> ...` (exit code non-zero means page errors: fix them). Recording renders in software and is CPU-heavy: record once per round, not after every tweak; check single moods while iterating.
7. Look at the extreme frames yourself (windup, impact, recover, the deepest pose of each mood) with the Read tool on the PNGs. Fix smears, seams, tearing, clipping, detached pieces, frozen idles. Then `python art/lib/clip.py art/<asset>/frames art/<asset>/clip.webp` (run with the rembg venv python).
8. Write `art/<asset>/rig.json` per the contract in `docs/art-direction.md` (size, view, facing, feet, moods, anchors).

## Assumptions and decisions
- Moods are named exactly as your lane's list says; the game will call `setMood(name)`.
- Enemies face left. If the painting faces right, flip it in the template with a CSS transform on the stage, not by editing the PNG.
- Recording size: the page's `.stage` should frame the whole character with its effects, on the dark backdrop `#10393F` (deep teal), so clips read like the game.
- Effects use the palette in `docs/art-direction.md`. No text drawn in the page except mood buttons.
- Randomness in effects is fine for review clips; keep motion itself (bones) deterministic in `seq()`.
- American English, no em dashes in comments and notes.

## Shared tree rules
Several lanes work in this tree at once. Never `git stash`, `checkout`, `reset` or `restore`; never commit. You own only `art/<your asset>/**`. Do not edit `art/lib/**`, `art/style.json`, `docs/**` or anything in `src/`. If a shared file needs a change, say so in your report.

## Report back
Moods built (with durations), anchors, the frames you checked and what you fixed, anything that still bothers you, files written, and your server PID stopped.
