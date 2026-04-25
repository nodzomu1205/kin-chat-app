# Memory Lifecycle

Updated: 2026-04-19

## Purpose

This document explains what the GPT memory system is allowed to keep, what is
expected to be cleared, and which fields exist only because something is
currently displayed in the chat/task workflow.

The goal is to stop future changes from treating all memory fields as one flat
bag.

## Scope Model

The current memory model should be read in three layers.

### 1. Stable Memory

This is allowed to survive ordinary task resets.

Examples:

- `facts`
- `preferences`
- `lists.recentSearchQueries`
- `context.proposedTopic`

These fields represent broader user/topic continuity rather than one active
task/document session.

### 2. Task-Scoped Memory

This is cleared when the active task runtime is intentionally reset.

Examples:

- `context.currentTopic`
- `context.currentTask`
- `context.followUpRule`
- `context.lastUserIntent`
- `lists.activeDocument`
- `lists.worksByEntity`
- `lists.trackedEntities`

These fields describe the currently active working context rather than durable
user memory.

The current code-level authority is:

- `lib/memory.ts`
- `lib/app/gpt-memory/gptMemoryStorage.ts`
- `hooks/useGptMemory.ts`

### 3. Displayed-Context Memory

This is a narrower subset of task-scoped memory.

It exists because some meaningful artifact was actively surfaced to the user and
the interpreter should be allowed to use that displayed context on the next
turn.

Current example:

- `lists.activeDocument`

This should not be treated as durable knowledge. It is a "what is currently in
view / in focus" bridge.

## Current Clearing Rules

`clearTaskScopedMemory(...)` intentionally clears:

- `context.currentTopic`
- `context.currentTask`
- `context.followUpRule`
- `context.lastUserIntent`
- `lists.activeDocument`
- `lists.worksByEntity`
- `lists.trackedEntities`

It intentionally preserves:

- `facts`
- `preferences`
- `lists.recentSearchQueries`
- `context.proposedTopic`

## Working Rules

When adding new memory fields:

1. decide first whether the field is `stable`, `task-scoped`, or `displayed-context`
2. add it to the explicit key lists in `lib/memory.ts` when it participates in lifecycle clearing
3. do not put debug payloads into persisted memory state
4. do not treat displayed-context bridges as durable memory facts

## Related Files

- `lib/memory.ts`
- `lib/app/gpt-memory/gptMemoryRuntime.ts`
- `lib/app/gpt-memory/gptMemoryStorage.ts`
- `hooks/useGptMemory.ts`
- `lib/app/memory-interpreter/memoryInterpreterStateInputs.ts`
