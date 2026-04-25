# Ingest Pipeline

Updated: 2026-04-25

## Purpose
This document explains the current ingest pipeline and its authority boundaries.
The goal is to keep file ingest behavior stable while device-file import and Google Drive import converge on the same canonical document authority.

## Non-Negotiable Ingest Rule

Do not fix ingest regressions by layering more cleanup at the edges.

For ingest, define these in order:

1. `canonicalDocumentText`
   - the one normalized stored/display authority
2. `documentSummary`
   - derived from canonical text only
3. `taskPrepEnvelope`
   - protocol/task-only wrapper text such as `File/Title/Content`
4. display projections
   - library card
   - GPT chat display
   - Kin SYS blocks

Forbidden regression pattern:

- using `taskPrepEnvelope` as stored library text
- using stored/display text as protocol-envelope text
- adding separate cleanup in summary, chat, library, and protocol because one surface looked wrong

If an ingest bug appears in more than one surface, stop and trace the
authority chain before editing.

## Current Paths

There are currently two user-facing ingest entry paths:

1. device-file import through `hooks/useFileIngestActions.ts` and `lib/app/fileIngestFlow.ts`
2. Google Drive import through `hooks/useGoogleDrivePicker.ts`

They do not have identical picker/auth UX, but they should share canonical text, summary, stored-document, usage, and completion-message rules wherever possible.

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

### Device-file flow

- `lib/app/fileIngestFlow.ts`

This is the main device-file app-flow boundary. It owns:
- ingest result extraction
- canonical document text resolution
- Kin SYS block preparation
- stored-document bridge updates
- GPT memory `activeDocument` bridge updates
- file-import completion messages

### Google Drive flow

- `hooks/useGoogleDrivePicker.ts`

This path owns Drive-specific concerns:

- picker auth
- file/blob download
- folder traversal
- Drive upload routing

It should not become a separate ingest authority. It should keep using the shared `/api/ingest` request boundary and shared canonical document helpers where practical.

## Working Rules

When changing ingest behavior:

1. Keep `/api/ingest` request assembly in `ingestClient.ts`.
2. Keep route-only logic out of client hooks.
3. Define the canonical ingest text before touching summary, library, chat, or Kin.
4. Keep task draft mutation shapes behind helpers where possible.
5. If both ingest paths need the same request/title/error behavior, share it instead of duplicating it.
6. If the change is purely user-facing copy, prefer helper/text-owner modules rather than flow coordinators.

Before any ingest fix, answer explicitly:

1. what is the canonical stored text?
2. what is the protocol envelope?
3. which outputs derive from each?

## Near-Term Direction

Next cleanup targets:
- reduce remaining post-request duplication between device import and Drive import
- move any newly duplicated stored-document, summary, usage, or completion-message shaping into shared helpers
- keep `app/api/ingest/route.ts` orchestration-only
- add regression tests whenever ingest output or post-action behavior changes

## Google Drive Notes

Google Drive import is now part of the ingest family, not a separate pipeline.

That means:

- Drive picker/auth is Drive-specific
- folder traversal is Drive-specific
- upload destination selection is Drive-specific
- canonical text, summary rules, and stored-document projection should remain shared with file ingest

Outstanding Drive work:

1. upload subfolder selection
2. folder index presentation polish
3. clearer decision on ZIP support and where unzip should live
4. continue reducing behavioral gaps between Drive import and device import

UI direction to keep:

- device-file ingest and Drive import should converge into the library surfaces
- import entry actions belong in the library drawer area
- import-related settings belong in the library settings workspace
- the GPT bottom `file` tab should not remain a permanent parallel ingest entry point if the same workflow is being consolidated elsewhere

Accounting rule:

- ingest extraction and library-card summary generation should both be counted in the ingest bucket
- if future token numbers look high, inspect the prompt/output authority before assuming the meter is wrong
