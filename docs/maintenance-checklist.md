# Maintenance Completion Checklist

Updated: 2026-04-26

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
- remaining work: library-ingest authority watch, protocol/task payload naming
  watch after the `reasoningMode` runtime cleanup, regrowth prevention, and
  narrow regression coverage

Working estimate:

- maintainability program overall: `85-90% complete`
- still open before we call it complete: `device/Drive ingest convergence`,
  `token accounting watch`, `protocol responseMode naming watch`,
  `maintenance-watch discipline`
- memory lifecycle now has explicit `stable / task-scoped / displayed-context`
  naming; treat new memory fields as incomplete until that classification is
  explicit too
- task-constraint behavior is now functionally stable and structurally much
  cleaner; the dead GPT settings/persistence `responseMode` carry-through has
  been removed, the controller/service runtime value is now named
  `reasoningMode`, task-intent fallback / current-task refresh / Kin task start
  / Kin transfer / transform-intent / send-to-GPT request internals now consume
  that `reasoningMode` name directly, and remaining cleanup is centered on
  protocol/task payload `responseMode` naming watch and ingest
  authority/token-accounting work

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
- generated library-summary usage for file and Drive import flows through one
  post-request helper
- file and Drive imported-document records are built through one shared model
  helper
- ingest token accounting lands in the correct bucket and stays there as new ingest-adjacent flows are added

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

### Rule 0: Replace means remove

When old behavior is replaced by new behavior:

- trace the old behavior back to its root owner, not just the visible UI
- delete old state, persistence, routing, and helper layers when they are no
  longer needed
- do not keep dormant branches "just in case" unless there is a confirmed live
  caller
- while touching that area, also look for adjacent cleanup that can be removed
  safely in the same session

The default expectation is not "hide the old feature". The default expectation
is "remove the obsolete path all the way back when practical".

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

### Rule 6: Record deletion candidates when replacement stops early

If a session replaces a feature but cannot fully delete every old branch in the
same turn:

- record the remaining obsolete branches explicitly
- state which are still live and which are dormant
- make the next cleanup target concrete instead of leaving "legacy" unnamed

### Rule 7: Never declare an overwrite path gone from partial inspection

For any LLM-backed flow, do not say "the old overwrite path is gone" or
"nothing rewrites this anymore" unless the full runtime path has been checked.

Minimum verification:

1. prompt sent to the LLM
2. raw LLM reply
3. parsed reply
4. every post-parse transform or harmonization step
5. the final adopted value shown in UI/state

Do not infer safety only from:

- the files changed in the current session
- recently added guards being removed
- one helper looking clean in isolation

The required posture is subtractive debugging:

- trace the adopted value end-to-end
- identify the exact owner that rewrites it
- remove that interfering path at its root
- do not layer new guards or compensating rules on top unless a live root
  caller still requires them

### Rule 8: Do not overstate confidence from local inspection

When investigating a regression:

- do not say "confirmed", "gone", or "fixed" from a partial read of nearby
  files
- do not infer repo-wide truth from the most recent patch alone
- do not prefer a neat theory over the observed runtime path
- if verification is incomplete, explicitly say what remains unverified

The expected reasoning posture is:

1. inspect the real runtime path first
2. separate observation from inference
3. label uncertainty honestly
4. only then summarize what is actually proven

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

1. inspect `hooks/useGoogleDrivePicker.ts`, check unused Drive/import residue,
   and split only one low-risk boundary such as UI feedback / picker state /
   import execution
2. keep remaining protocol/task-payload `responseMode` naming under
   maintenance-watch and only rename those fields with direct boundary tests
3. keep library-ingest authority and ingest token accounting under watch
4. keep send-to-GPT and page composition in regrowth-watch mode rather than
   active hub-splitting mode
5. keep opportunistic mojibake cleanup limited to still-active owner files
