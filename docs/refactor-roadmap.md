# Refactor Roadmap

Updated: 2026-04-17

## Purpose
This roadmap tracks the maintainability work for the repository.
We use it to keep three things visible at all times:

1. what has already been stabilized
2. what is being refactored now
3. what should be tackled next

The goal is not to rewrite everything at once. The goal is to keep shipping while reducing hidden coupling and future regressions.

Current verification baseline:
- `npx tsc --noEmit` passes
- `npm test` passes
- `npm run build` passes
- test status: `101 files / 441 tests`

## Current Assessment
The repository is already functionally strong, but a few integration points remain riskier than the rest.

Primary review points:
- `app/api/chatgpt/route.ts`
- `lib/app/sendToGptFlow.ts`
- `hooks/useGptMemory.ts`
- `lib/app/memoryInterpreter.ts`
- `hooks/useKinTaskProtocol.ts`
- `lib/app/kinMultipart.ts`

Current cleanup priority:
1. `app/page.tsx`
2. `lib/app/sendToGptFlow.ts`
3. `hooks/useChatPageController.ts`
4. `components/panels/gpt/GptSettingsSections.tsx`
5. `app/api/ingest/route.ts` / `hooks/useIngestActions.ts`

## Maintenance Checkpoint

This section is the current checkpoint for deciding whether the repository is in
"active refactor" or "maintenance watch" mode.

### Ready To Treat As Stabilized

These areas are not frozen forever, but they are stable enough that future work
should default to small edits, regression tests, and boundary respect instead of
new structural rewrites.

- LLM-first task/topic intent boundary
- task protocol refresh path from approval to draft/Kin sync
- panel-mode authority and responsive focus routing
- GPT settings / protocol text ownership
- shared ingest request boundary
- core workspace / protocol / ingest docs set

### Still In Maintenance Watch

These areas are much healthier than before, but should still be treated as
high-signal review points before and after changes.

- `app/page.tsx` and page-side composition boundaries
- `lib/app/sendToGptFlow.ts` and adjacent request/finalize coordinators
- legacy/current ingest split after the shared request + draft layers
- remaining builder reshaping across controller/panel composition
- future user-facing copy drift outside the text-owner files

### Exit Criteria For "Maintenance Complete"

We can treat the current maintainability program as complete when all of the
following are true:

1. legacy/current ingest paths share one practical post-request authority path
2. `sendToGpt` no longer regrows mixed policy inside the top-level coordinator
3. page/controller/panel composition stops regrowing no-op pass-through layers
4. text / settings labels continue to change through owner files only
5. new regressions are caught by tests before they reach manual device review

## Immediate Action Plan

This is the practical maintainability plan to follow next.
It is intentionally ordered by regression risk, not by which files are easiest to split.

### Priority 1: Freeze the LLM-first intent boundary

Why first:
- recent regressions showed that task generation becomes fragile when original user text is reduced, rewritten, or pre-classified before LLM review
- the same rule must stay true for both task generation and topic generation

Primary authority:
- `lib/taskIntent.ts`
- `lib/taskIntentFallback.ts`
- `lib/taskCompiler.ts`
- `hooks/useTaskProtocolActions.ts`
- `lib/app/memoryInterpreterFallbackOrchestrator.ts`
- `lib/app/memoryInterpreterFallbackFlow.ts`
- `docs/architecture-guidelines.md`

Boundary rules to keep:
- entry text goes to LLM broadly
- approval / rejection changes the live draft immediately
- only exact strong-confidence approved fragments may shortcut later
- no phrase-specific entry rules and no hidden fallback answer tables

Mini phases:
1. remove dead compatibility-era helpers from `lib/taskIntent.ts`
2. document source-of-truth fields for task recompile input in one place
3. add regression tests for "raw instruction survives approval / recompile / resend"
4. re-check memory/topic fallback for the same shortcut boundary

Done when:
- `task intent` and `topic intent` both follow the same LLM-first rule
- new work no longer needs guesswork about whether to read `goal`, `title`, or raw instruction

### Priority 2: Untangle task runtime, draft sync, and Kin injection

Why second:
- task bugs have repeatedly come from mixing four different concerns in the same paths:
  - user instruction interpretation
  - approval state changes
  - runtime mutation
  - Kin draft / injection generation

Primary authority:
- `hooks/useTaskProtocolActions.ts`
- `hooks/useTaskDraftHelpers.ts`
- `lib/taskProtocolTaskState.ts`
- `lib/app/kinTaskFlow.ts`
- `lib/app/kinTransferFlows.ts`
- `lib/app/miscUiFlows.ts`

Target responsibility split:
- `task intent + approval`
  - candidate parsing, approval, rejection, approved shortcut state
- `task runtime`
  - current task id, title, intent, original instruction, progress state
- `task draft sync`
  - page-visible editable draft only
- `Kin injection`
  - compiled SYS block delivery only

Mini phases:
1. write a short contract comment for `originalInstruction`, `currentTaskIntent.goal`, and `currentTaskDraft.userInstruction`
2. reduce repeated `sourceInstruction` fallback logic into one helper owned by the task-runtime boundary
3. move Kin injection assembly behind a narrower helper so approval flows do not build transport details directly
4. add a recompile-path test matrix: approve, edit, delete, resend

Done when:
- the same task edit does not need to touch UI draft sync and transport assembly in multiple places
- approval flows no longer reconstruct transport details inline

### Priority 3: Re-audit page-side composition before it regrows

