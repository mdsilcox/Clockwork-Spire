# Kickoff prompt

Open a new Claude Code session in this folder, choose the Fable model, set permissions to auto mode, and paste the prompt below.

```text
/project-lifecycle

Autonomous mode. Build the game in SPEC.md in this folder from start to finish without asking me anything; I won't be available. The critic in .claude/agents/critic.md (SPEC.md Appendix A) replaces my approvals at every gate.

- Track: choose it yourself in Phase 0 and log why. The spec settles the concept and the content requirements; discovery still covers the engine choice with a spike of the machine simulation, the data model, the full rules and acceptance tests, and the roadmap.
- Board: Orchestra project `clockwork-spire`, prefix `cs~`. Put every phase on it, record each critic round, and read my controls and comments at every gate.
- Git: commit at every gate. Don't push anywhere unless a private remote already exists.
- Keep this machine awake for the whole run. Check usage at every gate and stop cleanly at about 85% of my weekly limit.
- Write REPORT.md at the end, including every critic verdict with first and final scores, time and tokens.
- Log reusable findings to the vault at the usual writing moments.
```
