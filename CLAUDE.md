# Clockwork Spire: project context

A turn-based roguelite for browser (desktop and phone landscape). The player builds a machine of clockwork parts that runs each combat turn. Full brief: `SPEC.md` (never edit it). Decisions: `DECISIONS.md`. State of the run: `PROGRESS.md`.

## Stack and commands
Vite 8 + TypeScript (strict) + Preact 11 (`@preact/signals`) for DOM UI; Canvas 2D for the machine/combat stage; Vitest 5; Playwright 1.63; `vite-plugin-pwa`; `idb` (IndexedDB); Web Audio for all sound. See DECISIONS.md D-006, D-007.
- `npm install && npm run dev` start the game. `npm test` runs everything (unit, sim targets, e2e).
- `npm run sim -- --careers 200 --seed 1` writes a balance report to `balance/`.
- TODO: exact scripts once the skeleton exists (B1).

## Directory layout
- `SPEC.md` the owner's spec, frozen.
- `docs/` vision, data model, rules, acceptance criteria, roadmap.
- `review/<phase>/round-<n>.md` critic verdicts, never overwritten.
- `balance/` balance simulator reports, dated.
- TODO: source layout (decided in D1/D2).

## Conventions
- American English, no em dashes anywhere (UI text, docs, comments).
- Text is short; tone warm, curious, a little melancholy.
- All art drawn in code; all sound synthesized. No downloaded assets.

## Where plans live
Orchestra board project `clockwork-spire`, prefix `cs~`.