Why third:
- `app/page.tsx` is thinner now, but the next risk is the broad workspace bundle flowing into page-side composition
- if ignored, the old giant-page problem will come back one hook later

Primary authority:
- `app/page.tsx`
- `hooks/useChatPagePanelsComposition.tsx`
- `hooks/useChatPageController.ts`
- `hooks/chatPageControllerCompositionBuilders.ts`
- `hooks/chatPagePanelCompositionBuilders.ts`
- `hooks/useChatPageControllerArgs.ts`
- `hooks/useChatPageGptPanelArgs.ts`
- `hooks/useChatPageKinPanelProps.ts`

Target responsibility split:
- `app/page.tsx`
  - state roots, hook calls, final render only
- `useChatPagePanelsComposition.tsx`
  - page-side composition only
- `useChatPageController.ts`
  - grouped domain action composition only
- composition builders
  - shape conversion only, no new authority

Mini phases:
1. inventory the current `ChatPageWorkspaceViewArgs` bundle by domain
2. remove any fields that are only pass-through noise
3. stop builder files from quietly owning business decisions
4. decide whether controller composition should stay page-only or become an app-level controller boundary

Done when:
- a new feature can identify one clear place for page composition work
- builders stop becoming hidden policy owners

### Priority 4: Unify responsive and panel-mode authority

Why fourth:
- recent regressions showed that layout mode, device heuristics, and panel toggles are still too loosely coupled
- touch PCs and narrow desktop windows should not accidentally fall through to phone-only behavior

Primary authority:
- `hooks/useResponsive.ts`
- `components/panels/kin/KinPanel.tsx`
- `components/panels/gpt/GptPanel.tsx`
- page/controller hooks that choose active panel or panel-mode state

Target responsibility split:
- device / viewport detection
- layout mode decision
- panel visibility / tab state

Mini phases:
1. map every place that decides `isMobile`, single-panel mode, or active tab defaults
2. reduce duplicate heuristics
3. add explicit tests for touch desktop, narrow desktop, and phone

Done when:
- "why did this become mobile UI?" has one answer path
- connection / drawer toggle behavior does not depend on hidden device heuristics

### Priority 5: Keep text and settings ownership boring

Why fifth:
- label regressions have been frequent, but ownership is now much better
- the goal here is to keep that progress stable instead of letting ad-hoc strings creep back in

Primary authority:
- `components/panels/gpt/gptSettingsText.ts`
- `components/panels/gpt/gptUiText.ts`
- `components/panels/kin/kinUiText.ts`
- `components/panels/kin/kinManagementText.ts`
- high-churn settings / toolbar / drawer components

Mini phases:
1. finish normalizing garbled but still live text constants
2. remove display-side emergency overrides once source text is safe to edit directly
3. keep adding narrow UI regression tests for user-facing labels that drift often

Done when:
- user-facing labels have one obvious owner
- copy fixes do not require hunting across multiple panels and helper files

## File Responsibility Table

Use this table before editing. If a change would cross multiple rows, pause and split the work.

| Domain | Source of truth | Should own | Should not own |
| --- | --- | --- | --- |
| Task intent discovery | `lib/taskIntent.ts`, `lib/taskIntentFallback.ts` | candidate extraction and approval-aware interpretation | transport assembly, UI field sync |
| Task runtime state | `lib/taskProtocolTaskState.ts`, `hooks/useKinTaskProtocol.ts` | task lifecycle state and protocol transitions | panel rendering or ad-hoc string formatting |
| Task draft sync | `hooks/useTaskDraftHelpers.ts` | editable page draft projection | intent classification or Kin send policy |
| Kin task transport | `lib/app/kinTaskFlow.ts`, `lib/app/kinTransferFlows.ts` | compiled SYS block delivery and injection | deciding what the task means |
| Topic fallback | `lib/app/memoryInterpreterFallbackOrchestrator.ts` | approved-fragment shortcut and LLM fallback orchestration | broad entry-side pre-classification |
| Page composition | `app/page.tsx`, `hooks/useChatPagePanelsComposition.tsx` | state roots and final composition | hidden business policy |
| Controller composition | `hooks/useChatPageController.ts` | grouped domain action composition | page render concerns or raw panel formatting |
| Responsive mode | `hooks/useResponsive.ts` | viewport/device heuristics | protocol or task policy |
| Text ownership | `components/panels/gpt/gptSettingsText.ts`, `components/panels/gpt/gptUiText.ts`, `components/panels/kin/kinUiText.ts`, `components/panels/kin/kinManagementText.ts` | labels, user-facing copy, formatting helpers | runtime flow decisions |

## Phase Plan

### Phase 1: Foundation
Goal:
- reduce change impact
- extract services from oversized files
- introduce tests around brittle protocol and memory logic

Current scope:
- docs
- `app/api/chatgpt/route.ts` service extraction
- `app/page.tsx` / controller thinning
- protocol / task / multipart / memory test coverage

### Phase 2: Ingest Generalization
Goal:
- evolve ad-hoc ingest flows into a reusable ingest pipeline

Planned scope:
- `IngestJob`
- `IngestItem`
- source adapters
- progress UI

### Phase 3: Proposal Workflow Hardening
Goal:
- make Kin-originated task / knowledge proposals safer and easier to audit

Planned scope:
- `ProtocolAction`
- `ExecutionBudget`
- approval workflow
- audit log

### Phase 4: Shared Workspace
Goal:
- prepare shared state for future multi-Kin collaboration

