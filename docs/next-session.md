# Next Session Handover

Updated: 2026-04-16

## Current State

The repository is in a good stopping state.

- `npx tsc --noEmit` passes
- `npm test` passes
- current test count: `67 files / 288 tests`

The most important result of this wave is that the chat-side topic decision flow is now behaving correctly in live review, and the task-intent approval flow reached the intended behavior too.

Topic-side highlights:

- topic proposal / approval / hold behavior
- duplicate approval suppression
- approved topic reflection into memory and the top chat chip
- task-title auto naming quality improvements
- English leakage reduction in memory/topic presentation

Task-side highlights:

- natural-language task input now creates an initial `SYS_TASK` draft without prematurely baking in count / limit phrases
- count / limit phrases rise into the approval flow instead
- approving a task-intent candidate immediately recompiles the Kin draft and refreshes the task-progress action items
- the task-progress view now has a direct clear button so a user can archive a drafted task if they choose not to proceed

## What Changed In This Wave

### 1. Topic flow was re-architected, not patched

The memory/topic work moved away from ad-hoc local fixes and toward clearer adjudication boundaries.

Done:

- topic adjudication now centers on explicit `keep / switch / unclear`
- `closingReplyOverride`, generic fallback patch merge, and old runtime `topic_alias / closing_reply` branches were removed from active runtime flow
- `committedTopic` precedence and approval/reapply behavior were fixed
- `unclear` now stays as preserve + proposal, instead of silently committing
- duplicate pending topic reviews were reduced through shared queue handling
- top-chip rendering was simplified to follow actual memory state

Important:

- the working rule is now: after the initial topic, any new topic candidate should stay pending unless a strong approved shortcut applies
- strong shortcut means approved pattern memory match, not raw LLM confidence

### 2. Memory interpreter and memory update flow were structurally thinned

Done:

- `memoryInterpreter.ts` is now much closer to a facade/orchestrator
- topic extraction, utterance classification, fallback orchestration, topic reduction, context reduction, state assembly, fact extraction, list extraction, and context phrasing are now split into separate modules
- `useGptMemory` now delegates update/reapply/store work through coordinators rather than holding most of the orchestration inline
- `app/page.tsx` and `useChatPageController` were thinned through shared builders/helpers

Important:

- file splitting only helped once write authority started to move toward fewer places
- future work should continue to reduce write paths, not just split files cosmetically

### 3. Task title auto-generation was rebuilt cleanly

Done:

- `lib/app/contextNaming.ts` was replaced with a clean implementation
- task titles now prefer:
  - cleaned summary lines
  - structured noun phrases such as `〜の関係`
  - quoted work names when they are the most concrete signal
- boilerplate-first-sentence truncation behavior was reduced
- clean tests now cover the title extraction rules

### 4. Task intent / protocol flow was rebuilt around approvals

Done:

- task intent now follows the same structural direction as topic handling:
  - LLM-primary extraction for unapproved meaning
  - approved shortcut matching only after explicit approval history exists
  - immediate UI/runtime reflection after approval
- protocol prompt and rulebook wording were compressed and clarified without weakening the `<<END_SYS_...>>` closing rule
- task compiler examples now make matching closing blocks easier to scan
- task-progress view now supports direct archive / clear from the user side

Important:

- do not let task intent drift back toward regex-first meaning extraction
- approved shortcuts are acceptable
- unapproved meaning extraction should remain LLM-primary

### 5. UI / copy cleanup

Done:

- memory drawer wording was partially normalized back to Japanese
- follow-up rule / memory copy corruption was cleaned
- unnecessary memory drawer clutter such as always-visible proposed-topic display was removed

## Working Rules For The Next Session

These are not optional style notes. They are operational constraints.

1. Prefer structural fixes over hole-patching.
2. Do not treat “it seems fixed” as done.
3. Before claiming a route is removed, verify it repo-wide.
4. When refactoring, compare imports/exports against responsibility and remove unnecessary wiring immediately.
5. Do not leave temporary compatibility branches in place unless the reason is explicit and documented.
6. After a structural migration lands, physically remove dead helper bodies instead of leaving them beside the active path.

In practical terms:

- do not add one-off blockers for individual topic phrases unless the architecture truly leaves no better option
- do not declare “old logic removed” until search confirms all active runtime paths are gone or intentionally isolated
- do not let hidden state mutation paths regrow in helper modules
- do not stop at "the active path is clean" if compatibility-era dead code still makes the file hard to audit

## Mandatory Verification Discipline

Before saying a fix is complete:

1. identify all files that can write or reshape the relevant state
2. verify remaining routes repo-wide with `rg`
3. confirm which paths are active runtime vs backward-compatibility only
4. run:
   - `npx tsc --noEmit`
   - `npm test`
5. explicitly state what was verified and what was not

This is especially important for:

- `currentTopic`
- `proposedTopic`
- pending memory-rule candidates
- approved shortcut routes
- task-title naming flows
- task-intent approval reflection into Kin draft / task-progress runtime

## Maintenance Work To Do Before The Next Feature Wave

Before starting the next substantial feature, perform a maintenance-first pass around these areas:

1. audit remaining topic write routes
   - verify `topicAdjudication` is the real single path in active runtime
   - continue collapsing any leftover shape-conversion indirection
2. review backward-compatibility-only layers
   - especially `memoryInterpreterRules` compatibility handling
   - confirm old saved data paths are isolated and not influencing live runtime branching
3. review UI copy and language consistency
   - remove remaining English labels where Japanese is intended
   - ensure memory drawer text is consistent
4. review task naming downstream usage
   - confirm all task-entry/update/import flows rely on the new naming pipeline consistently
5. keep `app/page.tsx` and `sendToGptFlow*` under periodic wiring review
   - not only for file size
   - also for hidden state mutation paths and unnecessary parameter spread
6. remove compatibility-era dead code in migrated modules
   - especially `lib/taskIntent.ts`
   - and `lib/app/sendToGptFlowHelpers.ts`
7. review GPT settings duplication
   - keep reducing overlap between the new settings workspace and the old drawer-oriented settings surface

## Recommended Next Review Files

Review these first before changing behavior:

1. `lib/app/memoryTopicAdjudication.ts`
2. `lib/app/memoryInterpreterTopicReducer.ts`
3. `lib/app/memoryInterpreterTopicResolution.ts`
4. `lib/app/gptMemoryUpdateCoordinator.ts`
5. `hooks/useGptMemory.ts`
6. `lib/app/contextNaming.ts`
7. `lib/app/taskDraftActionFlows.ts`
8. `app/page.tsx`
9. `lib/taskIntent.ts`
10. `lib/app/sendToGptFlowHelpers.ts`

## Suggested Next-Session Order

1. run a live regression pass for topic / approval / task-title / task-intent approval behavior
2. remove compatibility-era dead code from the current active-path migrations before new feature work
3. perform the maintenance audit items above
4. only then begin the next product feature

## Verification Commands

```bash
npx tsc --noEmit
```

```bash
npm test
```
