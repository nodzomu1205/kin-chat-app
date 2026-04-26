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
- `lib/app/send-to-gpt/sendToGptFlow.ts`
- `hooks/useGptMemory.ts`
- `lib/app/memory-interpreter/memoryInterpreter.ts`
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
- current test count: `160 files / 693 tests`

Current maintenance status:

- the repository is in late-stage maintenance-watch, roughly `85-90%` complete
- send-to-GPT hub splitting is no longer the default next target; keep it in
  regrowth-watch mode
- the next default maintenance slice remains the Drive/device ingest boundary,
  now after Drive UI-feedback message, Picker document-action, runtime, and
  file-import execution extraction; preserve the existing `googleDriveApi.ts`
  / `googleDrivePickerBuilders.ts` ownership split

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
- library ingest now has explicit `compact / detailed / max` output authority, avoids duplicate model output fields, and no longer clips the final compact/detailed item after generation
- file import, Google Drive import, YouTube transcripts, search, and task snapshots now honor the shared library-card summary toggle
- file and Drive imports now post visible GPT chat completion messages
- task runtime / draft sync / Kin transfer handoff now routes through shared builder boundaries instead of inline hook-local flow arg assembly
- responsive single-panel mode now routes through shared viewport/device helpers with direct tests for mobile UA, touch capability, and narrow-width selection
- GPT settings workspace sections are now split by approval authority and library/ingest authority, so the old section hub is less likely to regrow mixed UI/policy wiring
- task-draft prep/update/attach/deepen flows now share recent-message and success-postlude helpers instead of repeating assistant append and summary replay inline
- `sendToGptFlow` guard tests now live in their own test file, so gate failures are easier to diagnose separately from step/request builder failures
- library-first device ingest now routes through the library surface instead of the old file-tab flow, and the obsolete post-ingest UI/state/task-update branches have been removed rather than hidden
- fallback debug payload is no longer persisted into memory state, and the obsolete `gptMemoryStateSummaryMerge.ts` branch has been removed so memory compaction now follows one authoritative path
- memory lifecycle boundaries are now more explicit: `lib/memory-domain/memory.ts` names task-scoped list/context keys directly, and task-scoped cleanup now flows through one shared helper instead of local storage-specific cleanup logic
- memory rule persistence now flows through `lib/app/memory-rules/memoryRuleStore.ts`, so `useMemoryInterpreterSettings` no longer owns raw localStorage parsing/writing inline
- `useGptMemory.ts` now delegates runtime load/update/reapply handoff to `lib/app/gpt-memory/gptMemoryRuntime.ts`, keeping the hook closer to a state facade instead of a mixed orchestration surface
- token accounting now restores correct total-token aggregation, treats memory compaction as a conversation-internal token line, and routes ingest-time summary-generation usage into the ingest bucket instead of the conversation compaction bucket
- task-intent constraint extraction now uses a fixed-slot LLM JSON schema instead of free-form candidate lists
- approved task constraints now compile directly into `CONSTRAINTS`, and task progress now derives from `CONSTRAINTS` instead of the removed `REQUIRED_WORKFLOW` / `OPTIONAL_WORKFLOW` sections
- task-intent approval wording is now deterministic and rule-aware (`up_to` / `exact` / `at_least` / `around`) instead of relying on drifting fallback prose
- response-mode cleanup now removes the dead settings/persistence carry-through from GPT options and page/panel workspace builders, and the controller/service boundary now names the fixed runtime value `reasoningMode`
- task-intent fallback, current-task intent refresh, Kin task start, Kin transfer, transform-intent, and send-to-GPT request internals now use `reasoningMode` for the LLM strict/creative runtime value; remaining `responseMode` references are protocol/task payload semantics such as structured results or ack modes
- file import and Drive import now share generated library-summary handling through `lib/app/ingest/importSummaryGeneration.ts`, so summary fallback, summary cleanup, and ingest usage aggregation have one post-request helper
- file import and Drive import now also share stored ingested-document record construction through `buildIngestedDocumentRecord`, keeping text cleanup, char count, and timestamps aligned
- file import and Drive import now share stored-document preparation through `lib/app/ingest/ingestStoredDocumentPreparation.ts`, keeping generated-summary usage and record construction on one post-request path
- library-summary usage normalization for ingest accounting now flows through `lib/app/ingest/ingestUsage.ts`, so file/Drive/search/task-snapshot summary usage stays on one ingest-bucket conversion path
- ingest app-side modules now live under `lib/app/ingest/`, making the first folder-organization pass concrete without changing runtime behavior
- send-to-GPT app-side modules now live under `lib/app/send-to-gpt/`, making the second folder-organization pass concrete without changing runtime behavior
- memory-interpreter app-side modules now live under `lib/app/memory-interpreter/`, making the third folder-organization pass concrete without changing runtime behavior
- GPT-memory app-side modules now live under `lib/app/gpt-memory/`, making the fourth folder-organization pass concrete without changing runtime behavior
- task-draft app-side modules now live under `lib/app/task-draft/`, making the fifth folder-organization pass concrete without changing runtime behavior
- task-runtime app-side modules now live under `lib/app/task-runtime/`, making the sixth folder-organization pass concrete without changing runtime behavior
- Kin protocol core and sidecar modules now live under `lib/app/kin-protocol/`, making the seventh folder-organization pass concrete without changing runtime behavior
- reference-library app-side modules now live under `lib/app/reference-library/`, making the eighth folder-organization pass concrete without changing runtime behavior
- search-history app-side modules now live under `lib/app/search-history/`, making the ninth folder-organization pass concrete without changing runtime behavior
- panel/UI state app-side modules now live under `lib/app/ui-state/`, making the tenth folder-organization pass concrete without changing runtime behavior
- remaining app-side utility clusters now live under dedicated folders: `gpt-task/`, `youtube-transcript/`, `memory-rules/`, `multipart/`, `task-support/`, `google-drive/`, `auto-bridge/`, and `gpt-context/`
- task-domain modules now live under `lib/task/`, reducing the number of files directly under `lib/`
- memory-domain modules now live under `lib/memory-domain/`, continuing the `lib` root organization pass
- shared primitives now live under `lib/shared/`, and the search facade now lives under `lib/search-domain/search.ts`
- component root files now live under `components/layout/`, `components/message/`, `components/ui/`, and `components/pwa/`
- `ReceivedDocsDrawer.tsx` was renamed to `LibraryDrawer.tsx`; it now owns drawer state and filtering only, while import controls, tab controls, library item cards, item header/actions/metadata, search preview, and stored-document editing live in focused local components
- the unused `SearchRawDrawer.tsx` wrapper was removed after confirming it had no live imports, and the existing library drawer render test is now included in the Vitest baseline
- Library drawer user-facing mojibake in item metadata and right-side card action glyphs was repaired through the local text owner/components (`gptUiText.ts`, `LibraryItemMetadata.tsx`, `LibraryItemCardHeader.tsx`, `LibraryItemCardActions.tsx`), with `LibraryDrawer.test.tsx` now pinning the visible labels and icon text
- Memory-facing mojibake from ingest/task flows was repaired at the source: task draft last-intent labels now come from `taskDraftIntentText.ts`, file-ingest saved info text is covered in `fileIngestFlowBuilders.ts`, and YouTube transcript punctuation/music-marker cleanup uses readable Japanese-safe regexes
- `messageSourcePreview.tsx` now delegates preview helpers, source banners, and YouTube transcript actions to focused local modules, and its dormant render/helper test is back in the Vitest baseline
- Drive picker maintenance now keeps picker/open-folder orchestration in `useGoogleDrivePicker.ts`, script/token readiness in `googleDrivePickerRuntime.ts`, Drive file/folder import and library upload execution in `googleDriveImportExecution.ts`, Drive HTTP operations in `lib/app/google-drive/googleDriveApi.ts`, and importability/Picker action/summary/stored-text/UI-feedback message shaping in `googleDrivePickerBuilders.ts`
- Drive folder index/import execution also lives in `googleDriveImportExecution.ts`, keeping folder traversal, index message posting, and importable-file filtering out of `useGoogleDrivePicker.ts`
- Drive library-item upload execution also lives in `googleDriveImportExecution.ts`, keeping child-folder listing, destination selection, upload execution, and upload feedback out of `useGoogleDrivePicker.ts`
- YouTube transcript batch request shaping now lives in `sendToGptYoutubeFlowBuilders.ts`, keeping queue splitting and transcript request bodies out of `useGptMessageActions.ts`
- queued YouTube transcript request execution now lives in `sendToGptYoutubeFlow.ts`, keeping transcript fetch/storage/Kin handoff side effects out of `useGptMessageActions.ts`
- YouTube transcript library import and send-to-Kin execution now live in `youtubeTranscriptLibraryFlows.ts`, keeping transcript fetch/storage/Kin side effects out of `useGptMessageActions.ts`
- GPT panel utility actions such as Ask AI Mode search, latest-Kin draft copy,
  receive-last-Kin, and latest-GPT transfer notices now live in
  `gptMessageActionFlows.ts`
