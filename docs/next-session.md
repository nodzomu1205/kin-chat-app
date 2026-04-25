# Next Session Handover

Updated: 2026-04-25

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
6. if old behavior is being replaced, remove the obsolete path back to its root owner when practical instead of only hiding the surface UI
7. for LLM-backed flows, do not declare a rewrite path removed until prompt, raw reply, parsed reply, post-parse transforms, and final adopted value have all been inspected

If a fix idea does not improve authority clarity, it is probably the wrong fix.

For topic / task / memory regressions specifically, prefer subtractive tracing
over new guards:

1. inspect the actual prompt
2. inspect the raw model reply
3. inspect parsed data
4. inspect every local rewrite after parsing
5. remove the interfering rewrite at its root

Do not trust "we already removed that path" unless the full runtime path was
checked end-to-end.

Also do not promote a partial file read into certainty. If only part of the
runtime path was checked, record it as partial verification, not a confirmed
fact.

## New Immediate Priority

The current task/constraint path is functionally in a good stopping state:

- task-intent fallback uses a fixed-slot JSON schema
- approved wording compiles directly into `CONSTRAINTS`
- task progress derives from `CONSTRAINTS`

Do not destabilize that visible behavior.

The residue cleanup around that path is now substantially complete.

Instead, the next session should default to:

1. keeping remaining protocol/task-payload `responseMode` naming under
   maintenance-watch; the dead GPT settings/persistence carry-through has been
   removed, and controller/task/transfer/send-to-GPT request boundaries now use
   `reasoningMode`
2. continuing ingest authority and ingest token-accounting cleanup
3. keeping mojibake cleanup opportunistic in still-active owner files
4. maintaining `sendToGpt` / page-composition boundaries without regrowth

This is now a better default next step than touching broader UI or feature work.

## Current Verification State

The repository is in a good stopping state.

- `npx tsc --noEmit` passes
- `npm run lint` passes
- `npm test` passes
- `npm run build` passes
- current test count: `141 files / 621 tests`

Latest maintenance movement:

- removed the no-op GPT settings/persistence `responseMode` path from
  `usePersistedGptOptions`, `persistedGptOptionsState`, page/workspace builders,
  and GPT panel settings props
- moved the current fixed `strict` runtime value to the app-side
  `reasoningMode` service boundary, with `lib/app/task-runtime/reasoningMode.ts` owning the
  runtime strict/creative type instead of GPT panel UI types
- task-intent fallback, current-task intent refresh, Kin task start, Kin
  transfer, transform-intent, and send-to-GPT request internals now use
  `reasoningMode` at their flow/request boundaries
- protocol/task payload fields still named `responseMode` remain under
  maintenance-watch and should be renamed only with direct boundary tests

Use `docs/maintenance-checklist.md` as the authoritative completion/status
checklist before calling maintenance "done" or before downgrading a boundary
from maintenance-watch to stabilized.

For memory work specifically, also read:

- `docs/memory-lifecycle.md`

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
- fallback debug payload is no longer persisted into memory state, and the obsolete `gptMemoryStateSummaryMerge.ts` branch has been removed so memory compaction now follows one authoritative path
- `chatPageWorkspaceInputBuilders.ts` now delegates state/actions/services assembly to dedicated builder files, and `sendToGptFlow` helper tests are now split again so guard failures are isolated from step/request builder failures
- `lib/memory.ts` now declares the task-scoped memory lifecycle explicitly, and `gptMemoryStorage` now clears task-scoped state through that shared helper instead of a separate local cleanup rule
- `useMemoryInterpreterSettings.ts` now reads/writes through `lib/app/memory-rules/memoryRuleStore.ts`, so the memory rule system has one persistence boundary for settings, pending candidates, approved rules, and rejected signatures
- `useGptMemory.ts` now reads/writes runtime handoff through `lib/app/gpt-memory/gptMemoryRuntime.ts`, so initial load plus update/reapply orchestration no longer lives inline inside the hook
- `docs/memory-lifecycle.md` now names `stable / task-scoped / displayed-context` memory explicitly, so new memory fields should not be added without choosing one of those lifecycle buckets
- token accounting now has one restored total-token source, conversation recent windows include memory compaction usage, the user-facing memory line is `圧縮`, and ingest-time summary generation usage now lands in the ingest bucket instead of the conversation compaction bucket

