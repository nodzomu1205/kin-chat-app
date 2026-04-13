# Next Session Handover

Updated: 2026-04-13

## Current State

The repository is in a good stopping state.

- `npx tsc --noEmit` passes
- `npm test` passes
- current test count: `35 files / 144 tests`

Recent work has focused on maintainability, not feature expansion. The codebase now has much better coverage around protocol parsing, task runtime, multipart delivery, task intent, task compiler, YouTube transcript helpers, memory helpers, and the `chatgpt/route` service layer.

The small `sendToGptFlow.ts` inline URL dead-code cleanup has also been completed.
The `memoryInterpreter.ts` split steps are now in place through:

- `memoryInterpreterText.ts`
- `memoryInterpreterFacts.ts`
- `memoryInterpreterWorks.ts`
- `memoryInterpreterContext.ts`
- `memoryInterpreterFallbackHelpers.ts`

The `useGptMemory.ts` thinning steps are now also in place through:

- `gptMemoryStorage.ts`
- `gptMemoryUpdatePreparation.ts`
- `gptMemoryUpdateFlow.ts`
- `gptMemoryReapply.ts`
- `gptMemoryRegistry.ts`

## What Was Stabilized Recently

- `app/api/chatgpt/route.ts` was thinned by moving logic into `lib/server/chatgpt/`
- `hooks/useKinTaskProtocol.ts` was thinned through pure helper extraction
- `hooks/useGptMemory.ts` was thinned into a smaller orchestration hook
- approved-candidate reapply now uses the same formal recomputation path as approved-rule reapply
- closing reply detection was unified around `memoryInterpreterText.ts`
- `lib/app/memoryInterpreterText.ts` now holds shared text normalization / topic candidate helpers
- `lib/app/memoryInterpreterFacts.ts` now holds fact / preference / tracked-entity helpers
- `lib/app/memoryInterpreterWorks.ts` now holds active-document resolution and works merge helpers
- `lib/app/memoryInterpreterContext.ts` now holds context / goal / follow-up-rule helpers
- `lib/app/memoryInterpreterFallbackHelpers.ts` now holds approved-rule matching and fallback prompt / JSON helpers
- `lib/app/sendToGptFlow.ts` was reduced in small slices
  - transcript helper extraction
  - protocol wrapping helper extraction
  - search response shaping helper extraction
  - implicit search helper extraction
  - protocol side-effect helper extraction
  - inline URL shortcut now runs through `runInlineUrlShortcut(...)` on the live path

## Current Review Priorities

Review these first before starting new work:

1. `app/page.tsx`
2. `lib/app/sendToGptFlowHelpers.ts`
3. `lib/app/sendToGptFlow.ts`
4. `components/panels/gpt/GptSettingsSections.tsx`
5. `app/api/ingest/route.ts` / `hooks/useIngestActions.ts`

## Known Safe Stopping Point

`hooks/useGptMemory.ts` and `lib/app/memoryInterpreter.ts` are now in a good stopping state for this refactor wave.

Important:

- the memory recomputation path is now shared for approved rules and approved candidates
- closing reply detection no longer diverges between interpreter and state-helper paths
- the live inline URL path still goes through `runInlineUrlShortcut(...)`
- TypeScript should still pass
- tests should still pass
- the next focus should move to the remaining large orchestration and flow surfaces

## Recommended Next Step

Resume with planning and low-risk thinning work around:

- `app/page.tsx`
- `lib/app/sendToGptFlowHelpers.ts`
- `lib/app/sendToGptFlow.ts`

Goal:

- keep behavior unchanged while reducing panel-prop wiring and GPT flow branching
- prefer pure helper extraction or prop-builder extraction first
- keep `useGptMemory.ts` as an orchestration boundary unless a new bug justifies touching it

Important note for the GPT settings area:

- `GptSettingsSections.tsx` is expected to need a structural reorganization, not just file splitting
- the next pass should revisit section grouping and information architecture for search / memory / protocol / ingest settings
- document the intended section model before doing a larger UI rearrangement

If that proves too coupled, move to the next planned area instead:

- `components/panels/gpt/GptSettingsSections.tsx`
- `app/api/ingest/route.ts` / `hooks/useIngestActions.ts`

## Working Rule For The Next Session

When resuming:

1. inspect `app/page.tsx`, `sendToGptFlowHelpers.ts`, and `sendToGptFlow.ts` together before editing
2. choose the smallest behavior-preserving extraction around orchestration or flow shaping
3. run `npx tsc --noEmit`
4. run `npm test`
5. update `README.md`, `docs/refactor-roadmap.md`, and `docs/next-session.md`

This keeps the repo in the current low-risk, high-visibility mode.
