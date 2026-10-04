# Brief: B5 lane `music`

Read `CLAUDE.md`, SPEC.md section 3 (sound), `docs/acceptance.md` rows A2, A3, Q1, and `src/audio/synth.ts`, `src/audio/sprocket.ts` (the existing synth, master bus, limiter and channels).

## Goal
A synthesized music loop for each act, the Workshop and the Clockmaker, mixed under the effects, with clean volume channels and mute, so the game sounds finished.

## You own
`src/audio/**` (new `src/audio/music.ts`), `tests/audio/**` (new), `e2e/audio.spec.ts` (new). Nothing else; the UI lane wires the settings screen to your API.

## Build
1. **Five loops** (`music.ts`), all built at runtime with Web Audio (oscillators, filtered noise, simple FM, a sample-free music box, plucked strings via short noise bursts through a comb filter), 60 to 120 s before repeating, in a warm, curious, slightly melancholy key:
   - `workshop`: a gentle music box and soft pad, slow, homely; a ticking clock as the pulse.
   - `act1` (the Gearworks): light clockwork percussion (ticks, wood clicks), a plucked bass, a curious minor melody.
   - `act2` (the Steamworks): heavier pulse, low brass-like pads, steam hiss swells, a driving ostinato.
   - `act3` (the Belfry): bells and chimes, wider reverb, a sadder modal melody.
   - `clockmaker`: tense, a ticking that slows and speeds, a descending bell motif, a bigger third phase variant (`setIntensity(0..2)` for phases).
   Use a lookahead scheduler (about 100 ms ahead on a 25 ms timer) so timing never drifts; crossfade 1.5 s between tracks; stop scheduling when the page is hidden.
2. **API:** `music.play(track)`, `music.stop()`, `music.setIntensity(n)`, `music.current()`; channels `master`, `music`, `effects` (and Sprocket on `effects`) with `setVolume(channel, 0..1)` and `setMuted(bool)`, read once from and applied to the global Settings by the UI lane. Expose `window.__game.audio = { track, volumes, muted }` through a getter the UI lane registers (export `audioDebug()` for it).
3. **Track selection hook:** export `trackFor(screen: 'title'|'workshop'|'map'|'combat'|'ending', act?: 1|2|3, enemyIds?: string[], phase?: number)` so the UI can call `music.play(trackFor(...))` on every screen change (title uses `workshop`).
4. **Tests:** unit tests with a fake AudioContext (the scheduler schedules notes within the lookahead window; crossfade ramps; muted sets gain 0; each track id builds). `e2e/audio.spec.ts`: with `?sound=1`, the audio graph builds without errors and `__game.audio.track` changes between Workshop, a fight and the Clockmaker (skip the e2e if the UI hook is not merged yet).

## Assumptions and decisions
- Audio starts only after a user gesture; under webdriver it stays muted unless `?sound=1`.
- Keep CPU low: no more than about 12 voices at once; reuse a single convolver or a simple feedback-delay reverb.
- No audio files (test A1). American English; no em dashes.
- Own git worktree (path in the launch message). Don't commit. Never stash, checkout, reset or restore. e2e with `PW_PORT=5412`.

## Done when
Unit tests green; you rendered each loop offline (OfflineAudioContext in a Playwright page, 20 s each) without errors and checked peak levels stay under the limiter. Report per template with a one-line description of each track.

## Also in this lane: Sprocket polish (B4 critic)
You also own `src/render/sprocket.ts` and `src/ui/Ending.tsx` this phase.
- Smooth Sprocket's rear: the scalloped blob reads like a cookie, most visibly in the large sleeping ending pose. Make it a soft, round, fluffy corgi rear (a smooth heart-ish double curve with a few short fur tufts at the edge), in every pose.
- At 667x375 the first two ending captions sit side by side and squeeze each other: stack or sequence them.
- Give the ending its own music cue through your music API (`ending`), a music box version of the Workshop theme.