Planned scope:
- `Workspace`
- `SharedArtifact`
- `HandoffRecord`
- role / handoff rules

### Phase 5: Kin-first UI
Goal:
- move toward a Kin-first workspace with GPT as a backoffice layer

Planned scope:
- Kin-centered workspace UI
- GPT settings / audit / operations backoffice

## Progress

### 1. Docs
Status: In progress

Done:
- `README.md`
- `docs/architecture.md`
- `docs/domain-model.md`
- `docs/refactor-roadmap.md`
- `docs/protocol-actions.md`
- `docs/ingest-pipeline.md`
- `docs/workspace-model.md`

Next:

### 2. Page / UI Thinning
Status: Partially done

Done:
- `GptSettingsDrawer` split
- `ReceivedDocsDrawer` cleanup
- part of `app/page.tsx` orchestration extraction
- `panelPropsBuilders.ts` now absorbs pending-injection progress, task-draft field callbacks, and settings count clamping
- `useTaskDraftWorkspace.ts` now absorbs task-draft slot state and navigation from `app/page.tsx`
- `app/page.tsx` effect / hook inputs now call hooks directly after removing no-op passthrough builder layers
- no-op page action / panel passthrough builders were removed after they stopped carrying real authority
- `chatPageActionTypes.ts` now owns the shared page-action type contracts that other hooks and memory modules depend on
- `useChatPageController.ts` now composes grouped domain action sets (`kin` / `gpt` / `task` / `protocol` / `memory`) through smaller controller hooks instead of delegating through an extra facade hook
- `useChatPageController.ts` now owns the page-level wiring between chat actions, protocol automation, and panel reset actions
- `useChatPageControllerArgs.ts`, `useChatPageKinPanelProps.ts`, and `useChatPageGptPanelArgs.ts` now own the controller/panel argument assembly that previously lived inline in `app/page.tsx`
- `useChatPagePanelsComposition.tsx` now owns the final page-side controller + panel composition, so `app/page.tsx` no longer instantiates `useChatPageController`, `KinPanel`, `GptPanel`, or `buildGptPanelProps(...)` directly
- workspace view-args assembly with panel refs now also lives inside `useChatPagePanelsComposition.tsx`, so `app/page.tsx` only passes grouped workspace state/actions/services plus refs instead of constructing final composition view args itself
- `chatPagePanelCompositionBuilders.ts` now shares one panel-base projection plus GPT references projection helpers instead of repeating the same workspace reshaping across both panel builders
- `useChatPageController.ts` now assembles the grouped controller return through one helper, keeping the hook focused on domain-action wiring rather than inline return-shape construction
- `useChatPagePanelsComposition.tsx` now consumes page workspace groups directly and owns task-snapshot glue itself, so the no-op passthrough hooks `useChatPagePanelsView.tsx` and `useChatPageWorkspaceView.tsx` were removed
- `chatPageControllerCompositionTypes.ts` and `chatPagePanelCompositionTypes.ts` now split the old page-composition type hub by authority boundary instead of keeping controller and panel contracts in one file
- `chatPageControllerCompositionBuilders.ts` and `chatPagePanelCompositionBuilders.ts` now split workspace reshaping into controller-side and panel-side builders, making the remaining page composition path easier to audit
- persisted page-side settings hooks now load storage through lazy initializers instead of mount-only `setState`, reducing React 19 `set-state-in-effect` debt across the page path
- protocol default text is now centralized in `kinProtocolText.ts`, and protocol migration now auto-repairs stale legacy / mojibake saved defaults before they reappear in settings or task flows
- legacy `SYS_KIN_RESPONSE` guidance is now migrated to the requested `KIN_RESPONSE` format while the Kin send flow still accepts old replies for compatibility
- `page -> controller` action wiring now crosses the boundary as grouped `identity / uiState / task / protocol / search / services` args, and controller-side domain hooks now consume those grouped sources directly without a broad flatten step
- `chatPageControllerArgBuilders.ts` now owns the sub-hook input reshaping that used to sit inline in `useChatPageController.ts`
- `useChatPageMessagingDomainActions.ts` now owns the GPT / Kin controller-side composition, allowing the thin wrappers `useChatPageGptActions.ts` and `useChatPageKinActions.ts` to be removed
- `useChatPageTaskDomainActions.ts` now owns the task / protocol / file-ingest controller-side composition, allowing the thin wrappers `useChatPageTaskActions.ts` and `useChatPageProtocolActions.ts` to be removed
- `useChatPagePanelDomainActions.ts` now owns protocol automation + panel reset composition, so `useChatPageController.ts` no longer wires those effects/actions inline
- `usePendingMemoryRuleQueue.ts` now owns the memory-rule candidate merge policy instead of leaving that closure inline in `app/page.tsx`
- `useTaskProtocolProjection.ts` and `useArchiveCompletedTaskResults.ts` now own page-facing task-protocol projection and completed-task archive lifecycle glue
- GPT settings now have a separate full-area workspace path with 3 icon entry points while the existing hanging drawers remain in place
- GPT chat scroll position is now preserved when switching into and back out of the settings workspace
- `KinPanel` now receives direct render props from `app/page.tsx`; its thin builder layer was removed
- `GptPanel` now has a formal split between:
  - `BuildGptPanelArgs` for section-grouped builder input
  - `GptPanelProps` for section-only rendering
