# Ingest Pipeline

Updated: 2026-04-17

## Purpose
This document explains the current ingest pipeline and its authority boundaries.
The goal is to keep file ingest behavior stable while we gradually align the older legacy hook and the newer shared flow.

## Current Paths

There are currently two user-facing ingest paths:

1. `hooks/useFileIngestActions.ts`
2. `hooks/useIngestActions.ts`

They intentionally do not have identical UX, but they should share the same low-level ingest boundary wherever possible.

## Shared Boundary

The following module is now the shared request boundary for both paths:

- `lib/app/ingestClient.ts`

It owns:
- upload-kind resolution for ingest requests
- `/api/ingest` request form assembly
- `/api/ingest` response fetch + JSON parsing
- fallback title extraction
- fallback error extraction

It should not own:
- transform intent resolution
- task draft mutation
- Kin injection block assembly
- GPT memory bridge updates
- summary message wording

## Server Boundary

The server-side ingest route is:

- `app/api/ingest/route.ts`

It is supported by:
- `lib/server/ingest/routeHelpers.ts`
- `lib/server/ingest/promptBuilder.ts`
- `lib/server/ingest/resultSelection.ts`

The route should remain orchestration-only.
Prompt text, result normalization, and budget/selection rules should live in helper modules, not inline in the route.

## Client Flow Split

### Shared flow

- `lib/app/fileIngestFlow.ts`

This is the newer app-flow boundary. It owns:
- ingest result extraction
- transform application
- Kin SYS block preparation
- stored-document bridge updates
- GPT memory `activeDocument` bridge updates
- task draft updates for inject/prep/deepen/attach flows

### Legacy flow

- `hooks/useIngestActions.ts`
- `lib/app/legacyIngestHelpers.ts`
- `lib/app/legacyIngestFlowHelpers.ts`

This path still exists for compatibility. It should keep delegating low-level helper work outward and should not regrow private parsing, prompt, or request helpers.

## Working Rules

When changing ingest behavior:

1. Keep `/api/ingest` request assembly in `ingestClient.ts`.
2. Keep route-only logic out of client hooks.
3. Keep task draft mutation shapes behind helpers where possible.
4. If both ingest paths need the same request/title/error behavior, share it instead of duplicating it.
5. If the change is purely user-facing copy, prefer helper/text-owner modules rather than flow coordinators.

## Near-Term Direction

Next cleanup targets:
- reduce the remaining behavioral gap between `useIngestActions.ts` and `fileIngestFlow.ts`
- move any newly duplicated task-update projections into shared helpers
- keep `app/api/ingest/route.ts` orchestration-only
- add regression tests whenever ingest output or post-action behavior changes