- library ingest now has explicit `compact / detailed / max` output authority so one import request does not ask the model for multiple alternate versions
- reference-library app-side state, item actions, and summary client helpers now live under `lib/app/reference-library/`
- search-history app-side state now lives under `lib/app/search-history/`
- panel/UI state helpers now live under `lib/app/ui-state/`
- remaining app-side utility clusters now live under dedicated folders such as `gpt-task/`, `youtube-transcript/`, `memory-rules/`, `multipart/`, `task-support/`, `google-drive/`, `auto-bridge/`, and `gpt-context/`
- file import, Drive import, YouTube transcripts, search, and task snapshots now honor the shared library-card summary toggle
- file and Drive imports now post visible GPT chat completion messages
- file and Drive imports now share generated-summary resolution and ingest usage
  aggregation through `lib/app/ingest/importSummaryGeneration.ts`
- file and Drive imports now share stored ingested-document record construction,
  so text cleanup, char count, and timestamps stay aligned
- app-side ingest modules now live under `lib/app/ingest/`
- send-to-GPT app-side modules now live under `lib/app/send-to-gpt/`
- memory-interpreter app-side modules now live under
  `lib/app/memory-interpreter/`
- GPT-memory app-side modules now live under `lib/app/gpt-memory/`
- task-draft app-side modules now live under `lib/app/task-draft/`
- task-runtime app-side modules now live under `lib/app/task-runtime/`
- Kin protocol core and sidecar modules now live under `lib/app/kin-protocol/`

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
- `lib/app/ingest/ingestClient.ts`

### 3. Ingest text handling moved toward a canonical model

This was the most important structural lesson of the session.

We confirmed that ingest bugs were repeatedly caused by mixing:

- stored/display text
- summary source text
- protocol/task envelope text
- GPT chat display text

Progress made:

- `lib/app/ingest/ingestDocumentModel.ts` now owns the basic ingest text authority split
- `fileIngestFlow` now uses `canonicalDocumentText` and `taskPrepEnvelope` naming internally
- device-import and Drive-import now share more of the same summary, usage,
  stored-record, and canonical-text logic
- GPT chat / library / Kin outputs are much closer to deriving from one source instead of parallel text variants

Main files:

- `lib/app/ingest/ingestDocumentModel.ts`
- `lib/app/ingest/fileIngestFlow.ts`
- `lib/app/gpt-task/gptTaskClient.ts`
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

### Known mismatches to watch next

1. ingest token accounting is improved but should stay under watch
   - file/Drive/YouTube summary-generation usage now lands in the ingest bucket
   - the latest PDF regressions were caused by duplicate output authority and post-selection clipping, not by a display-only meter error
   - next review should verify new ingest-adjacent flows keep this bucket ownership

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

### Priority A: keep the now-fixed library ingest authority from regrowing

Why:

- this is the area that caused the most wasted effort this session
- canonical authority is improved, but not fully complete yet

Focus:

- keep `compact / detailed / max` mapped to one output authority instead of multiple alternate model fields
- keep reducing cases where summary/library/chat/Kin can diverge
- keep ingest summary usage in the ingest bucket
- extract shared post-request helpers only when device import and Drive import genuinely duplicate behavior
- use the ingest cleanup as the foundation for the device-file ingest UI move into the library surfaces

Primary files:

- `lib/app/ingest/fileIngestFlow.ts`
- `hooks/useFileIngestActions.ts`
- `hooks/useGoogleDrivePicker.ts`
- `lib/app/ingest/ingestDocumentModel.ts`
- `lib/server/ingest/promptBuilder.ts`
- `lib/server/ingest/resultSelection.ts`
- `docs/ingest-pipeline.md`