- GPT drawer consumers now depend on section contracts instead of broad `GptPanelProps` picks where possible
- GPT settings rules / protocol UI is now split into dedicated section modules plus shared settings primitives, so `GptSettingsSections.tsx` no longer carries those two large blocks inline
- `useGptMemory.ts` reduced to a smaller orchestration hook
- `memoryInterpreter.ts` reduced through staged helper extraction
- rejected memory-rule candidates now trigger immediate memory reapplication so tentative wrong topics can be cleared
- task drawer now supports approval-driven `SYS_TASK` drafting where count / limit candidates are approved separately and reflected immediately into both the Kin draft and task-progress action items
- task-progress view now supports direct user-side clear / archive when a drafted task should not proceed

Next:
- review whether `useChatPageController.ts` should stay as a thin page-only hook or become a wider `useChatAppController`
- review whether the remaining `app/page.tsx` orchestration should stay as explicit `useChatPagePanelsComposition(...)` source groups or move further behind page-facing composition hooks
- decide whether pure-transfer GPT panel sections (`protocol` / `references` / parts of `settings`) should eventually be assembled outside `panelPropsBuilders`
- review whether the remaining memory-rule / task coordination should move behind a narrower controller boundary
- keep task-progress lifecycle controls (`start / archive / selection / approval refresh`) concentrated in the task protocol controller boundary instead of regrowing in `useChatPageController.ts` or page-level UI code

### 2.5. Task Protocol Hook Thinning
Status: In progress

Primary file:
- [`hooks/useKinTaskProtocol.ts`](../hooks/useKinTaskProtocol.ts)

Done:
- protocol ingest extraction
- empty runtime / requirement merge extraction
- pending-answer / finalize mutation extraction
- task start / replace-current-intent state builder extraction
- task recompile source-of-truth fallback is now centralized so approval refresh uses one `originalInstruction -> draft -> goal` rule
- `taskIntent` regression coverage now targets the live fallback/shortcut path directly, and old test-only public shortcut helpers were removed from the module surface
- compiled Kin task multipart/input preparation now flows through one transport helper instead of being rebuilt inline inside approval refresh and task-start flows
- approval-driven current-task refresh now has an explicit `resolve intent` step and a separate `apply runtime/draft/transport` step inside the flow
- `useTaskProtocolActions.ts` now routes approve/update/delete through one shared current-task refresh helper instead of rebuilding the same refresh call three times
- approved-candidate normalization now lives behind a task-intent-domain helper instead of being rebuilt inline inside UI flow code
- `useTaskProtocolActions.test.ts` now locks the refresh boundary for approve/update/delete, including the `originalInstruction -> draft -> goal` source fallback order
- approved-phrase collection transforms (`approve` / `update` / `delete`) now live in the task-intent domain instead of `miscUiFlows.ts`
- current-task refresh orchestration now lives in its own app-flow module (`currentTaskIntentRefresh`) instead of sharing a general UI flow file
- task draft protocol sync now uses a shared draft-projection helper and shared param type instead of rebuilding the projection shape inline inside the hook
- task runtime start/replace now share one prompt-artifact helper for title / compiled prompt / requirement-progress generation instead of duplicating that assembly
- `useKinTaskProtocol.ts` now routes most runtime mutations through shared commit/mutate helpers instead of repeating `runtime + snapshots` update wiring inline
- archive fallback selection now has a pure helper in `taskRuntimeCollection.ts`, with tests covering active-task and non-active-task archive behavior
- page composition now attaches panel scroll refs through a workspace-composition builder helper instead of doing a final inline `ui` spread in `app/page.tsx`
- `useChatPagePanelsComposition.tsx` no longer returns an unused controller object, and task-snapshot save glue now lives behind panel-composition builders with regression tests
- single-panel layout authority now routes through `usePanelLayout.ts` and `lib/app/panelLayout.ts`, so page-level active-panel normalization and action-side panel focusing no longer each own their own mobile checks
- protocol automation, stored-document loading, multipart restore, file-ingest Kin focus, and GPT/Kin transfer flows now depend on shared `focusKinPanel` / `focusGptPanel` callbacks instead of scattering `if (isMobile) setActiveTab(...)`
- task/protocol flows and `sendToGpt` arg builders now use the same shared panel-focus callbacks, and responsive tests now pin wide desktop, narrow desktop, and touch-desktop layout expectations
- page/composition contracts now name panel visibility state as `activePanelTab` / `setActivePanelTab`, so panel-level navigation is easier to distinguish from local drawer/settings tabs
- `useResponsive.ts` now documents that it only owns the single-panel-layout heuristic and must not choose which panel gets focus
- panel composition now names cross-panel actions as `onSwitchToKinPanel` / `onSwitchToGptPanel`, reducing ambiguity with unrelated local `activeTab` setters inside drawers and settings
- `app/test-task/page.tsx` now follows the same `usePanelLayout` / `isSinglePanelLayout` naming as the main page, so the sandbox panel route does not drift from production layout terminology
- `chatPageWorkspaceCompositionBuilders.ts` no longer keeps a private no-refs workspace shape plus a second refs wrapper; the final workspace view args are now built in one pass
- `useChatPageControllerArgs.ts` now consumes workspace view args directly, so controller composition no longer depends on a separate workspace-to-controller reshaping builder
- protocol automation labels now live in dedicated text-owner modules (`gptProtocolAutomationText.ts`, `gptUiTextOverrides.ts`), and the GPT toolbar's `データ取込` label is no longer hardcoded inline in the render path
- test coverage for parser, runtime, ingest, state, mutations, and task-state helpers
- task intent approval flow rebuilt toward:
  - LLM-primary candidate extraction
  - approved shortcut matching
  - immediate recompile / Kin draft sync after approval
