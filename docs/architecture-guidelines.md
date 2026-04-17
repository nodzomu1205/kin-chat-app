# Architecture Guidelines

## Non-Negotiable LLM-First Rule

This rule applies to both topic generation and `SYS` format generation.

Do not drift away from this rule.
We have already regressed multiple times by doing so.

1. At the entry point, send broad candidate discovery to the LLM.
   Do not add narrow entry rules that pre-classify, rewrite, summarize, or reduce the user text before the LLM sees it.
2. Let the user approve or reject LLM-produced candidates.
   Reflect those decisions immediately in the current output and current draft.
3. Save approved phrases.
   On later inputs, only the exact strong-confidence matching fragment may bypass the LLM.
   The rest of the input must still go through the LLM.

Forbidden regression pattern:

- adding entry-side special cases because one phrase failed once
- adding phrase-specific fallback prompt answers that behave like hidden rules
- shrinking `originalInstruction` into `goal`, title, summary, or other reduced text before LLM review
- routing the whole sentence through shortcut logic because one fragment matched an approved phrase

If behavior is wrong, fix the boundary that dropped or distorted the original text.
Do not patch the entry with more rules.

## Purpose

This memo records the current structural direction of the Kin x GPT app and the rules we want to keep as the app grows.

The main goal is to prevent the codebase from drifting back toward:

- giant page containers
- giant orchestration hooks
- UI components with mixed rendering and business logic
- direct dependence on raw external API responses

## Current Direction

The app should keep moving toward this split:

- `app/page.tsx`
  Page-level composition root only
- `hooks/`
  Stateful feature coordination
- `lib/app/`
  Flow logic and app-specific helpers
- `components/`
  Rendering and small UI-local state
- `types/`
  Shared contracts and normalized shapes

## Rules To Preserve

### 1. Do not create a new giant center

When `page.tsx` gets smaller, another file often grows in its place.

Avoid turning any of these into a new hub:

- `useChatPageController`
- `panelPropsBuilders`
- one large drawer component
- one large protocol utility

If a file starts owning multiple unrelated concerns, split it early.

### 2. Prefer domain boundaries over feature piles

Future work should be organized around boundaries such as:

- chat delivery
- task protocol
- search
- reference library
- file ingest

This is better than mixing all actions for one screen into one file.

### 3. Normalize before use

Never let raw API shapes flow directly into:

- UI
- GPT prompt assembly
- Kin protocol blocks

Always normalize first.

This is especially important for search expansion.

## Search Expansion Rules

For the next SerpAPI phase, keep this layering:

1. `client`
   Raw HTTP and auth only
2. `engines`
   Per-engine request/response handling
3. `normalizers`
   Convert engine-specific data into shared structures
4. `search service`
   Search mode policy and orchestration
5. `UI / GPT / Kin`
   Consume only normalized search context

Raw SerpAPI response objects should not be stored as-is in panel state.

## SearchContext Principle

All search modes should converge into one normalized contract.

The contract may grow, but consumers should read the normalized shape, not the source engine shape.

Examples of source-specific data:

- Google Search fields
- Google News fields
- Maps fields
- Flights fields
- Shopping fields

Examples of normalized data:

- `mode`
- `engine`
- `query`
- `summaryText`
- `sources`
- `metadata`
- `products`
- `localResults`
- `flights`
- `hotels`

## Library Principle

Search results, Kin-created documents, and ingested files now behave like one reference library.

Keep these invariants:

- one shared reference ordering
- one shared reference-count policy
- per-item override is allowed
- UI may filter by type, but storage and ranking stay unified

If a future feature needs "special documents", prefer adding a new item type instead of building a separate parallel library.

## Panel Props Principle

`GptPanel` rendering should stay centered on grouped sections:

- `header`
- `chat`
- `task`
- `protocol`
- `references`
- `settings`

Use these contracts deliberately:

- `BuildGptPanelArgs`
  section-grouped builder input only
- `GptPanelProps`
  section-only render contract

Do not reintroduce top-level flat fallback consumption in `GptPanel`.
If temporary compatibility is unavoidable, isolate it outside the panel body and remove it quickly.

When adding new props:

1. decide whether they belong to grouped builder input, render sections, or both
2. put render-time data in the correct section type
3. build or derive section values in `panelPropsBuilders`
4. consume them through the section object in the panel

## Page Principle

`app/page.tsx` should only do these jobs:

- top-level state
- top-level hook calls
- cross-panel coordination
- final render

Move out:

- action implementations
- protocol block generation details
- search execution details
- ingest flows
- UI formatting helpers

## Good Future Refactor Targets

These are safe next steps when needed:

- keep `GptPanel` section-only and avoid reviving flat compatibility paths
- keep `panelPropsBuilders` focused on light view-model assembly, not action/controller ownership
- split `KinPanel` props similarly if it starts growing fast
- keep `useChatPageController` grouped by domain actions and continue shrinking its coordinator responsibilities

## Smell Checklist

If any new work introduces one of these, stop and split:

- a file exceeds one clear concern
- one hook needs a very large args object
- a component receives many unrelated callbacks
- a raw API shape leaks outside its adapter layer
- a protocol helper starts owning search, UI, and storage logic together

## Practical Rule For New Features

Before adding a new capability, decide first:

1. What is the normalized data shape?
2. Which domain owns it?
3. Which flow creates it?
4. Which panel consumes it?

If those are not clear, implementation should pause until they are.
