# Next Session Handover

Updated: 2026-04-14

## Current State

The repository is in a good stopping state.

- `npx tsc --noEmit` passes
- `npm test` passes
- current test count: `41 files / 163 tests`

Recent work covered both maintainability and a substantial task-workflow expansion. The codebase is now in a stronger state around task orchestration, task progress handling, YouTube transcript delivery, settings UX separation, and protocol documentation.

## What Changed In This Wave

### Maintainability / structure

- `app/page.tsx` was thinned further through `panelPropsBuilders.ts`
  - pending injection progress moved out of the page
  - task draft field callbacks moved out of the page
  - settings count clamping moved out of the page
- `lib/app/sendToGptFlowHelpers.ts` now owns shared recent-message / previous-topic memory-update helpers
- `lib/app/sendToGptFlow.ts` was reduced in small slices
  - transcript helper extraction
  - protocol wrapping helper extraction
  - search response shaping helper extraction
  - implicit search helper extraction
  - protocol side-effect helper extraction
- task-draft collection helpers were added in `lib/app/taskDraftCollection.ts`
- task-runtime collection helpers were added in `lib/taskRuntimeCollection.ts`
- task progress mutation helpers were added in `lib/taskProtocolMutations.ts`

### GPT settings workspace

- GPT settings now have a dedicated full-area workspace view
- header settings entry was replaced with 3 small icon entry points
- chat and task icons glow when pending memory / SYS approvals exist
- memory approval UI and SYS rule approval UI were unified
- the old hanging drawers for memory / tokens / task draft / task progress / library remain in place as a compatibility bridge

### Task workflow expansion

- the old `タスク形成` / `タスク進捗` entry points were unified under a single `タスク` drawer entry
- task draft saving now writes snapshot documents into the library
- multiple task drafts can now be retained and switched with left/right navigation
- multiple task progress runtimes can now be retained and switched with left/right navigation
- `TASK_CONFIRM` with `STATUS: SUSPENDED` is now supported as an official hold state
- task progress UI now supports:
  - hold-state badge
  - suspend-message generation
  - manual progress-count editing
  - progress-count SYS block output
  - passing the generated SYS block into the Kin input
- when a task result artifact is stored in the library, the matching task progress snapshot is archived from the active progress panel

### Search / media / transcript work

- normal `検索:` requests once again attach visible sources in GPT responses
- YouTube sources in message cards now use muted autoplay preview-style embeds
- `SYS_YOUTUBE_TRANSCRIPT_REQUEST` now supports `URLS:` with up to 3 URLs
- queued transcript delivery is now gated by Kin ACK via:

```txt
<<SYS_KIN_RESPONSE>>
Received. Send the next part.
<<END_SYS_KIN_RESPONSE>>
```

### Protocol docs

- `lib/taskCompiler.ts` examples and rule lines now describe:
  - `URLS:` support for up to 3 YouTube URLs
  - required ACK behavior after each transcript part / queued delivery
- `lib/app/kinProtocolDefaults.ts` prompt and rulebook now describe the same behavior
- the default rulebook now also documents `TASK_CONFIRM` and `STATUS: SUSPENDED`

## Current Review Priorities

Review these first before starting new work:

1. `app/page.tsx`
2. `lib/app/sendToGptFlowHelpers.ts`
3. `lib/app/sendToGptFlow.ts`
4. `components/panels/gpt/GptSettingsWorkspace.tsx`
5. `components/panels/gpt/GptTaskDrawer.tsx`
6. `hooks/useKinTaskProtocol.ts`
7. `app/api/ingest/route.ts` / `hooks/useIngestActions.ts`

## Known Safe Stopping Point

These areas are currently in a good stopping state for this wave:

- `hooks/useGptMemory.ts`
- `lib/app/memoryInterpreter.ts`
- the new settings workspace entry flow
- multi-draft task storage
- multi-runtime task progress storage

Important:

- TypeScript passes
- tests pass
- transcript queueing depends on Kin returning the ACK block exactly
- old hanging drawers are intentionally still present
- task-runtime archival now depends on `task_result` metadata being carried into stored documents

## Recommended Next Maintainability Steps

Resume with planning and low-risk thinning work around:

1. `app/page.tsx`
2. `lib/app/sendToGptFlowHelpers.ts`
3. `lib/app/sendToGptFlow.ts`

Recommended goal for the next maintainability pass:

- keep behavior unchanged while reducing panel-prop wiring and GPT flow branching
- push task-workflow collection logic toward pure helpers where possible
- keep `useGptMemory.ts` as an orchestration boundary unless a new bug justifies touching it
- reduce duplication between settings workspace sections and remaining legacy drawer sections

If that proves too coupled, move to the next planned area instead:

- `components/panels/gpt/GptSettingsSections.tsx`
- `app/api/ingest/route.ts` / `hooks/useIngestActions.ts`

## Product / feature Follow-Ups

These are the main unfinished workflow items carried into the next session:

1. verify the new multi-task progress flow with a live Kin session
2. verify transcript queue delivery across 2-3 URLs with real Kin ACKs
3. consider task-progress UI for active Kin participants before multi-Kin coordination work
4. decide whether old hanging settings drawers should start shrinking or remain as bridge UI
5. continue maintainability cleanup before the next large feature wave

## Working Rule For The Next Session

When resuming:

1. inspect `app/page.tsx`, `sendToGptFlowHelpers.ts`, and `sendToGptFlow.ts` together before editing
2. choose the smallest behavior-preserving extraction around orchestration or flow shaping
3. run `npx tsc --noEmit`
4. run `npm test`
5. update `README.md`, `docs/refactor-roadmap.md`, and `docs/next-session.md`

This keeps the repo in the current low-risk, high-visibility mode.
