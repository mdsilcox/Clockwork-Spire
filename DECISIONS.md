# Decisions

Every choice the spec leaves open, with its reason. Newest last. The spec (`SPEC.md`) is never edited; interpretations live here.

## 2026-10-04 · Phase 0

**D-001 Track: Medium.** The spec settles the concept, audience and content list, so a separate ideation phase would only restate it. What is genuinely open is the engine (needs a spike), the machine rules, the data model, acceptance tests and the roadmap. Medium track: D1 "Concept and stack" (vision page drawn from the spec, engine options, a spike of the machine simulation and its animation); D2 "Design" (data model, full rules, content catalog plan, acceptance tests, roadmap folded in). Then build phases. Rejected Large (five separately reviewed discovery phases cost five critic rounds for documents the spec already half-writes) and Small (too much content and too many systems for one combined brief).

**D-002 Autonomous mode.** The owner is unavailable. The critic (`.claude/agents/critic.md`) replaces every approval; I never write to the board's `approvals` or `inputs`. Critic verdicts live in `review/<phase>/round-<n>.md`.

**D-003 Git remote is public.** The owner's kickoff names `https://github.com/mdsilcox/Clockwork-Spire` explicitly as the push target. `gh` reports it as PUBLIC. The lifecycle skill says to push only to a private remote, but the owner's explicit instruction for this project names this repo, so I push there at every gate. Nothing secret is ever committed (no keys, no accounts, no services).

**D-004 Keep-awake.** The desktop app's keep-awake setting is not reachable from this session, so a background PowerShell process holds `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` and is restarted every two hours. It changes no system setting and ends with the process.

**D-005 Usage guard.** Plan usage is checked at every gate with `get_usage`; at about 85% of the weekly limit the run finishes its current step, commits, writes REPORT.md and stops.
