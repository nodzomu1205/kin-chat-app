# Next Session Handover

Updated: 2026-04-18

## Stop Rule

Do not patch the first visible symptom.

This project has already lost significant time to the same failure mode:

- a visible bug appears in one surface
- the nearest renderer/helper gets patched
- the underlying authority chain stays mixed
- another surface still breaks

For the next session, treat these as hard rules:

1. define the canonical model first
2. identify which outputs derive from it
3. only then change downstream surfaces
4. prefer shared helpers over parallel local fixes
5. if two similar systems exist, first ask whether they should share one lower-level tool

If a fix idea does not improve authority clarity, it is probably the wrong fix.

## Current Verification State

The repository is in a good stopping state.

- `npx tsc --noEmit` passes
- `npm run lint` passes
- `npm test` passes
- `npm run build` passes
- current test count: `133 files / 556 tests`

Use `docs/maintenance-checklist.md` as the authoritative completion/status
checklist before calling maintenance "done" or before downgrading a boundary
from maintenance-watch to stabilized.

## What Was Stabilized In This Session

### 1. The repo is now in late-stage maintainability watch, not early rescue refactor

This session finished a large amount of structural work across the highest-risk
boundaries:

- `sendToGptFlow` top-level coordination was thinned and sectioned
- ingest authority moved closer to one shared canonical-document model
- page/controller/panel composition was split into narrower grouped contracts
- task runtime / draft sync / Kin transfer handoff now routes through shared builders
- server routes and client boundaries now follow a much more consistent thin-entrypoint pattern
- responsive single-panel heuristics now live behind shared viewport/device helpers with direct tests
- `GptSettingsWorkspace.tsx` now delegates approval sections and library/ingest sections to dedicated modules, so the workspace root is closer to view-state and top-level composition
- `taskDraftActionFlows.ts` now delegates prep/update/attach/deepen flows to dedicated modules, and those modules now share recent-message/success-postlude helpers instead of repeating assistant append and summary replay inline
- `chatPageWorkspaceInputBuilders.ts` now delegates state/actions/services assembly to dedicated builder files, and `sendToGptFlow` helper tests are now split again so guard failures are isolated from step/request builder failures

The practical implication for the next session is:

- do not start from "what giant file should be split next?"
- start from "which maintenance-watch boundary is being changed, and what narrow test should pin it?"

### 2. Google Drive integration shipped and is usable

Implemented and verified:

- Google Picker-based Drive access now works
- library drawer now has dedicated Google Drive actions
- Drive picker opens from the configured folder
- file import can show files and folders together
- folder index and folder bulk import are separated
- Drive-imported files flow into the same ingest pipeline as device-imported files
- PDF / CSV / Google Spreadsheet import now runs through ingest
- Google Drive settings were moved to the bottom of the library settings workspace

Main files:

- `hooks/useGoogleDrivePicker.ts`
- `components/panels/gpt/ReceivedDocsDrawer.tsx`
- `components/panels/gpt/GptSettingsWorkspace.tsx`
- `lib/app/ingestClient.ts`

### 3. Ingest text handling moved toward a canonical model

This was the most important structural lesson of the session.

We confirmed that ingest bugs were repeatedly caused by mixing:

- stored/display text
- summary source text
- protocol/task envelope text
- GPT chat display text

Progress made:

- `lib/app/ingestDocumentModel.ts` now owns the basic ingest text authority split
- `fileIngestFlow` now uses `canonicalDocumentText` and `taskPrepEnvelope` naming internally
- device-import and Drive-import now share more of the same summary and canonical-text logic
- GPT chat / library / Kin outputs are much closer to deriving from one source instead of parallel text variants

Main files:

- `lib/app/ingestDocumentModel.ts`
- `lib/app/fileIngestFlow.ts`
- `lib/app/gptTaskClient.ts`
- `hooks/useGoogleDrivePicker.ts`
- `docs/ingest-pipeline.md`

### 4. The core development rule had to be re-affirmed again

This session re-confirmed a recurring failure pattern:

- "I can see the bug, so I know where to patch it"

That approach repeatedly caused:

- wrong-file edits
- false-positive fixes
- downstream disagreements between library, chat, and protocol
- duplicated helpers and unclear authority

The rule is now explicit again in docs:

- `docs/architecture-guidelines.md`
- `docs/ingest-pipeline.md`
- `docs/refactor-roadmap.md`

## Outstanding Google Drive Work

The Google Drive feature is usable, but not finished.

### Remaining functional improvements

1. upload destination subfolder selection
   - current upload still targets the configured root folder
   - next step: allow selecting a child folder before upload

2. folder index presentation polish
   - current index is functional
   - next step: improve readability of hierarchy, counts, and per-file metadata

3. ZIP import support
   - not implemented
   - decide whether unzip should happen client-side or server-side

4. expand import format support carefully
   - Drive import already handles text/PDF/CSV/Sheets better than before
   - next step: decide whether Word/Excel/ZIP deserve first-class support or should remain outside scope for now

### Known mismatches to fix next

1. file-ingest token accounting is currently wrong
   - historically, file ingest token usage was counted under the task/file-ingest side
   - current behavior is counting it under conversation-side summary usage
   - this should be corrected so ingest-related token use is attributed back to the task/file-ingest bucket

2. device-file ingest UI should be consolidated into the library surfaces
   - current device-file ingest entry still lives in the GPT panel bottom `file` tab
   - target direction:
     - move ingest entry actions to the top library drawer area, alongside the Google Drive actions
     - keep ingest-related settings inside the library settings workspace
   - this should reduce split mental models between Drive import and device import

