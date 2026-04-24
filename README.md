# kin-chat-app

`kin-chat-app` is a Kin + GPT workspace for conversation support, search, memory, library management, task execution, and knowledge ingest.

This repository is no longer just a chat UI. It now acts as an operational workspace where:

- Kin is the primary execution-side actor
- GPT works as search, memory, protocol, and backoffice support
- documents, search results, and transcripts can be stored and reused
- structured protocol blocks coordinate task execution between Kin and GPT

## Current Product Direction

The current product direction is:

1. strengthen Kin-driven workflows
2. make GPT a reliable backoffice for memory, search, library, and protocol handling
3. improve maintainability before large new feature waves
4. prepare the codebase for future ingest pipelines and shared-workspace style collaboration

## Core Capabilities

- Normal GPT chat
- Search support
  - `google_search`
  - `google_ai_mode`
  - `google_news`
  - `google_local`
  - `youtube_search`
- Memory interpretation
  - deterministic first-pass
  - LLM fallback for ambiguous phrasing
  - approval-based refinement
- Library and stored documents
- File ingest
- YouTube transcript fetch and Kin delivery
- Kin task protocol
  - `SYS_TASK`
  - `SYS_TASK_PROGRESS`
  - `SYS_SEARCH_REQUEST / RESPONSE`
  - `SYS_YOUTUBE_TRANSCRIPT_REQUEST / RESPONSE`
  - `SYS_GPT_RESPONSE`
  - `SYS_INFO`
- Multipart protocol delivery for long structured messages

## Current Architecture Direction

We are intentionally moving away from oversized integration points and toward clearer domain boundaries.

The current maintainability principles are:

1. keep UI thinner
2. move logic toward domain and service modules
3. reduce multi-path state mutation
4. add tests before risky refactors
5. update docs together with structural changes
6. when replacing old behavior with new behavior, remove the obsolete path back to its root when practical instead of leaving dormant code behind
7. for LLM-backed flows, never claim that a rewrite/overwrite path is gone until the full runtime path has been verified from prompt -> raw reply -> parsed reply -> post-parse transforms -> final adopted value
8. do not overstate certainty from a local read of recently touched files; if end-to-end verification is incomplete, say so plainly instead of promoting an inference to a fact

## Key Files To Review Before New Work

Before starting a new refactor or feature, review these first:

- `app/api/chatgpt/route.ts`
- `lib/app/sendToGptFlow.ts`
- `hooks/useGptMemory.ts`
- `lib/app/memoryInterpreter.ts`
- `hooks/useKinTaskProtocol.ts`

## Current Refactor Focus

We are in a staged maintainability pass.

Recent progress includes:

- `chatgpt/route` service extraction
- growing unit test coverage
- low-risk helper extraction from `useKinTaskProtocol`
- staged helper extraction from `useGptMemory`
- staged helper extraction from `memoryInterpreter.ts`
- inline URL dead-code cleanup in `sendToGptFlow.ts`
- panel-prop builder extraction for `app/page.tsx`
- chat-page action / panel / effect / hook arg builders extracted from `app/page.tsx`
- task-draft workspace extraction from `app/page.tsx`
- `useChatPageController` now composes smaller domain controller hooks while shared page-action contracts live in `chatPageActionTypes.ts`
- `useChatPageControllerArgs`, `useChatPageKinPanelProps`, and `useChatPageGptPanelArgs` now own most controller/panel argument assembly that used to sit inline in `app/page.tsx`
- `useChatPagePanelsComposition.tsx` now owns the final page-side controller + panel composition, so `app/page.tsx` no longer instantiates the controller hook or panel builder/render chain directly
- `useChatPagePanelsComposition.tsx` now consumes the workspace source groups directly, so the no-op passthrough layers `useChatPagePanelsView.tsx` and `useChatPageWorkspaceView.tsx` are gone
- `chatPageControllerCompositionTypes.ts` and `chatPagePanelCompositionTypes.ts` now split the old page-composition type hub into controller-facing and panel-facing contracts
- `chatPageControllerCompositionBuilders.ts` and `chatPagePanelCompositionBuilders.ts` now split workspace reshaping by authority boundary, making controller wiring and panel wiring easier to audit independently
- the page-to-controller action contract is now grouped by domain, and controller-side domain hooks consume those grouped sources directly
- shared recent-message / memory-update helper extraction for `sendToGptFlow`
- `sendToGptFlow` split into dedicated `context` / `builders` / `helpers` / `types` modules
- low-value `sendToGptFlowBundles.ts` staging was removed so the GPT flow now passes prepared request/finalize data directly
- `memoryInterpreter` topic-tail and sentence-pattern helpers extracted into shared text modules
- GPT settings rules / protocol UI split into dedicated section modules plus shared settings primitives
- GPT settings workspace split from the old hanging-drawer UI
- task drawer unification plus multi-draft / multi-progress task workflow support
- task suspend / hold support through `TASK_CONFIRM`
- transcript queue support for up to 3 YouTube URLs with Kin ACK gating
- roadmap and architecture docs