- task-progress runtime now exposes direct archive support used by the progress UI clear button

Next:
- physically remove dead compatibility-era helpers from `lib/taskIntent.ts` so the active runtime path is easier to audit
- decide whether `addPendingRequest` should also move to a pure helper
- continue Priority 4 by deciding whether `useResponsive.ts` should stay heuristic-only or graduate into a broader layout-mode boundary with explicit narrow-desktop tests

### 3. Server Route Service Extraction
Status: In progress

Primary file:
- [`app/api/chatgpt/route.ts`](../app/api/chatgpt/route.ts)

Done:
- [`lib/server/chatgpt/openaiResponse.ts`](../lib/server/chatgpt/openaiResponse.ts)
  - `extractUsage`
  - `extractJsonObjectText`
  - `extractResponseText`
- [`lib/server/chatgpt/requestNormalization.ts`](../lib/server/chatgpt/requestNormalization.ts)
  - `resolveChatRouteMode`
  - `normalizeInstructionMode`
  - `normalizeReasoningMode`
  - `normalizeMemoryInput`
  - `normalizeChatMessages`
- [`lib/server/chatgpt/promptBuilders.ts`](../lib/server/chatgpt/promptBuilders.ts)
  - `buildInstructionWrappedInput`
  - `buildBaseSystemPrompt`
  - `buildSearchSystemPrompt`
- [`lib/server/chatgpt/openaiClient.ts`](../lib/server/chatgpt/openaiClient.ts)
  - `callOpenAIResponses`
  - `extractOpenAIJsonObjectText`
- [`lib/server/chatgpt/searchRequest.ts`](../lib/server/chatgpt/searchRequest.ts)
  - `resolveSearchRequest`
- [`lib/server/chatgpt/searchExecution.ts`](../lib/server/chatgpt/searchExecution.ts)
  - `executeSearchRequest`
  - normalization helpers
- [`lib/server/chatgpt/responseBuilders.ts`](../lib/server/chatgpt/responseBuilders.ts)
  - `buildChatRouteResponse`
  - `buildMapLinkShortcutResponse`
- [`lib/app/sendToGptTranscriptHelpers.ts`](../lib/app/sendToGptTranscriptHelpers.ts)
  - YouTube transcript request helper extraction
- [`lib/app/sendToGptFlowRequestPreparation.ts`](../lib/app/sendToGptFlowRequestPreparation.ts)
  - protocol limit resolution
  - combined `prepareSendToGptRequest` request-preparation step extracted from `sendToGptFlow.ts`
  - `buildPreparedRequestArtifacts` now isolates the pure request-ready enrichment step inside request preparation
- [`lib/app/sendToGptFlowRequestPayload.ts`](../lib/app/sendToGptFlowRequestPayload.ts)
  - chat API request payload builder
- [`lib/app/sendToGptFlowRequestText.ts`](../lib/app/sendToGptFlowRequestText.ts)
  - protocol override request-text builder
  - final request-text assembly
- [`lib/app/sendToGptFlowState.ts`](../lib/app/sendToGptFlowState.ts)
  - implicit search usage / context helper
  - protocol post-response side-effect helper
  - shared recent-message / previous-topic memory-update helpers
- [`lib/app/sendToGptFlowGuards.ts`](../lib/app/sendToGptFlowGuards.ts)
  - now grouped into pre-preparation and post-preparation gate pipelines for the main `sendToGpt` coordinator
- [`lib/app/sendToGptProtocolBuilders.ts`](../lib/app/sendToGptProtocolBuilders.ts)
  - protocol request / response block builders extracted from the former monolithic `sendToGptFlowHelpers.ts`
- [`lib/app/sendToGptFlowTypes.ts`](../lib/app/sendToGptFlowTypes.ts)
  - shared flow / helper protocol and artifact types extracted for reuse across `sendToGptFlow.ts` and helpers
- [`lib/app/sendToGptFlowContext.ts`](../lib/app/sendToGptFlowContext.ts)
  - protocol event / search-context derivation extracted from the former monolithic `sendToGptFlowHelpers.ts`
  - now internally split into protocol interaction extraction, protocol limit resolution, and derived search resolution helpers
  - [`lib/app/sendToGptText.ts`](../lib/app/sendToGptText.ts)
    - UTF-8-safe request text and task-info text helpers extracted so the main `sendToGpt` path no longer depends on mojibake-prone literals
  - [`lib/app/sendToGptFlowArgBuilders.ts`](../lib/app/sendToGptFlowArgBuilders.ts)
    - common `runSendToGptFlow` arg assembly extracted from `useGptMessageActions.ts`
  - [`lib/app/sendToGptFlowRequest.ts`](../lib/app/sendToGptFlowRequest.ts)
    - chat API request execution and assistant-artifact shaping extracted from the main `runSendToGptFlow` coordinator
  - [`lib/app/sendToGptFlowResponse.ts`](../lib/app/sendToGptFlowResponse.ts)
    - assistant response shaping, protocol wrapping, and protocol search-response artifacts extracted from the former monolithic `sendToGptFlowHelpers.ts`
  - [`lib/app/sendToGptFlowGuards.ts`](../lib/app/sendToGptFlowGuards.ts)
    - early-return gate handling extracted from the front half of `runSendToGptFlow`
  - [`lib/app/sendToGptFlowFinalize.ts`](../lib/app/sendToGptFlowFinalize.ts)
    - assistant finalize side effects, implicit search handling, and memory follow-up extracted from the back half of `runSendToGptFlow`
