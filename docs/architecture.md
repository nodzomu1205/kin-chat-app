# Architecture

## Overview

`kin-chat-app` is a workspace application built around two primary actors:

- Kin: the execution-side conversational agent
- GPT: the backoffice-side support layer for memory, search, protocol handling, library, and transcript fetches

This is not just a single chat screen. The app now contains several cooperating domains:

- conversation
- memory
- task orchestration
- protocol bridge
- search
- library
- ingest

## Current Main Integration Points

### UI / orchestration

Primary files:

- [`app/page.tsx`](../app/page.tsx)
- [`components/panels/gpt/GptSettingsSections.tsx`](../components/panels/gpt/GptSettingsSections.tsx)
- [`components/panels/gpt/ReceivedDocsDrawer.tsx`](../components/panels/gpt/ReceivedDocsDrawer.tsx)

Current role:

- top-level state wiring
- panel coordination
- layout composition
- final prop assembly through builder layers

Current risk:

- `app/page.tsx` still acts as a broad orchestration point
- panel prop wiring is thinner than before, but still broad
- action / panel / effect / hook arg assembly now lives behind dedicated builders, but the page still owns too many boundaries
- memory-rule candidate merging is still page-level glue instead of a narrower controller boundary
- task-progress clear / archive behavior is now correctly routed through `useKinTaskProtocol`, but the surrounding page/controller boundary is still broader than ideal

### App flows

Primary files:

- [`lib/app/sendToGptFlow.ts`](../lib/app/sendToGptFlow.ts)
- [`lib/app/fileIngestFlow.ts`](../lib/app/fileIngestFlow.ts)
- [`lib/app/taskDraftActionFlows.ts`](../lib/app/taskDraftActionFlows.ts)
- [`lib/app/kinMultipart.ts`](../lib/app/kinMultipart.ts)

Current role:

- user-to-GPT conversation flow
- protocol request / response handling
- ingest routing
- task draft actions
- multipart delivery

Current risk:

- `sendToGptFlow.ts` is thinner now, but still remains the main execution coordinator
- `sendToGptFlowHelpers.ts` is narrower after `sendToGptFlowContext.ts`, `sendToGptProtocolBuilders.ts`, and `sendToGptFlowTypes.ts` were split out, but it still owns several response-shaping responsibilities
- `sendToGptFlowHelpers.ts` still contains temporary compatibility wrappers and dead legacy helper bodies that should be physically removed once downstream call sites are fully migrated

### Memory

Primary files:

- [`hooks/useGptMemory.ts`](../hooks/useGptMemory.ts)
- [`lib/app/memoryInterpreter.ts`](../lib/app/memoryInterpreter.ts)
- [`lib/app/gptMemoryStateHelpers.ts`](../lib/app/gptMemoryStateHelpers.ts)
- [`lib/app/gptMemoryCore.ts`](../lib/app/gptMemoryCore.ts)
- [`lib/app/gptMemoryPersistence.ts`](../lib/app/gptMemoryPersistence.ts)
- [`lib/app/gptMemoryFallback.ts`](../lib/app/gptMemoryFallback.ts)
- [`lib/app/gptMemoryApproval.ts`](../lib/app/gptMemoryApproval.ts)
- [`lib/app/gptMemorySummarizePolicy.ts`](../lib/app/gptMemorySummarizePolicy.ts)

Current role:

- recent / facts / preferences / collections / context management
- deterministic interpretation
- LLM fallback
- approval-based refinement
- persistence normalization
- summarize threshold policy

Current risk:

- `memoryInterpreter.ts` remains central, but is now much smaller and clearer
- `useGptMemory.ts` is now primarily an orchestration hook and is in a reasonable stopping state

### Task / protocol runtime

Primary files:

- [`hooks/useKinTaskProtocol.ts`](../hooks/useKinTaskProtocol.ts)
- [`lib/taskIntent.ts`](../lib/taskIntent.ts)
- [`lib/taskCompiler.ts`](../lib/taskCompiler.ts)
- [`lib/taskRuntimeProtocol.ts`](../lib/taskRuntimeProtocol.ts)
- [`lib/taskProtocolParser.ts`](../lib/taskProtocolParser.ts)
- [`lib/taskProtocolRuntime.ts`](../lib/taskProtocolRuntime.ts)
- [`lib/taskProtocolIngest.ts`](../lib/taskProtocolIngest.ts)
- [`lib/taskProtocolState.ts`](../lib/taskProtocolState.ts)
- [`lib/taskProtocolMutations.ts`](../lib/taskProtocolMutations.ts)
- [`lib/taskProtocolTaskState.ts`](../lib/taskProtocolTaskState.ts)

