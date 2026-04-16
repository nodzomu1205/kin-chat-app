# Refactor Roadmap

Updated: 2026-04-16

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
- test status: `65 files / 274 tests`

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
2. `lib/app/sendToGptFlowHelpers.ts`
3. `lib/app/sendToGptFlow.ts`
4. `components/panels/gpt/GptSettingsSections.tsx`
5. `app/api/ingest/route.ts` / `hooks/useIngestActions.ts`

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

Next:
- `docs/protocol-actions.md`
- `docs/ingest-pipeline.md`
- `docs/workspace-model.md`

### 2. Page / UI Thinning
Status: Partially done

Done:
- `GptSettingsDrawer` split
- `ReceivedDocsDrawer` cleanup
- part of `app/page.tsx` orchestration extraction
- `panelPropsBuilders.ts` now absorbs pending-injection progress, task-draft field callbacks, and settings count clamping
- `useTaskDraftWorkspace.ts` now absorbs task-draft slot state and navigation from `app/page.tsx`
- `app/page.tsx` action / panel / effect / hook inputs now assemble through dedicated builder layers instead of one large inline wiring surface
- `useChatPageActions.ts` now acts more clearly as a thin coordinator and passes smaller arg slices to sub-hooks
- GPT settings now have a separate full-area workspace path with 3 icon entry points while the existing hanging drawers remain in place
- GPT chat scroll position is now preserved when switching into and back out of the settings workspace
- `useGptMemory.ts` reduced to a smaller orchestration hook
- `memoryInterpreter.ts` reduced through staged helper extraction
- rejected memory-rule candidates now trigger immediate memory reapplication so tentative wrong topics can be cleared

Next:
- introduce `useChatAppController`
- review whether the remaining `app/page.tsx` orchestration should stay as builders or move behind a higher-level controller hook
- review whether the pending-memory-rule candidate merge path should move out of `app/page.tsx`

### 2.5. Task Protocol Hook Thinning
Status: In progress

Primary file:
- [`hooks/useKinTaskProtocol.ts`](../hooks/useKinTaskProtocol.ts)

Done:
- protocol ingest extraction
- empty runtime / requirement merge extraction
- pending-answer / finalize mutation extraction
- task start / replace-current-intent state builder extraction
- test coverage for parser, runtime, ingest, state, mutations, and task-state helpers

Next:
- evaluate whether `addPendingRequest` should also move to a pure helper
- decide whether to continue thinning here or shift effort to `useGptMemory`

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
- [`lib/app/sendToGptFlowHelpers.ts`](../lib/app/sendToGptFlowHelpers.ts)
  - protocol assistant response wrapping helper
  - search response shaping helper
  - implicit search usage / context helper
  - protocol post-response side-effect helper
  - shared recent-message / previous-topic memory-update helpers
- [`lib/app/sendToGptProtocolBuilders.ts`](../lib/app/sendToGptProtocolBuilders.ts)
  - protocol request / response block builders extracted from `sendToGptFlowHelpers.ts`
- [`lib/app/sendToGptFlowTypes.ts`](../lib/app/sendToGptFlowTypes.ts)
  - shared flow / helper protocol and artifact types extracted for reuse across `sendToGptFlow.ts` and helpers
- [`lib/app/sendToGptFlowContext.ts`](../lib/app/sendToGptFlowContext.ts)
  - protocol event / search-context derivation extracted from `sendToGptFlowHelpers.ts`
- [`lib/app/sendToGptText.ts`](../lib/app/sendToGptText.ts)
  - UTF-8-safe request text and task-info text helpers extracted so the main `sendToGpt` path no longer depends on mojibake-prone literals
  - `sendToGptFlowHelpers.ts` currently keeps thin compatibility wrappers while remaining call sites are migrated
- [`lib/app/sendToGptFlow.ts`](../lib/app/sendToGptFlow.ts)
  - request / search / protocol / memory / UI args now grouped through shared flow-slice types
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
- [`lib/app/gptMemoryUpdatePreparation.ts`](../lib/app/gptMemoryUpdatePreparation.ts)
  - fallback evaluation, candidate filtering, and candidate-memory preparation extracted from `useGptMemory.ts`
- [`lib/app/gptMemoryUpdateFlow.ts`](../lib/app/gptMemoryUpdateFlow.ts)
  - summarize branch and summarized-state resolution extracted from `useGptMemory.ts`
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
- legacy local helper block removed from `route.ts`
- approved-candidate reapply now uses the same formal memory recomputation path as approved-rule reapply
- closing-reply detection now uses a single source of truth
- chat topic adjudication flow was structurally rebuilt and reached a stable live-reviewed state
- task title auto-generation was rebuilt around a clean naming pipeline

Next:
- keep `memoryInterpreter.ts` and `useGptMemory.ts` stable unless a correctness issue is found
- thin `app/page.tsx` by moving panel prop assembly and orchestration glue outward
- keep thinning `sendToGptFlowHelpers.ts` / `sendToGptFlow.ts` by moving protocol / search / transcript shaping logic out in small slices
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
- [`lib/app/gptMemoryUpdatePreparation.test.ts`](../lib/app/gptMemoryUpdatePreparation.test.ts)
- [`lib/app/gptMemoryUpdateFlow.test.ts`](../lib/app/gptMemoryUpdateFlow.test.ts)
- [`lib/app/gptMemoryReapply.test.ts`](../lib/app/gptMemoryReapply.test.ts)
- [`lib/app/gptMemoryRegistry.test.ts`](../lib/app/gptMemoryRegistry.test.ts)
- [`hooks/useMemoryRuleActions.test.ts`](../hooks/useMemoryRuleActions.test.ts)

Next:
- task budget tests
- more pure-helper extraction around `sendToGptFlowHelpers` / `app/page.tsx` / ingest flow
- add docs for protocol actions and ingest pipeline before larger phase-2 work

## Next Review Points
At the start of each new refactor step, review these files first:

1. `app/api/chatgpt/route.ts`
2. `app/page.tsx`
3. `lib/app/sendToGptFlowHelpers.ts` / `lib/app/sendToGptFlow.ts`

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