The current verification baseline is:

- `npx tsc --noEmit` passes
- `npm run lint` passes
- `npm test` passes
- `npm run build` passes
- current test count: `140 files / 602 tests`

Recent regression fixes and maintainability wins include:

- rejected memory-rule candidates now trigger memory reapplication, so an incorrect tentative topic can be cleared immediately after rejection
- GPT chat scroll position now stays stable when moving into and back out of the settings workspace on both desktop and mobile
- chat topic adjudication / approval flow has been structurally rebuilt and is now stable in live review
- task title auto-generation now uses a clean naming pipeline instead of truncating the first summary sentence
- task intent approval is now behaving as intended in live review:
  - natural-language task input creates an initial `SYS_TASK` draft
  - count / limit phrases stay out of the first draft and appear in the approval flow instead
  - approving a task-intent candidate immediately updates the Kin draft and the task-progress action items
  - task progress entries can now be cleared directly from the task-progress view if the user decides not to proceed
- `sendToGptFlow` now routes phase handoff, request shaping, finalize shaping, and protocol block assembly through focused builders instead of regrowing those decisions inline
- ingest authority is now much closer to one shared model across device ingest, Drive import, stored documents, and reference-library projection
- task runtime / draft sync / Kin transfer handoff now routes through shared builder boundaries instead of inline hook-local flow arg assembly
- responsive single-panel mode now routes through shared viewport/device helpers with direct tests for mobile UA, touch capability, and narrow-width selection
- GPT settings workspace sections are now split by approval authority and library/ingest authority, so the old section hub is less likely to regrow mixed UI/policy wiring
- task-draft prep/update/attach/deepen flows now share recent-message and success-postlude helpers instead of repeating assistant append and summary replay inline
- `sendToGptFlow` guard tests now live in their own test file, so gate failures are easier to diagnose separately from step/request builder failures
- library-first device ingest now routes through the library surface instead of the old file-tab flow, and the obsolete post-ingest UI/state/task-update branches have been removed rather than hidden
- fallback debug payload is no longer persisted into memory state, and the obsolete `gptMemoryStateSummaryMerge.ts` branch has been removed so memory compaction now follows one authoritative path
- memory lifecycle boundaries are now more explicit: `lib/memory.ts` names task-scoped list/context keys directly, and task-scoped cleanup now flows through one shared helper instead of local storage-specific cleanup logic
- memory rule persistence now flows through `lib/app/memoryRuleStore.ts`, so `useMemoryInterpreterSettings` no longer owns raw localStorage parsing/writing inline
- `useGptMemory.ts` now delegates runtime load/update/reapply handoff to `lib/app/gptMemoryRuntime.ts`, keeping the hook closer to a state facade instead of a mixed orchestration surface
- token accounting now restores correct total-token aggregation, treats memory compaction as a conversation-internal token line, and routes ingest-time summary-generation usage into the ingest bucket instead of the conversation compaction bucket
- task-intent constraint extraction now uses a fixed-slot LLM JSON schema instead of free-form candidate lists
- approved task constraints now compile directly into `CONSTRAINTS`, and task progress now derives from `CONSTRAINTS` instead of the removed `REQUIRED_WORKFLOW` / `OPTIONAL_WORKFLOW` sections
- task-intent approval wording is now deterministic and rule-aware (`up_to` / `exact` / `at_least` / `around`) instead of relying on drifting fallback prose

