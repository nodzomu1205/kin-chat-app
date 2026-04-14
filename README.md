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
- shared recent-message / memory-update helper extraction for `sendToGptFlow`
- GPT settings workspace split from the old hanging-drawer UI
- task drawer unification plus multi-draft / multi-progress task workflow support
- task suspend / hold support through `TASK_CONFIRM`
- transcript queue support for up to 3 YouTube URLs with Kin ACK gating
- roadmap and architecture docs

The current verification baseline is:

- `npx tsc --noEmit` passes
- `npm test` passes
- current test count: `41 files / 163 tests`

The current goal is not a rewrite. The goal is to keep shipping while shrinking hidden coupling and reducing future regressions.

## Docs

- [Architecture](./docs/architecture.md)
- [Domain Model](./docs/domain-model.md)
- [Refactor Roadmap](./docs/refactor-roadmap.md)
- [Next Session Handover](./docs/next-session.md)
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

1. `app/page.tsx` orchestration thinning
2. `lib/app/sendToGptFlowHelpers.ts` / `lib/app/sendToGptFlow.ts` flow-surface thinning
3. `components/panels/gpt/GptSettingsSections.tsx` settings information architecture redesign
4. `app/api/ingest/route.ts` / `hooks/useIngestActions.ts` ingest-flow cleanup
5. protocol / task / ingest test hardening around the next touched area

`hooks/useGptMemory.ts` and `lib/app/memoryInterpreter.ts` are now in a much safer stopping state than before. They should still be reviewed carefully when touched, but they no longer need to be the default first refactor target.

For the GPT settings surface, the next step is not just helper extraction. We expect a broader section-level reorganization so that search, memory, protocol, and ingest controls are easier to scan and maintain.