- [`lib/app/sendToGptFlow.ts`](../lib/app/sendToGptFlow.ts)
  - request / search / protocol / memory / UI args now grouped through shared flow-slice types
  - low-value request/finalize bundle staging was removed so the coordinator now passes prepared request data directly into `request` and `finalize`
- [`lib/app/memoryInterpreterText.ts`](../lib/app/memoryInterpreterText.ts)
  - shared text normalization / topic candidate helpers extracted from `memoryInterpreter.ts`
  - search-directive detection is now anchored to a UTF-8-safe shared prefix regex
- [`lib/app/memoryInterpreterTopicText.ts`](../lib/app/memoryInterpreterTopicText.ts)
  - shared topic-tail cleanup now keeps `memoryInterpreterText.ts` and `memoryInterpreterTopicExtractor.ts` aligned
- [`lib/app/memoryInterpreterTextPatterns.ts`](../lib/app/memoryInterpreterTextPatterns.ts)
  - shared acknowledgement lead-in and sentence-marker patterns extracted for reuse across memory text helpers
- [`lib/app/memoryInterpreterFacts.ts`](../lib/app/memoryInterpreterFacts.ts)
  - fact / preference / tracked-entity helpers extracted from `memoryInterpreter.ts`
- [`lib/app/memoryInterpreterWorks.ts`](../lib/app/memoryInterpreterWorks.ts)
  - active-document resolution and works-by-entity merge helpers extracted from `memoryInterpreter.ts`
- [`lib/app/memoryInterpreterContext.ts`](../lib/app/memoryInterpreterContext.ts)
  - context / goal / follow-up-rule helpers extracted from `memoryInterpreter.ts`
- [`lib/app/memoryInterpreterFallbackHelpers.ts`](../lib/app/memoryInterpreterFallbackHelpers.ts)
  - approved-rule matching and fallback prompt / JSON helpers extracted from `memoryInterpreter.ts`
- [`lib/app/gptMemoryStorage.ts`](../lib/app/gptMemoryStorage.ts)
  - local storage and kin-memory-map load/save helpers extracted from `useGptMemory.ts`
- [`lib/app/gptMemoryCandidatePreparation.ts`](../lib/app/gptMemoryCandidatePreparation.ts)
  - fallback evaluation, candidate filtering, and candidate-memory preparation extracted from `useGptMemory.ts`
- [`lib/app/gptMemoryUpdateCoordinator.ts`](../lib/app/gptMemoryUpdateCoordinator.ts)
  - summarize branch and finalized update orchestration extracted from `useGptMemory.ts`
- [`lib/app/gptMemorySummaryResolution.ts`](../lib/app/gptMemorySummaryResolution.ts)
  - summarized-state resolution extracted from `useGptMemory.ts`
- [`lib/app/gptMemoryReapply.ts`](../lib/app/gptMemoryReapply.ts)
  - approved-rule merge and reapplicable-recent selection extracted from `useGptMemory.ts`
- [`lib/app/gptMemoryRegistry.ts`](../lib/app/gptMemoryRegistry.ts)
  - kin-memory-map registry updates and memory-settings normalization extracted from `useGptMemory.ts`
- [`lib/app/sendToGptShortcutFlows.ts`](../lib/app/sendToGptShortcutFlows.ts)
  - inline URL shortcut helper is now on the main execution path
