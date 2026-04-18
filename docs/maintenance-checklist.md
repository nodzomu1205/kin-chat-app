# Maintenance Completion Checklist

Updated: 2026-04-18

## Purpose

This document is the practical checklist for deciding whether the current
maintainability program is complete enough to stop treating the repository as an
active maintenance project.

Use it for three things:

1. deciding whether a boundary is still under maintenance-watch
2. deciding whether a session should spend time on maintenance before features
3. keeping handoff / roadmap / README aligned to one shared status model

## Current Overall Status

The repository is not in emergency maintenance anymore.

Current state:

- structural rescue work: mostly complete
- quality gate recovery: complete
- major hub splitting: mostly complete
- remaining work: authority cleanup, regrowth prevention, and narrow regression coverage

Working estimate:

- maintainability program overall: `80-90% complete`
- still open before we call it complete: `ingest authority finish`, `token accounting cleanup`, `maintenance-watch discipline`

## Exit Checklist

Treat the maintainability program as complete only when every item below is
`yes`.

### A. Verification

- `npx tsc --noEmit` passes
- `npm run lint` passes
- `npm test` passes
- `npm run build` passes
- test count and verification state are synchronized across:
  - `README.md`
  - `docs/refactor-roadmap.md`
  - `docs/next-session.md`
  - latest dated handoff

### B. Ingest Authority

- device ingest and Drive ingest share one practical post-request authority path
- canonical document text, summary text, and task/system envelope text have distinct owners
- library / GPT chat / Kin protocol no longer derive from competing upstream text variants
- ingest token accounting lands in the correct bucket instead of leaking into conversation-summary accounting

### C. Coordinator Discipline

- `sendToGpt` top-level coordination stays orchestration-only
- request / finalize / response / guard policy stays in dedicated helpers or builders
- task-draft flows keep shared prelude/postlude logic in shared helpers instead of re-implementing it locally
- page/controller/panel composition does not regrow pass-through glue or hidden policy

### D. UI / Builder Regrowth Control

- split GPT settings section modules stay separated by authority
- split workspace builder modules stay shape-conversion only
- no newly touched builder or section file silently becomes a mixed UI/policy hub
- responsive heuristics stay separate from panel-focus or business policy

### E. Test Coverage

- every touched maintenance-watch boundary has a narrow regression test
- helper/builder test files stay diagnosable and are split when failures become hard to localize
- no high-risk boundary depends only on broad end-to-end manual testing

### F. Docs / Handoff Hygiene

- latest handoff reflects the same repo state as roadmap and README
- maintenance-watch boundaries are explicitly named
- next priority item is stated in one place without conflicting alternatives

## Ongoing Update Rules

Use these rules every time maintenance-watch code is touched.

### Rule 1: Update status only from fresh verification

If you update counts or completion language, run the current verification first.

Never copy counts forward from an older document.

### Rule 2: Update the same four docs together

When maintenance status changes, review and update:

1. `README.md`
2. `docs/refactor-roadmap.md`
3. `docs/next-session.md`
4. latest dated handoff

If only one file changes, the system is already drifting.

### Rule 3: Reclassify touched boundaries

For every touched high-risk boundary, explicitly decide whether it is:

- `active refactor`
- `maintenance-watch`
- `stabilized`

If that classification changes, record it in the roadmap and next-session docs.

### Rule 4: Add or move one narrow test with each structural change

When a boundary is split, moved, or newly shared:

- add a narrow regression test, or
- move existing coverage so the new owner file is directly pinned

### Rule 5: Do not mark maintenance complete from "feels stable"

Maintenance is complete only when the exit checklist is green.

If even one item remains open, say "late-stage maintenance-watch", not
"complete".

## Session Close Template

Use this short template at the end of future maintenance sessions:

- verification:
  - `npx tsc --noEmit`: pass/fail
  - `npm run lint`: pass/fail
  - `npm test`: pass/fail with count
  - `npm run build`: pass/fail
- touched maintenance-watch boundaries:
  - boundary 1
  - boundary 2
- checklist movement:
  - what moved closer to complete
  - what is still open
- next default priority:
  - one concrete item

## Current Default Next Item

If no higher-priority product bug appears first, the next development item after
this checklist setup should be:

1. finish ingest authority cleanup
2. correct ingest token accounting
3. use that work to support device-file ingest consolidation into library surfaces