Current caution after the latest task/constraint stabilization:

- the task-intent / task-progress / compiler residue cleanup is substantially complete,
  but repo-wide `strict` / `creative` / `responseMode` remnants still exist outside the
  now-simplified normal chat prompt
- ingest authority and token-accounting cleanup remain the highest-signal maintenance
  boundary
- active mojibake cleanup is much smaller than before, but touched text-owner and
  parser files should still be reviewed carefully when edited

The current goal is not a rewrite. The goal is to keep shipping while shrinking hidden coupling and reducing future regressions.

## Docs

- [Architecture](./docs/architecture.md)
- [Domain Model](./docs/domain-model.md)
- [Refactor Roadmap](./docs/refactor-roadmap.md)
- [Maintenance Checklist](./docs/maintenance-checklist.md)
- [Memory Lifecycle](./docs/memory-lifecycle.md)
- [Next Session Handover](./docs/next-session.md)
- [Handoff 2026-04-18](./docs/HANDOFF-2026-04-18.md)
- [Handoff 2026-04-16](./docs/HANDOFF-2026-04-16.md)
- [Handoff 2026-04-15](./docs/HANDOFF-2026-04-15.md)
- [Architecture Guidelines](./docs/architecture-guidelines.md)
- [Handoff 2026-04-14](./docs/HANDOFF-2026-04-14.md)
- [Handoff 2026-04-11](./docs/HANDOFF-2026-04-11.md)

## Working Agreement For Refactors

For each maintainability step:

1. share the files to be touched first
2. keep the change small
3. stop after each mini-phase
4. run `npx tsc --noEmit`
5. run `npm test`
6. update docs and roadmap

For LLM-integrated bug fixing, do not stop at "the nearby helper looks clean".
The default expectation is end-to-end tracing of the adopted value. Prefer
removing the interfering path at its root over adding guards, overrides, or
prompt-side compensations.

Do not treat a tidy explanation as proof. Runtime observation outranks theory.
If only part of the path has been verified, state that limitation explicitly.

## Development Commands

```bash
npm run dev
```

```bash
npx tsc --noEmit
```

```bash
npm test
```

## Current Recommendation

Before large new features, continue maintainability work in this order:

1. simplify the task-intent path now that the fixed-slot constraint model is stable
2. audit repo-wide `strict` / `creative` / `responseMode` remnants and remove dead carry-through paths
3. continue shrinking the remaining legacy/current ingest split after the now-shared ingest authority model
4. keep `sendToGptFlow.ts` orchestration-only while watching for regrowth in request-text / shortcut / finalize surfaces
5. keep page/controller/panel composition in maintenance-watch mode instead of letting no-op pass-through glue regrow
6. continue opportunistic mojibake cleanup in still-active owner files when those boundaries are touched
7. continue adding narrow regression tests around the next touched boundary instead of broad rewrites

`hooks/useGptMemory.ts` and `lib/app/memoryInterpreter.ts` are now in a much safer stopping state than before. They should still be reviewed carefully when touched, but they no longer need to be the default first refactor target.

For the GPT settings surface, the next step is not just helper extraction. We expect a broader section-level reorganization so that search, memory, protocol, and ingest controls are easier to scan and maintain.