- Google AI Mode continuation now uses compact markers such as `(#1)`,
  sends `continuable=true`, keeps location out of the query text, and preserves
  reconstructed markdown/code/table content from SerpAPI responses
- search-history localStorage load/save now lives in `lib/app/search-history/searchHistoryStorage.ts`, keeping persisted search settings out of `useSearchHistory.ts`
- `transformIntent.ts` is now a small public facade plus Kin directive assembly; rule-based directive parsing, API intent resolving, type definitions, text transformation runtime, and Kin chunk splitting live in focused task-runtime modules with a facade regression test
- `kinTransferFlows.ts` now delegates task-usage accumulation and Kin transfer status-message shaping to `kinTransferFlowBuilders.ts`, keeping the flow closer to orchestration-only
- Kin transfer flow argument/result contracts now live in `kinTransferFlowTypes.ts`, keeping `kinTransferFlows.ts` focused on the two transfer orchestrations
- `kinTransferFlows.ts` now stays as the public transfer facade while latest-GPT and current-task transfer orchestration live in `kinTransferLatestFlow.ts` and `kinTransferCurrentTaskFlow.ts`
- `GptDrawerRouter.tsx` now delegates device-import option shaping, meta/task/library/settings drawer prop bundles, and memory-settings reset/save shaping to `GptDrawerRouterHelpers.ts`, with direct helper coverage in the Vitest baseline
- `GptSettingsDrawer.tsx` and `GptSettingsWorkspace.tsx` now share search preset, engine-toggle, and source-count normalization through `GptSettingsSearchState.ts`; drawer numeric inputs use the existing shared settings primitive instead of a duplicate local field
- `GptSettingsDrawer.tsx` now delegates its memory and ingest tab bodies to `GptSettingsDrawerSections.tsx`, keeping the drawer closer to tab orchestration
- `GptSettingsWorkspaceViews.tsx` now reuses the shared memory settings section and memory reset/save builders, reducing duplicate settings UI and value-shaping logic
- the unused `GptSettingsWorkspaceSections.tsx` re-export layer and its orphaned generic approval section were removed after a live-reference check
- `GptSettingsApprovalSections.tsx` and `GptSettingsRulesSection.tsx` now share memory review option sets and topic-decision value shaping through `GptSettingsApprovalState.ts`, with focused helper coverage
- `GptSettingsApprovalSections.tsx` now delegates memory/sys approval item cards to `GptSettingsApprovalCards.tsx`, leaving the section file closer to section state and list composition
- `GptSettingsRulesSection.tsx` now delegates pending/approved memory and SYS rule cards to `GptSettingsRuleCards.tsx`, keeping rule sections closer to headings and visibility state
- `TaskProgressPanel.tsx` now delegates `SYS_TASK_CONFIRM` output normalization/building to `TaskProgressPanelHelpers.ts`, with focused helper coverage
- `TaskProgressPanel.tsx` now delegates requirement progress cards, user-facing request cards, and sync/suspend action sections to `TaskProgressPanelParts.tsx`, keeping the panel closer to local state and section composition
- `normalizerBuilders.ts` now keeps the public search normalizer builder facade while AI Mode block/table shaping, local-result shaping, YouTube shaping, and shared raw-text block formatting live in focused search-domain builder modules
- `sendToGptFlowGuards.ts` now delegates pure gate-context builders to `sendToGptFlowGateContextBuilders.ts`, keeping the guard file closer to side-effecting gate handlers
- `sendToGptPreparedRequestGates.ts` now owns prepared-request gates such as task-directive-only, protocol-limit, and YouTube transcript handling, leaving `sendToGptFlowGuards.ts` focused on pre-preparation gates plus public re-exports
- `sendToGptApiTypes.ts` now owns ChatGPT API request/response/search-source contracts, so `sendToGptFlowTypes.ts` is less of a catch-all type hub
- `sendToGptPreparedRequestTypes.ts` now owns prepared-request and gate context contracts, further narrowing `sendToGptFlowTypes.ts`
- `sendToGptFlowArgTypes.ts`, `sendToGptFlowArtifactTypes.ts`, and `sendToGptFlowBaseTypes.ts` now own the former flow type groups directly, so the unused `sendToGptFlowTypes.ts` facade was removed
- `sendToGptFlowContextResolvers.ts` now owns inline-search extraction, AI continuation artifacts, protocol limit priority, and protocol search-engine overrides, keeping `sendToGptFlowContext.ts` closer to public context composition
- `sendToGptPreparedGateHandlers.ts` now owns prepared-request gate side effects, leaving `sendToGptPreparedRequestGates.ts` focused on gate context assembly and decision dispatch
- `app/page.tsx` now delegates the root viewport shell and panel layout wrapper to `ChatAppShell.tsx`, keeping the page entry closer to domain hook wiring and workspace composition
- chat-page defaults now live in `chatPageDefaults.ts`, so the mobile breakpoint, default bridge settings, and current-Kin label derivation are shared instead of being parked in `app/page.tsx`
- `app/page.tsx` now passes named page-domain bundles into `useChatPageWorkspaceDomainInputs.ts`, so the large workspace state/action/service projection no longer lives inline in the page entry
- `app/page.tsx` now keeps chat UI state, GPT options, token usage, bridge settings, Kin manager state, task-draft workspace state, search history, task/protocol state, and reference-library state as named domain bundles instead of destructuring every field before reassembling workspace inputs
- `chatPagePanelCompositionBuilders.ts` now stays as the public panel-composition facade while section-level panel arg shaping lives in `chatPagePanelSectionBuilders.ts` and task snapshot persistence lives in `chatPageTaskSnapshot.ts`
- `chatPagePanelCompositionTypes.ts` now stays as a public type facade while panel arg contracts live in `chatPagePanelArgsTypes.ts` and workspace-view section contracts live in `chatPageWorkspaceViewTypes.ts`
- workspace reference/Drive view contracts now live in `chatPageWorkspaceReferenceTypes.ts`, keeping `chatPageWorkspaceViewTypes.ts` focused on the remaining page-view sections

