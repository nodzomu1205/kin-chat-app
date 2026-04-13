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
- [`lib/app/sendToGptFlow.ts`](../lib/app/sendToGptFlow.ts)

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
- [`lib/app/memoryInterpreter.ts`](../lib/app/memoryInterpreter.ts)
- [`lib/app/gptMemoryStateHelpers.ts`](../lib/app/gptMemoryStateHelpers.ts)

### Task

The task domain describes what Kin should do, with what limits, and how progress is tracked.

Important concepts:

- `TaskIntent`
- compiled task prompt
- `requirementProgress`
- `pendingRequests`
- `protocolLog`

Current main files:

- [`lib/taskIntent.ts`](../lib/taskIntent.ts)
- [`lib/taskCompiler.ts`](../lib/taskCompiler.ts)
- [`hooks/useKinTaskProtocol.ts`](../hooks/useKinTaskProtocol.ts)

### Protocol

The structured message layer between Kin and GPT.

Current protocol blocks:

- `SYS_TASK`
- `SYS_TASK_PROGRESS`
- `SYS_SEARCH_REQUEST / RESPONSE`
- `SYS_YOUTUBE_TRANSCRIPT_REQUEST / RESPONSE`
- `SYS_GPT_RESPONSE`
- `SYS_INFO`

Current main files:

- [`lib/taskRuntimeProtocol.ts`](../lib/taskRuntimeProtocol.ts)
- [`lib/app/kinProtocolDefaults.ts`](../lib/app/kinProtocolDefaults.ts)
- [`lib/app/kinMultipart.ts`](../lib/app/kinMultipart.ts)

### Search

The domain for GPT-side external retrieval.

Important concepts:

- search engine
- search mode
- raw result id
- summarized response
- source cards

Current main files:

- [`lib/app/sendToGptFlow.ts`](../lib/app/sendToGptFlow.ts)
- [`lib/app/sendToGptFlowHelpers.ts`](../lib/app/sendToGptFlowHelpers.ts)
- [`lib/search-domain/`](../lib/search-domain)

### Library

Stored search results, ingested documents, transcripts, and other reusable references.

Current main files:

- [`hooks/useReferenceLibrary.ts`](../hooks/useReferenceLibrary.ts)
- [`hooks/useStoredDocuments.ts`](../hooks/useStoredDocuments.ts)

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

- [`lib/app/fileIngestFlow.ts`](../lib/app/fileIngestFlow.ts)
- [`app/api/youtube-transcript/route.ts`](../app/api/youtube-transcript/route.ts)

## Current Source-Of-Truth Notes

The current most important source-of-truth locations are:

- memory interpretation:
  - [`lib/app/memoryInterpreter.ts`](../lib/app/memoryInterpreter.ts)
- memory persistence:
  - [`hooks/useGptMemory.ts`](../hooks/useGptMemory.ts)
- task progress counting:
  - [`hooks/useKinTaskProtocol.ts`](../hooks/useKinTaskProtocol.ts)
- multipart structured delivery:
  - [`lib/app/kinMultipart.ts`](../lib/app/kinMultipart.ts)

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