- redundant library response post-processing branches removed from `sendToGptFlow.ts`
- dead local inline search / URL helper functions removed from `sendToGptFlow.ts`
- low-risk unused imports in `sendToGptFlow.ts` cleaned as part of iterative polishing
- remaining dead inline URL fallback block removed from `sendToGptFlow.ts`
- request-start UI mutation, shared GPT assistant-message creation, and request-failure append logic now live in `sendToGptFlowState.ts`, leaving `sendToGptFlow.ts` closer to orchestration-only
- prepared-request limit-violation resolution and final-request-text assembly now live behind dedicated helpers in `sendToGptFlowRequestPreparation.ts`, so the remaining request-preparation path is easier to unit-test directly
- protocol request-answer parsing and AI continuation artifact assembly now live behind dedicated helpers in `sendToGptFlowContext.ts`, with direct tests covering REQ parsing, continuation-token/link selection, and protocol limit priority
- `preparedRequest` gate-time and execution-time projections now live behind dedicated helpers in `sendToGptFlowRequestPreparation.ts`, reducing deep property reads inside `sendToGptFlow.ts`
- `PreparedRequestGateContext` / `PreparedRequestExecutionContext` now live in shared `sendToGptFlowTypes.ts`, and the GPT request payload assembly is exposed via a public helper in `sendToGptFlowRequest.ts` for direct tests
- `PreparedRequestFinalizeContext` now carries the finalize-time subset into `sendToGptFlowFinalize.ts`, so `sendToGptFlow.ts` no longer manually fans out each finalize argument
- explicit search-usage replay and memory-follow-up summary handling now live behind dedicated helpers in `sendToGptFlowFinalize.ts`, so finalize reads more like orchestration than a mixed side-effect block
- task-directive, protocol-limit, and youtube-transcript gate projections now live behind dedicated helpers in `sendToGptFlowGuards.ts`, so `runPreparedRequestGates(...)` mostly coordinates decision-to-handler dispatch
- multipart-import and inline-URL pre-preparation projections now also live in `sendToGptFlowGuards.ts`, and `prepareSendToGptMemoryContext(...)` now bundles memory-context + request-memory setup for `sendToGptFlow.ts`
- ingest extraction shaping and GPT bridge-state updates now live behind dedicated helpers in `fileIngestFlow.ts`, with direct tests covering extracted-text normalization and `activeDocument` / recent-message bridge updates
- Kin injection block assembly and post-ingest prepared/deepened task-draft projection now also live behind dedicated helpers in `fileIngestFlow.ts`, reducing late-stage branching inside `runFileIngestFlow(...)`
- ingest summary-message assembly and attach-to-current-task input/draft projection also now live behind dedicated helpers in `fileIngestFlow.ts`, further shrinking the late-stage mixed string-building / draft-mutation block
- ingest transform resolution and auto-prep / auto-deepen orchestration now also flow through dedicated helpers in `fileIngestFlow.ts`, while keeping the existing fallback strings and branching behavior unchanged
- ingest-side GPT memory wiring now uses `KinMemoryState`-based runtime types instead of local `any` placeholders, tightening the `useFileIngestActions.ts` -> `fileIngestFlow.ts` boundary without changing behavior
- `useFileIngestActions.ts` now builds a dedicated `runFileIngestFlow(...)` arg bundle instead of expanding the full call inline, and task-draft GPT memory bridging now also uses `KinMemoryState`-based types instead of local `any` placeholders
- `useTaskDraftActions.ts` now builds dedicated flow-arg bundles through `taskDraftFlowArgBuilders.ts` instead of expanding every task-draft flow call inline
- task-draft flow request start, recent-message slicing, assistant-result bridging, and summary-usage replay now flow through shared helpers in `taskDraftFlowShared.ts`, with direct tests pinning the sequence
- prepared/deepened task-draft projection and library-source resolution now live in `taskDraftFlowProjection.ts`, reducing repeated `setCurrentTaskDraft(...)` shapes inside `taskDraftActionFlows.ts`
- task-draft title resolution and GPT/manual source builders now live in `taskDraftFlowResolvers.ts`, so `taskDraftActionFlows.ts` no longer owns those task-domain decisions inline
- `/api/ingest` now reads request/result normalization and line-budget helpers through shared `lib/server/ingest/routeHelpers.ts`, with direct tests covering output extraction, parsed-result normalization, and budget fallback behavior
- `/api/ingest` prompt assembly now lives in `lib/server/ingest/promptBuilder.ts`, with direct tests covering visual/text-mode prompt guidance
- `useIngestActions.ts` now routes legacy label/block/planner-transform helpers through `lib/app/legacyIngestHelpers.ts`, so the hook is less responsible for low-level ingest helper text assembly
- `/api/ingest` selected-line / summary-level branching now also lives in `lib/server/ingest/resultSelection.ts`, so the route no longer owns the full result-budget decision tree inline
- `useIngestActions.ts` now routes post-ingest auto prep/deepen resolution and ingest summary-message assembly through `lib/app/legacyIngestFlowHelpers.ts`, with direct tests covering both helper outputs
- `app/api/ingest/route.ts` itself is now aligned to helper-backed orchestration, with local parsing/budget/prompt duplication removed in favor of server helper modules
- `useIngestActions.ts` was rewritten around helper-backed orchestration as well, so the legacy hook no longer carries private low-level helper implementations inline
- legacy local helper block removed from `route.ts`
- `lib/app/ingestClient.ts` now owns shared `/api/ingest` request assembly, fetch, title resolution, and error resolution for both `useIngestActions.ts` and `fileIngestFlow.ts`
- ingest-side task-draft projection now also flows through shared `ingestTaskDraftUpdates.ts`, so both the legacy ingest hook and `fileIngestFlow.ts` reuse the same attach/prep/deepen draft mutation helpers
- `docs/ingest-pipeline.md` now documents the current ingest boundaries so the legacy hook and newer flow do not drift back into separate private helper stacks
- approved-candidate reapply now uses the same formal memory recomputation path as approved-rule reapply
- closing-reply detection now uses a single source of truth
- chat topic adjudication flow was structurally rebuilt and reached a stable live-reviewed state
- task title auto-generation was rebuilt around a clean naming pipeline
- `currentTaskIntentRefresh.test.ts` now fixes the approval refresh path end-to-end at the flow boundary, covering LLM re-interpretation, runtime replace, task-draft sync, and Kin input refresh in one test

Next:
- keep `memoryInterpreter.ts` and `useGptMemory.ts` stable unless a correctness issue is found
- thin `app/page.tsx` by moving panel prop assembly and orchestration glue outward
- keep thinning `sendToGptFlowRequestPreparation.ts`, `sendToGptFlowState.ts`, and `sendToGptFlow.ts` so the remaining coordinator path stays easy to audit
- consider the next `sendToGptFlow` slice around request-text normalization or transcript request handling
- continue polishing the new GPT settings workspace and reduce duplication between it and the legacy settings drawer
- review `app/api/ingest/route.ts` and `hooks/useIngestActions.ts` as the next ingest-side integration point
- periodically audit topic write authority and remove any newly regrown hidden mutation paths instead of layering blockers over them

### 4. Test Readiness
Status: In progress