Current caution after the latest task/constraint stabilization:

- the task-intent / task-progress / compiler residue cleanup is substantially complete,
  and the dead GPT settings/persistence response-mode path is now removed; remaining
  `responseMode` references are protocol/task payload fields and should not be
  confused with removed UI policy or LLM strict/creative runtime state
- library-ingest authority should stay under watch, especially when adding new ingest-adjacent flows or token accounting paths
- active mojibake cleanup is much smaller than before, but touched text-owner and
  parser files should still be reviewed carefully when edited

The current goal is not a rewrite. The goal is to keep shipping while shrinking hidden coupling and reducing future regressions.

## Docs

- [Architecture](./docs/architecture.md)
- [Domain Model](./docs/domain-model.md)
- [Refactor Roadmap](./docs/refactor-roadmap.md)
- [Maintenance Checklist](./docs/maintenance-checklist.md)
- [Memory Lifecycle](./docs/memory-lifecycle.md)
- [Repository Review 2026-04-25](./docs/repository-review-2026-04-25.md)
- [Next Session Handover](./docs/next-session.md)
- [Handoff 2026-04-25](./docs/HANDOFF-2026-04-25.md)
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

1. keep the remaining protocol/task-payload `responseMode` names under maintenance-watch, but treat the dead UI/settings and LLM strict/creative carry-through cleanup as substantially complete
2. keep the fixed library-ingest authority under watch while extracting any proven shared device/Drive post-request helpers
3. continue shrinking remaining device-file vs Drive ingest post-request divergence after the now-shared ingest authority model
4. keep `sendToGptFlow.ts` orchestration-only while watching for regrowth in request-text / shortcut / finalize surfaces
5. keep page/controller/panel composition in maintenance-watch mode instead of letting no-op pass-through glue regrow
6. continue opportunistic mojibake cleanup in still-active owner files when those boundaries are touched
7. continue adding narrow regression tests around the next touched boundary instead of broad rewrites

`hooks/useGptMemory.ts` and `lib/app/memory-interpreter/memoryInterpreter.ts` are now in a much safer stopping state than before. They should still be reviewed carefully when touched, but they no longer need to be the default first refactor target.

For the GPT settings surface, the next step is not just helper extraction. We expect a broader section-level reorganization so that search, memory, protocol, and ingest controls are easier to scan and maintain.