### Priority B: keep the remaining legacy/current ingest split shrinking

Why:

- lower-level request boundaries are more shared now
- post-request behavior is still not as unified as it should be

Focus:

- move duplicated ingest post-processing into shared helpers where it is actually duplicated
- avoid a permanent split between device ingest and Drive ingest behavior

Primary files:

- `hooks/useFileIngestActions.ts`
- `hooks/useGoogleDrivePicker.ts`
- `lib/app/ingest/fileIngestFlow.ts`
- `lib/app/ingest/ingestDocumentModel.ts`

### Priority C: maintain the now-stabilized boundaries without regrowth

Still under watch:

- `lib/app/send-to-gpt/sendToGptFlow.ts` and adjacent request/finalize surfaces
- `app/page.tsx` and page-side composition boundaries
- responsive single-panel / panel-focus authority boundaries
- search-domain enrichment / extraction boundaries
- user-facing text drift outside owner files
- `components/panels/gpt/GptSettingsApprovalSections.tsx` / `GptSettingsLibrarySections.tsx` as the next likely UI hubs
- `lib/app/task-draft/taskDraftPrepFlows.ts` / `taskDraftAttachFlows.ts` / `taskDraftDeepenFlows.ts` as the next likely workflow hubs
- `hooks/chatPageWorkspaceStateBuilders.ts` / `chatPageWorkspaceActionBuilders.ts` / `chatPageWorkspaceServiceBuilders.ts` as the next likely page-side builder hubs

### Priority D: remove task-intent/task-progress half-migration residue

Why:

- the visible task constraint behavior is now good
- the implementation still contains old residue that can mislead the next debug session

Focus:

- `lib/taskIntent.ts`
  - remove or isolate old rewrite-era helpers such as `parseIntentCandidateDraftText(...)`
  - remove dead compatibility carry-through where possible
- `lib/taskCompilerSections.ts`
  - remove `buildCompletionCriteria(...)`
  - remove `buildRequiredWorkflow(...)`
  - remove `buildOptionalWorkflow(...)`
  - drop tests that only pin dead sections
- `lib/taskProgress.ts`
  - keep the rule-based `CONSTRAINTS` reader simple and explicit

Primary files:

- `lib/taskIntent.ts`
- `lib/taskIntentFallback.ts`
- `lib/taskProgress.ts`
- `lib/taskCompiler.ts`
- `lib/taskCompilerSections.ts`

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

1. keep remaining protocol/task-payload `responseMode` naming under maintenance-watch
2. keep the fixed library-ingest authority under watch while moving any obvious shared post-request behavior into helpers
3. continue shrinking device-file vs Drive post-processing divergence
4. move device-file ingest UI into the library drawer/settings surfaces when product timing allows
5. keep opportunistic mojibake cleanup limited to active owner files that are being touched
6. keep `sendToGptFlow` and page/controller composition in maintenance-watch mode
7. keep the new app-side folders stable; add new helpers to the nearest existing domain folder instead of returning to `lib/app` root

## Maintenance Update Cadence

Whenever maintenance-watch code is touched:

1. rerun verification first
2. update `README.md`, `docs/refactor-roadmap.md`, `docs/next-session.md`, and the latest dated handoff together
3. reclassify touched boundaries as `active refactor`, `maintenance-watch`, or `stabilized`
4. add or move one narrow regression test with the structural change

Reference:

- `docs/maintenance-checklist.md`

## Files To Review First Next Time

1. `lib/app/ingest/ingestDocumentModel.ts`
2. `lib/app/ingest/fileIngestFlow.ts`
3. `hooks/useFileIngestActions.ts`
4. `hooks/useGoogleDrivePicker.ts`
5. `lib/server/ingest/promptBuilder.ts`
6. `lib/server/ingest/resultSelection.ts`
7. `lib/app/send-to-gpt/sendToGptFlow.ts`
8. `app/page.tsx`
9. `docs/refactor-roadmap.md`
10. `docs/ingest-pipeline.md`
11. `docs/HANDOFF-2026-04-25.md`

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
