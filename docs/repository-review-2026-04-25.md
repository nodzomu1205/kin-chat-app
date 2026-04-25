# Repository Review 2026-04-25

This review captures the post-organization state and the remaining maintenance
plan for the next session.

## Current Structural State

The broad folder-organization pass is complete enough to stop treating folder
shape itself as the default next task.

Current top-level domain shape:

- `lib/`
  - `app/`
  - `memory-domain/`
  - `search-domain/`
  - `server/`
  - `shared/`
  - `task/`
- `components/`
  - `layout/`
  - `message/`
  - `panels/`
  - `pwa/`
  - `task/`
  - `ui/`

Current root-file status:

- `lib/` direct files: 0
- `lib/app/` direct files: 0
- `components/` direct files: 0

Verification baseline from the latest completed check:

- `npx tsc --noEmit` passes
- `npm run lint` passes
- `npm test` passes
- `npm run build` passes
- current test status: `141 files / 621 tests`

## What Not To Do Next

Do not start the next session with another broad folder sweep.

The remaining work is now less about "where should files live?" and more about:

- large file decomposition
- keeping domain boundaries from regrowing
- extracting narrow helpers only when they remove proven duplication
- preserving the current test and build baseline

Also avoid introducing barrel files just to shorten imports. The current long
imports are verbose, but they make ownership explicit after the folder pass.

## Priority 1: Split Large UI Surfaces Carefully

### `components/panels/gpt/ReceivedDocsDrawer.tsx`

Why:

- around 900 lines
- mixes library display, Drive folder presentation, import/export actions, and
  drawer-level UI state
- directly connected to the still-active Drive / ingest authority work

Suggested next slice:

1. extract repeated Drive/library row rendering into focused child components
2. keep action callbacks owned by the existing hook/domain boundary
3. move display-only helpers near the drawer, not into ingest/domain modules
4. run `components/panels/gpt/ReceivedDocsDrawer.test.tsx`

### `components/message/messageSourcePreview.tsx`

Why:

- around 780 lines
- combines source classification, preview rendering, and action-button display
- likely to grow as more source types are added

Suggested next slice:

1. split source-type renderers behind small local components
2. keep source parsing/classification separate from JSX rendering
3. preserve existing `messageSourcePreview` / `MessageSources` tests

## Priority 2: Finish Drive / Ingest Convergence

### `hooks/useGoogleDrivePicker.ts`

Why:

- around 700 lines
- still carries picker auth, folder traversal, import orchestration, upload
  destination handling, and UI-facing state updates in one hook
- this is the most important remaining functional-maintenance boundary

Suggested next slice:

1. keep picker auth and Google Picker interaction in the hook
2. move pure folder-entry shaping and upload destination helpers into
   `hooks/googleDrivePickerBuilders.ts` or `lib/app/google-drive/`
3. avoid creating a separate Drive ingest system
4. keep using `lib/app/ingest/ingestDocumentModel.ts` and shared ingest helpers
5. run `hooks/googleDrivePickerBuilders.test.ts` plus targeted ingest tests

Related active files:

- `hooks/useGoogleDrivePicker.ts`
- `hooks/googleDrivePickerBuilders.ts`
- `hooks/useFileIngestActions.ts`
- `lib/app/ingest/fileIngestFlow.ts`
- `lib/app/ingest/ingestDocumentModel.ts`
- `components/panels/gpt/ReceivedDocsDrawer.tsx`

## Priority 3: Split Remaining Task Runtime Giants

### `lib/app/task-runtime/transformIntent.ts`

Why:

- around 940 lines
- larger than the surrounding task-runtime modules after the folder pass
- should be easier to audit before future task-intent behavior changes

Suggested next slice:

1. identify pure parsing / normalization / prompt-shaping sections
2. extract only sections with direct tests or obvious stable behavior
3. avoid changing task-constraint visible behavior
4. run task-runtime and task-intent focused tests before broader verification

### `lib/app/task-runtime/kinTransferFlows.ts`

Why:

- still a medium-large coordinator
- should remain orchestration-focused and avoid rebuilding task-domain policy

Suggested next slice:

1. keep transfer orchestration in the file
2. move repeated input/message shaping into `taskRuntimeActionBuilders` only
   when duplication is concrete
3. keep Kin injection helpers in `lib/app/task-support/`

## Priority 4: Keep GPT Panel / Settings From Regrowing

Watch files:

- `components/panels/gpt/GptPanel.tsx`
- `components/panels/gpt/GptSettingsApprovalSections.tsx`
- `components/panels/gpt/GptSettingsRulesSection.tsx`
- `components/panels/gpt/GptSettingsDrawer.tsx`
- `components/panels/gpt/TaskProgressPanel.tsx`
- `components/panels/gpt/GptSettingsWorkspaceViews.tsx`

Suggested next slice:

1. prefer child components for repeated display structures
2. keep text in text-owner files
3. keep policy out of render components
4. add or preserve focused component tests when splitting

## Priority 5: Search Domain Local Splits

### `lib/search-domain/normalizerBuilders.ts`

Why:

- around 530 lines
- search-domain is already well-contained, but this file is the next local
  concentration point

Suggested next slice:

1. split by engine/result family only if tests stay easy to diagnose
2. keep `normalizers.ts` as the public orchestration surface
3. run search-domain builder tests and chatgpt search tests

## Priority 6: Repo Hygiene Candidates

### `app/page.tsx.bak-20260408-restore`

Why:

- large backup file remains in the repo tree
- it is not part of the active app path

Next session should decide whether to delete it or move it to an archive outside
the active source tree. Do not remove it without an explicit cleanup decision.

## Maintenance-Watch Boundaries To Keep

Keep these under watch even though the structure is much healthier:

- ingest authority and token accounting
- device-file vs Drive post-request convergence
- remaining protocol/task-payload `responseMode` names
- `sendToGptFlow` orchestration boundaries
- page/controller/panel composition boundaries
- user-facing text ownership and mojibake cleanup in touched owner files

## Recommended Next-Session Order

1. Run verification first.
2. Start with `ReceivedDocsDrawer.tsx` or `useGoogleDrivePicker.ts`, depending
   on whether the next goal is UI readability or Drive/ingest convergence.
3. Keep the change narrow and add or preserve a focused test.
4. Only then consider splitting `transformIntent.ts`.
5. Update `README.md`, `docs/refactor-roadmap.md`, `docs/next-session.md`, and
   the latest dated handoff if any boundary status changes.