Current role:

- task intent parsing
- compiled task prompt generation
- runtime progress tracking
- protocol event parsing and application
- task runtime state transitions
- approval-driven task-intent refinement and immediate Kin-draft / progress-view synchronization

Current risk:

- execution budget is implemented, but not yet modeled as a first-class domain object
- `taskIntent.ts` active runtime is now LLM-primary plus approved-shortcut matching, but the file still contains compatibility-era dead helpers that should be removed so the runtime shape is easier to audit

### Server routes

Primary files:

- [`app/api/chatgpt/route.ts`](../app/api/chatgpt/route.ts)
- [`app/api/youtube-transcript/route.ts`](../app/api/youtube-transcript/route.ts)
- [`app/api/kindroid/route.ts`](../app/api/kindroid/route.ts)

Supporting extracted services:

- [`lib/server/chatgpt/requestNormalization.ts`](../lib/server/chatgpt/requestNormalization.ts)
- [`lib/server/chatgpt/promptBuilders.ts`](../lib/server/chatgpt/promptBuilders.ts)
- [`lib/server/chatgpt/openaiClient.ts`](../lib/server/chatgpt/openaiClient.ts)
- [`lib/server/chatgpt/openaiResponse.ts`](../lib/server/chatgpt/openaiResponse.ts)
- [`lib/server/chatgpt/searchRequest.ts`](../lib/server/chatgpt/searchRequest.ts)
- [`lib/server/chatgpt/searchExecution.ts`](../lib/server/chatgpt/searchExecution.ts)
- [`lib/server/chatgpt/responseBuilders.ts`](../lib/server/chatgpt/responseBuilders.ts)
- [`lib/server/youtubeTranscriptHelpers.ts`](../lib/server/youtubeTranscriptHelpers.ts)

Current role:

- thin request entrypoints
- OpenAI / search / transcript execution boundaries

Current progress:

- `app/api/chatgpt/route.ts` is already much thinner than before
- local dead helper blocks were removed
- key route logic has been extracted into service modules

## Current Source Of Truth

Important current source-of-truth locations:

- memory interpretation:
  - [`lib/app/memoryInterpreter.ts`](../lib/app/memoryInterpreter.ts)
- memory state shaping and persistence:
  - [`hooks/useGptMemory.ts`](../hooks/useGptMemory.ts)
- task progress and protocol runtime:
  - [`hooks/useKinTaskProtocol.ts`](../hooks/useKinTaskProtocol.ts)
- multipart protocol delivery:
  - [`lib/app/kinMultipart.ts`](../lib/app/kinMultipart.ts)

## Maintainability Strategy

We are intentionally using staged refactors instead of a full rewrite.

The current refactor order is:

1. docs and shared visibility
2. route/service extraction
3. controller thinning
4. protocol / task / memory test hardening
5. future ingest pipeline groundwork

## Current Cleanup Priority

Based on the current repository state, the best remaining cleanup order is:

1. [`lib/taskIntent.ts`](../lib/taskIntent.ts)
   - remove compatibility-era dead helpers and keep the active LLM-primary extraction path easy to verify
2. [`lib/app/sendToGptFlowHelpers.ts`](../lib/app/sendToGptFlowHelpers.ts)
   - remove temporary compatibility wrappers and dead legacy bodies after the `sendToGptText.ts` migration
3. [`app/page.tsx`](../app/page.tsx)
   - much thinner than before, but still the broadest remaining UI orchestration point
4. [`lib/app/sendToGptFlow.ts`](../lib/app/sendToGptFlow.ts)
   - still a large execution path even after context / builder / type extraction
5. [`components/panels/gpt/GptSettingsSections.tsx`](../components/panels/gpt/GptSettingsSections.tsx)
   - large UI composition file with many field variants
   - likely needs section-level information architecture redesign, not only component splitting
6. [`app/api/ingest/route.ts`](../app/api/ingest/route.ts) / [`hooks/useIngestActions.ts`](../hooks/useIngestActions.ts)
   - likely next ingest-side integration point once page / GPT flow cleanup settles

## Current Working Rule

For every new maintainability step:

1. touch a small, pre-declared file set
2. prefer pure helper extraction first
3. run typecheck and tests
4. update docs immediately after the change