Priority targets:
- protocol parser
- protocol runtime
- task intent parser
- multipart chunking
- progress counting principle
- YouTube URL / transcript handling
- prompt / response helpers
- memory helpers

Done:
- `Vitest` foundation
- [`vitest.config.ts`](../vitest.config.ts)
- [`lib/app/panelPropsBuilders.test.ts`](../lib/app/panelPropsBuilders.test.ts)
- [`lib/server/chatgpt/requestNormalization.test.ts`](../lib/server/chatgpt/requestNormalization.test.ts)
- [`lib/server/chatgpt/searchRequest.test.ts`](../lib/server/chatgpt/searchRequest.test.ts)
- [`lib/server/chatgpt/searchExecution.test.ts`](../lib/server/chatgpt/searchExecution.test.ts)
- [`lib/server/chatgpt/promptBuilders.test.ts`](../lib/server/chatgpt/promptBuilders.test.ts)
- [`lib/server/chatgpt/openaiResponse.test.ts`](../lib/server/chatgpt/openaiResponse.test.ts)
- [`lib/app/kinMultipart.test.ts`](../lib/app/kinMultipart.test.ts)
- [`lib/taskIntent.test.ts`](../lib/taskIntent.test.ts)
- [`lib/taskProgress.test.ts`](../lib/taskProgress.test.ts)
- [`lib/taskProgressPolicy.test.ts`](../lib/taskProgressPolicy.test.ts)
- [`lib/server/youtubeTranscriptHelpers.test.ts`](../lib/server/youtubeTranscriptHelpers.test.ts)
- [`lib/taskProtocolParser.test.ts`](../lib/taskProtocolParser.test.ts)
- [`lib/taskProtocolRuntime.test.ts`](../lib/taskProtocolRuntime.test.ts)
- [`lib/taskProtocolIngest.test.ts`](../lib/taskProtocolIngest.test.ts)
- [`lib/taskProtocolState.test.ts`](../lib/taskProtocolState.test.ts)
- [`lib/taskProtocolMutations.test.ts`](../lib/taskProtocolMutations.test.ts)
- [`lib/taskProtocolTaskState.test.ts`](../lib/taskProtocolTaskState.test.ts)
- [`lib/taskCompiler.test.ts`](../lib/taskCompiler.test.ts)
- [`lib/memory.test.ts`](../lib/memory.test.ts)
- [`lib/app/gptMemoryStateHelpers.test.ts`](../lib/app/gptMemoryStateHelpers.test.ts)
- [`lib/app/gptMemorySummarizePolicy.test.ts`](../lib/app/gptMemorySummarizePolicy.test.ts)
- [`lib/app/gptMemoryPersistence.test.ts`](../lib/app/gptMemoryPersistence.test.ts)
- [`lib/app/gptMemoryFallback.test.ts`](../lib/app/gptMemoryFallback.test.ts)
- [`lib/app/gptMemoryApproval.test.ts`](../lib/app/gptMemoryApproval.test.ts)
- [`lib/app/memoryInterpreterText.test.ts`](../lib/app/memoryInterpreterText.test.ts)
- [`lib/app/memoryInterpreterFacts.test.ts`](../lib/app/memoryInterpreterFacts.test.ts)
- [`lib/app/memoryInterpreterWorks.test.ts`](../lib/app/memoryInterpreterWorks.test.ts)
- [`lib/app/memoryInterpreterContext.test.ts`](../lib/app/memoryInterpreterContext.test.ts)
- [`lib/app/memoryInterpreterFallbackHelpers.test.ts`](../lib/app/memoryInterpreterFallbackHelpers.test.ts)
- [`lib/app/gptMemoryStorage.test.ts`](../lib/app/gptMemoryStorage.test.ts)
- [`lib/app/gptMemoryCandidatePreparation.test.ts`](../lib/app/gptMemoryCandidatePreparation.test.ts)
- [`lib/app/gptMemoryUpdateCoordinator.test.ts`](../lib/app/gptMemoryUpdateCoordinator.test.ts)
- [`lib/app/gptMemorySummaryResolution.test.ts`](../lib/app/gptMemorySummaryResolution.test.ts)
- [`lib/app/gptMemoryReapply.test.ts`](../lib/app/gptMemoryReapply.test.ts)
- [`lib/app/gptMemoryRegistry.test.ts`](../lib/app/gptMemoryRegistry.test.ts)
- [`hooks/useMemoryRuleActions.test.ts`](../hooks/useMemoryRuleActions.test.ts)

Next:
- task budget tests
- more pure-helper extraction around `sendToGptFlowRequestPreparation` / `sendToGptFlowState` / `app/page.tsx` / ingest flow
- add narrow tests around task-intent approval sync and task-progress archive / clear behavior if those surfaces change again
- add docs for protocol actions and ingest pipeline before larger phase-2 work

## Next Review Points
At the start of each new refactor step, review these files first:

1. `app/api/chatgpt/route.ts`
2. `app/page.tsx`
3. `lib/app/sendToGptFlowRequestPreparation.ts` / `lib/app/sendToGptFlowState.ts` / `lib/app/sendToGptFlow.ts`

## Working Agreement
For each refactor step:

1. share the files to be touched before editing
2. keep the change small and phase-based
3. stop after each mini-phase
4. run typecheck and tests
5. update docs / roadmap as progress changes

## Success Condition
This roadmap is successful when future contributors can answer, at any time:

- what has already been stabilized
- what is currently being refactored
- what remains risky
- what should be done next

That visibility is part of the maintainability work itself.