### Google Drive maintenance rule

Do not create a separate "Drive ingest system".

Drive should keep sharing:

- ingest request boundary
- canonical text model
- summary generation rules
- stored-document projection

Only Drive-specific concerns should stay local, such as:

- picker auth
- folder traversal
- upload destination selection

## Outstanding Maintainability Work

### Priority A: finish the remaining ingest authority unification

Why:

- this is the area that caused the most wasted effort this session
- canonical authority is improved, but not fully complete yet

Focus:

- remove remaining legacy naming and mixed roles in ingest flows
- finish aligning `useIngestActions.ts` with the newer canonical ingest model
- keep reducing cases where summary/library/chat/Kin can diverge
- fix ingest token accounting so summary usage and ingest/task usage are not mixed
- use the ingest cleanup as the foundation for the device-file ingest UI move into the library surfaces

Primary files:

- `lib/app/fileIngestFlow.ts`
- `hooks/useIngestActions.ts`
- `lib/app/ingestDocumentModel.ts`
- `docs/ingest-pipeline.md`

### Priority B: keep the remaining legacy/current ingest split shrinking

Why:

- lower-level request boundaries are more shared now
- post-request behavior is still not as unified as it should be

Focus:

- move duplicated ingest post-processing into shared helpers
- avoid a permanent split between device ingest and Drive ingest behavior

Primary files:

- `hooks/useIngestActions.ts`
- `lib/app/fileIngestFlow.ts`
- `lib/app/legacyIngestHelpers.ts`
- `lib/app/legacyIngestFlowHelpers.ts`

### Priority C: maintain the now-stabilized boundaries without regrowth

Still under watch:

- `lib/app/sendToGptFlow.ts` and adjacent request/finalize surfaces
- `app/page.tsx` and page-side composition boundaries
- responsive single-panel / panel-focus authority boundaries
- search-domain enrichment / extraction boundaries
- user-facing text drift outside owner files
- `components/panels/gpt/GptSettingsApprovalSections.tsx` / `GptSettingsLibrarySections.tsx` as the next likely UI hubs
- `lib/app/taskDraftPrepFlows.ts` / `taskDraftAttachFlows.ts` / `taskDraftDeepenFlows.ts` as the next likely workflow hubs
- `hooks/chatPageWorkspaceStateBuilders.ts` / `chatPageWorkspaceActionBuilders.ts` / `chatPageWorkspaceServiceBuilders.ts` as the next likely page-side builder hubs

Reference:

- `docs/refactor-roadmap.md`

## Reconfirmed Development Principles

These should be treated as operational constraints, not suggestions.

### 1. Structure first, symptom second

Before editing any bug:

1. what is the canonical authority?
2. where is it produced?
3. which outputs derive from it?
4. which outputs are just envelopes or projections?

If those are unclear, implementation should pause.

### 2. Shared tools over near-duplicate systems

When two paths do similar work, prefer:

- one shared lower-level helper
- one canonical model
- one authority contract

Do not allow parallel versions of:

- summary rules
- cleanup rules
- protocol wrappers
- stored-document text shaping

unless the divergence is explicit and justified.

### 3. Do not trust the nearest file

The file where the bug is visible is often not the file that owns the bug.

Before editing:

- trace upstream authority
- search repo-wide
- identify active runtime path vs compatibility path

### 4. Docs must reflect the real guardrails

If the same mistake happens more than once, it should become a prominently documented rule.

That rule should then be reflected in:

- architecture docs
- pipeline docs
- roadmap / maintenance docs
- handoff docs

### 5. Common mistake pattern to avoid

Never do this sequence again:

1. "I see the bug"
2. "I found the spot"
3. patch one surface
4. discover a second surface still broken
5. patch that too

This is exactly the pattern that wasted time in this session.

## Recommended Next-Session Order

1. finish the remaining ingest authority work before adding more ingest-adjacent features
2. fix file-ingest token accounting so usage lands in the correct ingest/task bucket
3. continue shrinking the remaining legacy/current ingest post-processing split
4. move device-file ingest UI into the library drawer/settings surfaces
5. keep `sendToGpt` / page composition / responsive boundaries in maintenance-watch mode with narrow tests
6. only after that, resume broader feature additions such as more Google Drive polish
7. if the next work is not ingest-specific, prefer the split GPT settings section modules and split task-draft flow modules as the next structural cleanup targets

## Maintenance Update Cadence

Whenever maintenance-watch code is touched:

1. rerun verification first
2. update `README.md`, `docs/refactor-roadmap.md`, `docs/next-session.md`, and the latest dated handoff together
3. reclassify touched boundaries as `active refactor`, `maintenance-watch`, or `stabilized`
4. add or move one narrow regression test with the structural change

Reference:

- `docs/maintenance-checklist.md`

## Files To Review First Next Time

1. `lib/app/ingestDocumentModel.ts`
2. `lib/app/fileIngestFlow.ts`
3. `hooks/useIngestActions.ts`
4. `lib/app/sendToGptFlow.ts`
5. `app/page.tsx`
6. `hooks/useResponsive.ts`
7. `docs/refactor-roadmap.md`
8. `docs/ingest-pipeline.md`
9. `docs/architecture-guidelines.md`
10. `docs/HANDOFF-2026-04-18.md`

## Verification Commands

```bash
npx tsc --noEmit
```

```bash
npm test
```

```bash
npm run build
```
