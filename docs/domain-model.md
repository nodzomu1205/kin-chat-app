# Domain Model

This document names the main concepts that already exist in the repository and should remain explicit as refactors continue.

## Core Actors

### User

The human operator of the workspace.

The user:

- chats with GPT
- works with Kin
- reviews protocol outputs
- approves or rejects suggested refinements
- manages task direction and ingest sources

### Kin

Kin is the main execution-side actor.

Kin is responsible for:

- task execution
- task progress reporting
- requesting GPT support through structured protocol blocks
- consuming structured information injected from GPT

### GPT

GPT is the backoffice-side actor.

GPT is responsible for:

- memory interpretation
- search execution
- transcript fetches
- library management
- protocol response formatting
- task compilation support

## Core Domains

### Conversation

The live user/GPT conversational layer.

Current main files:

- [`app/page.tsx`](../app/page.tsx)
- [`lib/app/send-to-gpt/sendToGptFlow.ts`](../lib/app/send-to-gpt/sendToGptFlow.ts)

### Memory

GPT-side working memory used to keep context stable across turns.

Current memory shape includes:

- `recentMessages`
- `facts`
- `preferences`
- `lists`
- `context`

Current main files:

- [`hooks/useGptMemory.ts`](../hooks/useGptMemory.ts)
- [`lib/app/memory-interpreter/memoryInterpreter.ts`](../lib/app/memory-interpreter/memoryInterpreter.ts)
- [`lib/app/gpt-memory/gptMemoryStateHelpers.ts`](../lib/app/gpt-memory/gptMemoryStateHelpers.ts)

### Task

The task domain describes what Kin should do, with what limits, and how progress is tracked.

Important concepts:

- `TaskIntent`
- compiled task prompt
- `requirementProgress`
- `pendingRequests`
- `protocolLog`

Current main files:

- [`lib/task/taskIntent.ts`](../lib/task/taskIntent.ts)
- [`lib/task/taskCompiler.ts`](../lib/task/taskCompiler.ts)
- [`hooks/useKinTaskProtocol.ts`](../hooks/useKinTaskProtocol.ts)

### Protocol

The structured message layer between Kin and GPT.

Current protocol blocks:

- `SYS_TASK`
- `SYS_TASK_PROGRESS`
- `SYS_SEARCH_REQUEST / RESPONSE`
- `SYS_YOUTUBE_TRANSCRIPT_REQUEST / RESPONSE`
- `SYS_LIBRARY_DATA_REQUEST / RESPONSE`
- `SYS_DRAFT_PREPARATION_REQUEST / RESPONSE`
- `SYS_DRAFT_MODIFICATION_REQUEST / RESPONSE`
- `SYS_FILE_SAVING_REQUEST / RESPONSE`
- `SYS_GPT_RESPONSE`
- `SYS_INFO`

Current document protocol concepts:

- Draft Preparation
  - Kin asks GPT to create a draft artifact and GPT returns it with a
    `DOCUMENT_ID`
- Draft Modification
  - Kin asks GPT to revise a draft by id
  - `DOCUMENT_ID: Unknown` resolves to the latest full draft
  - blank `DOCUMENT_ID` in a full modification response is treated as the
    previous full draft id by the shared resolver
- File Saving
  - Kin asks GPT to save a draft into the library
  - the local gate validates active length constraints before saving
  - saved library cards use generated summaries through the shared summary path

Retired protocol inputs:

- `SYS_LIBRARY_INDEX_*`
- `SYS_LIBRARY_ITEM_*`
- `SYS_FILE_SAVE_*`

These are intentionally no longer active parser inputs. Keep the retirement
covered by parser tests unless a real compatibility need appears.

Current main files:

- [`lib/task/taskRuntimeProtocol.ts`](../lib/task/taskRuntimeProtocol.ts)
- [`lib/app/kin-protocol/kinProtocolDefaults.ts`](../lib/app/kin-protocol/kinProtocolDefaults.ts)
- [`lib/app/kin-protocol/kinMultipart.ts`](../lib/app/kin-protocol/kinMultipart.ts)
- [`lib/app/send-to-gpt/draftDocumentResolver.ts`](../lib/app/send-to-gpt/draftDocumentResolver.ts)
- [`lib/app/send-to-gpt/sendToGptPreparedGateHandlers.ts`](../lib/app/send-to-gpt/sendToGptPreparedGateHandlers.ts)

