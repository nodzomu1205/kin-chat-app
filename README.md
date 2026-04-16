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
- chat-page action / panel / effect / hook arg builders extracted from `app/page.tsx`
- task-draft workspace extraction from `app/page.tsx`
- `useChatPageController` now composes smaller domain controller hooks while shared page-action contracts live in `chatPageActionTypes.ts`
- `useChatPageControllerArgs`, `useChatPageKinPanelProps`, and `useChatPageGptPanelArgs` now own most controller/panel argument assembly that used to sit inline in `app/page.tsx`
- `useChatPagePanelsComposition.tsx` now owns the final page-side controller + panel composition, so `app/page.tsx` no longer instantiates the controller hook or panel builder/render chain directly
- `useChatPagePanelsView.tsx` now owns shared panel-app wiring and task-snapshot glue, so `app/page.tsx` no longer duplicates that setup across both panel branches
- `useChatPageWorkspaceView.tsx` now owns the page-facing source wiring for controller + panel composition, so `app/page.tsx` passes source-of-truth domain groups instead of duplicating nested controller and panel trees
- `chatPageWorkspaceViewBuilders.ts` now keeps that workspace-view wiring split into controller-source and panel-source builders, so the new page adapter does not become another monolithic hotspot
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
- `npm test` passes
- current test count: `67 files / 288 tests`

Recent regression fixes include:

- rejected memory-rule candidates now trigger memory reapplication, so an incorrect tentative topic can be cleared immediately after rejection
- GPT chat scroll position now stays stable when moving into and back out of the settings workspace on both desktop and mobile
- chat topic adjudication / approval flow has been structurally rebuilt and is now stable in live review
- task title auto-generation now uses a clean naming pipeline instead of truncating the first summary sentence
- task intent approval is now behaving as intended in live review:
  - natural-language task input creates an initial `SYS_TASK` draft
  - count / limit phrases stay out of the first draft and appear in the approval flow instead
  - approving a task-intent candidate immediately updates the Kin draft and the task-progress action items
  - task progress entries can now be cleared directly from the task-progress view if the user decides not to proceed

The current goal is not a rewrite. The goal is to keep shipping while shrinking hidden coupling and reducing future regressions.

## Docs

- [Architecture](./docs/architecture.md)
- [Domain Model](./docs/domain-model.md)
- [Refactor Roadmap](./docs/refactor-roadmap.md)
- [Next Session Handover](./docs/next-session.md)
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

1. remove dead helper branches that are still physically present after the recent refactors
   - especially `lib/taskIntent.ts`
   - and the remaining broad helper surfaces inside `lib/app/sendToGptFlowRequestPreparation.ts` and `lib/app/sendToGptFlowState.ts`
2. residual `app/page.tsx` orchestration review and cleanup of any regrown glue
   - especially the broad `useChatPageWorkspaceView(...)` source bundle and page-level candidate merge / controller-style coordination that still sits above narrower domain modules
3. `lib/app/sendToGptFlowRequestPreparation.ts` / `lib/app/sendToGptFlowState.ts` / `lib/app/sendToGptFlow.ts` flow-surface thinning
   - keep `sendToGptFlowContext.ts`, `sendToGptProtocolBuilders.ts`, and `sendToGptFlowTypes.ts` aligned with that thinning so the GPT flow keeps a clean domain boundary
4. `components/panels/gpt/GptSettingsSections.tsx` settings information architecture redesign
   - reduce duplication between the new settings workspace and the legacy drawer-oriented settings surface
5. `app/api/ingest/route.ts` / `hooks/useIngestActions.ts` ingest-flow cleanup
6. protocol / task / ingest test hardening around the next touched area

`hooks/useGptMemory.ts` and `lib/app/memoryInterpreter.ts` are now in a much safer stopping state than before. They should still be reviewed carefully when touched, but they no longer need to be the default first refactor target.

For the GPT settings surface, the next step is not just helper extraction. We expect a broader section-level reorganization so that search, memory, protocol, and ingest controls are easier to scan and maintain.
