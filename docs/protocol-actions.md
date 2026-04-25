# Protocol Actions

Updated: 2026-04-17

## Purpose
This document defines the current authority boundaries for protocol-related user actions.
It exists to prevent the same regressions from reappearing through small local fixes in the wrong layer.

The main rule is simple:

- action hooks coordinate
- runtime hooks mutate runtime
- refresh flows reinterpret current intent
- Kin transport helpers prepare/send SYS blocks

No single file should silently own all four.

## Primary Files

Main protocol action boundary:
- `hooks/useTaskProtocolActions.ts`

Main runtime boundary:
- `hooks/useKinTaskProtocol.ts`

Current-task refresh boundary:
- `lib/app/task-runtime/currentTaskIntentRefresh.ts`

Kin input / multipart boundary:
- `lib/app/task-support/kinTaskInjection.ts`
- `lib/app/task-runtime/kinTransferFlows.ts`
- `lib/app/task-runtime/kinTaskFlow.ts`

## Action Categories

### 1. Approval actions

Examples:
- approve intent candidate
- update approved phrase
- delete approved phrase

Owned by:
- `useTaskProtocolActions.ts`

Should do:
- update approved/rejected candidate collections
- choose the source instruction for re-interpretation
- call current-task refresh orchestration

Should not do:
- parse task intent inline
- rebuild compiled SYS prompts inline
- build Kin multipart blocks inline

## 2. Runtime mutations

Examples:
- start task
- replace current task intent
- answer pending request
- update requirement progress
- archive task

Owned by:
- `useKinTaskProtocol.ts`

Should do:
- mutate current runtime state
- update runtime snapshots
- expose protocol runtime helpers for UI/controller layers

Should not do:
- decide UI panel focus
- classify user text
- assemble page draft fields

## 3. Current-task refresh

Examples:
- re-interpret current task after approval
- re-sync draft after intent replacement
- refresh Kin input after recompilation

Owned by:
- `currentTaskIntentRefresh.ts`

Current flow:
1. resolve source instruction
2. send source instruction to `resolveTaskIntentWithFallback(...)`
3. apply task-usage accounting
4. call `replaceCurrentTaskIntent(...)`
5. sync page draft from protocol
6. project compiled prompt into Kin input / pending blocks

Should not do:
- mutate approved phrase collections
- own task runtime snapshot policy
- send messages directly to Kin

## 4. Kin send / injection

Examples:
- set compiled task prompt to Kin input
- split multipart SYS blocks
- send latest/current content to Kin

Owned by:
- `kinTaskInjection.ts`
- `kinTransferFlows.ts`
- `kinTaskFlow.ts`

Should do:
- transform compiled prompt into pending Kin blocks
- set first Kin input block
- handle Kin-side message preparation / transport

Should not do:
- reinterpret task meaning
- decide whether a phrase is approved
- choose original instruction fallback order

## Source Of Truth Rules

For task refresh and resend, the source instruction priority is:

1. `runtime.originalInstruction`
2. `currentTaskDraft.userInstruction`
3. `runtime.currentTaskIntent.goal`

That rule belongs to the task-runtime boundary and should be reused, not reimplemented ad hoc.

## LLM-First Rule

For task intent and topic intent, protocol actions must preserve the LLM-first boundary:

- do not pre-classify the full instruction at the entry layer
- do not reduce the instruction text before re-interpretation
- do not add phrase-specific shortcut rules at the action boundary
- only strong approved fragment matches may bypass LLM for that fragment

If approval changes the task meaning, the system should re-interpret from the preserved source instruction, not from a narrowed local patch.

## Anti-Patterns

Do not reintroduce these patterns:

- approval hook edits approved phrases and also hand-builds Kin SYS blocks
- refresh flow owns candidate list mutation
- runtime hook writes page draft fields directly
- transport helper decides what the task means
- source instruction fallback order is duplicated in multiple files

## Practical Editing Guide

When you need to change a protocol action:

1. If the change is about candidate approval/rejection, start in `useTaskProtocolActions.ts`.
2. If the change is about task runtime state shape, start in `useKinTaskProtocol.ts`.
3. If the change is about recompile/re-sync behavior, start in `currentTaskIntentRefresh.ts`.
4. If the change is about Kin input / multipart delivery, start in `task-support/kinTaskInjection.ts` or Kin transfer flows.

If a change seems to require editing all of them at once, stop and split the work by boundary.
