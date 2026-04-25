# Workspace Model

Updated: 2026-04-17

## Purpose
This document explains the current workspace boundary in practical terms.
It is a maintainability map for the live application shell.

Use it to answer:

- where state begins
- where composition happens
- where actions are grouped
- where render props are built
- where real behavior executes

## Layer Order

The current workspace is layered like this:

1. page state roots
2. page-side composition
3. controller-side action composition
4. panel prop shaping
5. panel rendering
6. app flows and runtime domains

Higher layers should wire and compose.
Lower layers should decide behavior.

## 1. Page State Roots

Primary file:
- `app/page.tsx`

Owns:
- top-level React state
- top-level refs
- top-level hook invocation
- final page shell render

Should do:
- create workspace state roots
- pass grouped inputs into composition hooks
- stay thin and explicit

Should not do:
- own task/protocol policy
- classify user input
- hand-build large transport payloads

## 2. Page-Side Composition

Primary files:
- `hooks/useChatPagePanelsComposition.tsx`
- `hooks/chatPageWorkspaceCompositionBuilders.ts`
- `hooks/chatPagePanelCompositionBuilders.ts`

Owns:
- turning page workspace state into controller inputs
- turning workspace/controller output into Kin/GPT panel inputs
- page-local composition glue

Should do:
- compose panels
- route grouped state to the next layer
- keep authority boundaries visible

Should not do:
- hide business policy in builder glue
- mutate runtime state directly

## 3. Controller-Side Action Composition

Primary files:
- `hooks/useChatPageController.ts`
- `hooks/useChatPageControllerArgs.ts`
- `hooks/useChatPageMessagingDomainActions.ts`
- `hooks/useChatPageTaskDomainActions.ts`
- `hooks/useChatPagePanelDomainActions.ts`
- `hooks/useChatPageMemoryActions.ts`

Owns:
- grouping domain actions behind one controller surface

Current grouped domains:
- `kin`
- `gpt`
- `task`
- `protocol`
- `memory`
- `panel`

Should do:
- compose domain hooks
- pass shared services across domains in a controlled way

Should not do:
- become a second `app/page.tsx`
- own render structure
- manually rebuild the same panel prop bags inline

## 4. Panel Prop Shaping

Primary files:
- `hooks/useChatPageKinPanelProps.ts`
- `hooks/useChatPageGptPanelArgs.ts`
- `lib/app/ui-state/panelPropsBuilders.ts`

Owns:
- render-facing prop shaping
- GPT section-grouped args
- stable view-model style prop assembly

Should do:
- convert domain/controller state into render-ready props
- keep render components declarative

Should not do:
- invent domain policy
- hide runtime mutation

## 5. Panel Rendering

Primary files:
- `components/panels/kin/KinPanel.tsx`
- `components/panels/gpt/GptPanel.tsx`

Owns:
- rendering
- local visual state
- local layout behavior

Should do:
- render the current workspace state clearly
- keep local-only concerns local

Should not do:
- parse task intent
- mutate protocol runtime directly
- call server routes with ad hoc payload logic

## 6. App Flows And Runtime Domains

This is where real behavior lives.

Main examples:
- `lib/app/send-to-gpt/sendToGptFlow.ts`
- `lib/app/ingest/fileIngestFlow.ts`
- `lib/app/task-draft/taskDraftActionFlows.ts`
- `hooks/useKinTaskProtocol.ts`
- `lib/app/task-runtime/currentTaskIntentRefresh.ts`

Owns:
- GPT request execution
- ingest execution
- task draft mutation flows
- task runtime mutation
- current-task refresh orchestration
- Kin transport preparation

This layer should stay testable and mostly independent from page composition.

## Workspace Subdomains

### Messaging workspace

Primary boundaries:
- `useChatPageMessagingDomainActions`
- `sendToGptFlow`
- Kin send helpers

Role:
- user/GPT/Kin message exchange

### Task workspace

Primary boundaries:
- `useChatPageTaskDomainActions`
- `useTaskDraftActions`
- `useTaskProtocolActions`
- `useKinTaskProtocol`

Role:
- task draft editing
- protocol-driven task runtime
- approval-driven refresh
- Kin task injection

### Memory workspace

Primary boundaries:
- `useGptMemory`
- memory interpreter helpers
- `useChatPageMemoryActions`

Role:
- topic/fact/preference continuity

### Ingest workspace

Primary boundaries:
- `useFileIngestActions`
- `useGoogleDrivePicker`
- `fileIngestFlow`
- `ingestClient`

Role:
- external content intake
- task-draft projection from ingested content
- stored-document and memory bridge updates

## Source Of Truth Notes

Current source-of-truth rules:

### Page shell
- `app/page.tsx` is the state-root shell, not the business-policy shell.

### Task runtime
- `useKinTaskProtocol.ts` owns runtime mutation and runtime snapshots.

### Current-task refresh
- `currentTaskIntentRefresh.ts` owns re-interpret -> replace -> draft sync -> Kin input refresh.

### Ingest request boundary
- `ingestClient.ts` owns shared `/api/ingest` request/title/error handling.

### Ingest task-draft projection

## Editing Guide

When changing workspace code:

1. If the change is top-level wiring, start in `app/page.tsx`.
2. If the change is panel composition, start in `useChatPagePanelsComposition.tsx`.
3. If the change is grouped user actions, start in `useChatPageController.ts`.
4. If the change is render-facing prop shape, start in panel prop hooks/builders.
5. If the change is actual business behavior, start in app flows or runtime hooks.

If a change seems to need all five layers at once, stop and split the work.

## Anti-Patterns

Do not let the workspace drift back into these shapes:

- page file re-accumulates domain logic
- composition builders quietly own business rules
- controller becomes a second runtime layer
- panels perform cross-domain mutations directly
- app flows depend on page-local implementation details

## Near-Term Direction

The next maintainability gains in the workspace layer are:

- keep `app/page.tsx` as a thin shell
- stop builder modules from becoming hidden policy owners
- continue moving shared projections into app/domain helpers
- keep the controller layer grouped by domain rather than by UI surface