### Search

The domain for GPT-side external retrieval.

Important concepts:

- search engine
- search mode
- raw result id
- summarized response
- source cards

Current main files:

- [`lib/app/send-to-gpt/sendToGptFlow.ts`](../lib/app/send-to-gpt/sendToGptFlow.ts)
- [`lib/app/send-to-gpt/sendToGptFlowRequestPreparation.ts`](../lib/app/send-to-gpt/sendToGptFlowRequestPreparation.ts)
- [`lib/app/send-to-gpt/sendToGptFlowRequestPayload.ts`](../lib/app/send-to-gpt/sendToGptFlowRequestPayload.ts)
- [`lib/app/send-to-gpt/sendToGptFlowRequestText.ts`](../lib/app/send-to-gpt/sendToGptFlowRequestText.ts)
- [`lib/app/send-to-gpt/sendToGptFlowState.ts`](../lib/app/send-to-gpt/sendToGptFlowState.ts)
- [`lib/search-domain/`](../lib/search-domain)

### Library

Stored search results, ingested documents, transcripts, and other reusable references.

Current main files:

- [`hooks/useReferenceLibrary.ts`](../hooks/useReferenceLibrary.ts)
- [`hooks/useStoredDocuments.ts`](../hooks/useStoredDocuments.ts)

Current library workflow notes:

- bulk display and Kin send live in the collapsible library operation area
- aggregation modes are `Index`, `Summary`, and `Summary + Detail`
- library-card and bulk-library Kin sends should continue using the shared
  multipart/SYS_INFO transport owner
- task-time library requests should continue using
  `SYS_LIBRARY_DATA_REQUEST / RESPONSE`

### Ingest

The domain for taking external content and turning it into reusable workspace material.

Current sources:

- file ingest
- YouTube transcript

Planned future sources:

- zip archive
- local folder
- Google Drive folder

Current main files:

- [`lib/app/ingest/fileIngestFlow.ts`](../lib/app/ingest/fileIngestFlow.ts)
- [`app/api/youtube-transcript/route.ts`](../app/api/youtube-transcript/route.ts)

## Current Source-Of-Truth Notes

The current most important source-of-truth locations are:

- memory interpretation:
  - [`lib/app/memory-interpreter/memoryInterpreter.ts`](../lib/app/memory-interpreter/memoryInterpreter.ts)
- memory persistence:
  - [`hooks/useGptMemory.ts`](../hooks/useGptMemory.ts)
- task progress counting:
  - [`hooks/useKinTaskProtocol.ts`](../hooks/useKinTaskProtocol.ts)
- multipart structured delivery:
  - [`lib/app/kin-protocol/kinMultipart.ts`](../lib/app/kin-protocol/kinMultipart.ts)

## Progress Counting Principle

The repository now follows this rule:

### Count on success / completion

For external execution and retrieval style requirements:

- `ask_gpt`
- `search_request`
- `youtube_transcript_request`
- `library_reference`
- `finalize`

### Count on request issuance

For human-facing requests:

- `ask_user`
- `request_material`

Why:

- external retrieval can fail or be retried
- user/material asks represent a completed outward action at the moment they are issued

## Emerging Future Concepts

These are not yet fully modeled, but should remain explicit in future phases:

- `ProtocolAction`
- `ExecutionBudget`
- `IngestJob`
- `IngestItem`
- `Workspace`
- `SharedArtifact`
- `HandoffRecord`

## Current Refactor Interpretation

The maintainability work so far suggests this boundary direction:

1. UI should not own domain behavior
2. protocol parsing and runtime should stay testable and pure where possible
3. memory logic should keep moving from hook-internal logic toward pure helpers
4. new concepts should be documented before they spread through multiple files
