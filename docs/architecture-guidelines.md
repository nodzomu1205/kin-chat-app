# Architecture Guidelines

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

- `useChatPageActions`
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

If a future feature needs “special documents”, prefer adding a new item type instead of building a separate parallel library.

## Panel Props Principle

`GptPanelProps` should keep moving toward grouped sections:

- `header`
- `chat`
- `task`
- `protocol`
- `references`
- `settings`

Avoid adding new top-level flat props unless it is a temporary compatibility bridge.

When adding new props:

1. put them in the correct section type
2. build them in `panelPropsBuilders`
3. consume them through the section object in the panel

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

- reduce flat fallback usage in `GptPanel`
- strengthen `panelPropsBuilders` as view-model builders
- split `KinPanel` props similarly if it starts growing fast
- continue shrinking `useChatPageActions` façade responsibilities

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
