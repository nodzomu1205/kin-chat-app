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
- current test status: `155 files / 677 tests`

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

### `components/panels/gpt/LibraryDrawer.tsx`

First slice completed:

- `ReceivedDocsDrawer.tsx` was renamed to `LibraryDrawer.tsx`
- drawer state/filtering stays in `LibraryDrawer.tsx`
- Drive/device import controls and tab controls live in
  `LibraryDrawerControls.tsx`
- library item shell lives in `LibraryItemCard.tsx`
- item header/actions/metadata live in `LibraryItemCardHeader.tsx`,
  `LibraryItemCardActions.tsx`, and `LibraryItemMetadata.tsx`
- search preview and stored-document editing live in
  `LibraryItemSearchPreview.tsx` and `LibraryItemStoredDocumentEditor.tsx`
- the unused `SearchRawDrawer.tsx` wrapper was deleted after confirming it had
  no live imports
- `LibraryDrawer.test.tsx` now runs in the default Vitest baseline

Why:

- reduced from around 900 lines to a thin drawer-state component plus focused
  local library components
- mixes library display, Drive folder presentation, import/export actions, and
  drawer-level UI state
- directly connected to the still-active Drive / ingest authority work

Suggested next slice if this area is touched again:

1. keep follow-up changes small and local if these library components start to
   carry new behavior again
2. keep action callbacks owned by the existing hook/domain boundary
3. move display-only helpers near the drawer, not into ingest/domain modules
4. run `components/panels/gpt/LibraryDrawer.test.tsx`

### `components/message/messageSourcePreview.tsx`

Status:

- split completed after residue check
- `messageSourcePreview.tsx` is now the card orchestrator only
- source classification/helpers live in `messageSourcePreviewHelpers.ts`
- preview banners live in `MessageSourcePreviewBanners.tsx`
- YouTube transcript actions live in `MessageSourcePreviewActions.tsx`
- `messageSourcePreview.test.tsx` and `MessageSources.test.tsx` are now
  included in the default Vitest baseline

Watch next:

1. keep source parsing/classification separate from JSX rendering
2. add new source-type renderers behind small local components
3. preserve the existing `messageSourcePreview` / `MessageSources` tests

## Priority 2: Finish Drive / Ingest Convergence

### `hooks/useGoogleDrivePicker.ts`

Status:

- first split completed
- `useGoogleDrivePicker.ts` keeps picker/open-folder orchestration and UI
  feedback dispatch
- `googleDrivePickerRuntime.ts` owns Google script loading, picker readiness,
  and token acquisition
- `googleDriveImportExecution.ts` owns Drive file/folder import and
  library-item upload execution after loading state is entered
- `ingestStoredDocumentPreparation.ts` owns the shared post-request step that
  resolves import summaries, aggregates ingest usage, and builds ingested
  stored-document records for device-file and Drive imports
- `ingestUsage.ts` owns library-summary usage normalization before ingest
  bucket accounting, shared by file/Drive import summaries, search summaries,
  and task-snapshot summaries
- `lib/app/google-drive/googleDriveApi.ts` owns Drive HTTP fetch/upload/listing
- `googleDrivePickerBuilders.ts` owns Drive importability, folder index text,
  Picker selected-document action resolution, upload destination prompts, Drive
  import stored text, summary fallback, and Drive import/upload feedback
  message text
- the unused exported `summarizeImportedText` residue was removed
- Drive import completion notices are now skipped by latest-GPT transfer
  selection through `latestGptMessage`

Watch next:

1. avoid creating a separate Drive ingest system
2. keep using `lib/app/ingest/ingestDocumentModel.ts` and shared ingest helpers
3. run `hooks/googleDrivePickerBuilders.test.ts` plus targeted ingest tests

Related active files:

- `hooks/useGoogleDrivePicker.ts`
- `hooks/googleDrivePickerBuilders.ts`
- `hooks/useFileIngestActions.ts`
- `lib/app/ingest/fileIngestFlow.ts`
- `lib/app/ingest/ingestDocumentModel.ts`
- `components/panels/gpt/LibraryDrawer.tsx`

## Priority 3: Split Remaining Task Runtime Giants

### `lib/app/task-runtime/transformIntent.ts`

Status:

- first split completed
- `transformIntent.ts` remains the public facade and keeps Kin directive/task
  execution instruction assembly
- `transformIntentParser.ts` owns rule-based directive parsing
- `transformIntentResolver.ts` owns intent resolver prompting, JSON extraction,
  and LLM patch merge/coercion
- `transformIntentTypes.ts` owns shared intent/usage types
- `transformIntentRuntime.ts` owns transform-content detection and `/api/chatgpt`
  text transformation runtime
- `transformIntentChunking.ts` owns Kin chunk splitting used by ingest,
  multipart, and YouTube transcript flows
- `transformIntent.test.ts` preserves facade wiring and chunk behavior

Watch next:

1. identify pure parsing / normalization / prompt-shaping sections
2. extract only sections with direct tests or obvious stable behavior
3. avoid changing task-constraint visible behavior
4. run task-runtime and task-intent focused tests before broader verification

### `lib/app/task-runtime/kinTransferFlows.ts`

Status:

- first small split completed
- `kinTransferFlows.ts` remains the public transfer facade
- `kinTransferLatestFlow.ts` and `kinTransferCurrentTaskFlow.ts` own the two
  transfer orchestration paths
- `kinTransferFlowBuilders.ts` owns task-usage accumulation, task-info message
  append shaping, and Kin task injection status text
- `kinTransferFlowTypes.ts` owns transfer flow argument/result contracts
- `kinTransferFlowBuilders.test.ts` pins those helper behaviors directly

Watch next:

1. keep transfer orchestration in the file
2. move repeated input/message shaping into `taskRuntimeActionBuilders` only
   when duplication is concrete
3. keep Kin injection helpers in `lib/app/task-support/`

## Priority 4: Keep GPT Panel / Settings From Regrowing

### `components/panels/gpt/GptDrawerRouter.tsx`

Status:

- first helper split completed
- `GptDrawerRouter.tsx` still owns drawer selection and JSX wiring
- `GptDrawerRouter.tsx` is now around 150 lines after moving repeated
  meta/task/library/settings drawer prop bundles out of the render branches
- `GptDrawerRouterHelpers.ts` owns device-import option shaping, device import
  accept strings, meta/task/library/settings drawer prop bundles, and
  memory-settings reset/save value shaping
- `GptDrawerRouterHelpers.test.ts` pins those pure helper behaviors directly

Watch next:

1. keep this router as drawer selection / composition only
2. keep future drawer additions routed through local prop builders when the
   mapping starts to hide behavior
3. avoid moving settings policy into drawer render branches
4. preserve the helper test when changing import or memory settings behavior

### `components/panels/gpt/GptSettingsDrawer.tsx`

Status:

- first shared-state split completed
- `GptSettingsDrawer.tsx` and `GptSettingsWorkspace.tsx` now share search
  preset selection, engine toggling, and source-display count normalization
  through `GptSettingsSearchState.ts`
- `GptSettingsDrawer.tsx` is now around 290 lines after moving memory and ingest
  tab bodies into `GptSettingsDrawerSections.tsx`
- `GptSettingsWorkspaceViews.tsx` is now around 230 lines after reusing the
  shared memory settings section and memory reset/save value builders
- the unused `GptSettingsWorkspaceSections.tsx` re-export layer and orphaned
  generic `RuleApprovalSection` were removed after a live-reference check
- `GptSettingsApprovalSections.tsx` and `GptSettingsRulesSection.tsx` now share
  memory review option sets and topic-decision value shaping through
  `GptSettingsApprovalState.ts`
- `GptSettingsApprovalSections.tsx` is now around 210 lines after moving
  memory/sys approval item cards into `GptSettingsApprovalCards.tsx`
- `GptSettingsRulesSection.tsx` is now around 250 lines after moving
  pending/approved memory and SYS rule cards into `GptSettingsRuleCards.tsx`
- the drawer now uses the existing shared `NumberField` primitive instead of a
  duplicate local numeric input
- `GptSettingsSearchState.test.ts` pins the shared search-state behavior
- `GptSettingsApprovalState.test.ts` pins the shared approval-state behavior

Watch next:

1. keep remaining tab-local UI in section components when it starts to grow again
2. keep search state behavior shared between drawer and workspace surfaces
3. avoid adding new settings primitives locally when `GptSettingsShared.tsx`
   already owns the pattern
4. keep memory settings value shaping on the shared helper path
5. do not reintroduce no-op section re-export layers
6. keep memory-review decision/value shaping shared between drawer and workspace
   settings surfaces
7. keep approval item card rendering in `GptSettingsApprovalCards.tsx`
8. keep rules item card rendering in `GptSettingsRuleCards.tsx`

Watch files:

- `components/panels/gpt/GptPanel.tsx`
- `components/panels/gpt/GptDrawerRouter.tsx`
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

### `components/panels/gpt/TaskProgressPanel.tsx`

Status:

- first helper split completed
- `TaskProgressPanel.tsx` still owns task-progress section composition and local
  edit/sync state
- `TaskProgressPanelHelpers.ts` owns `SYS_TASK_CONFIRM` status normalization and
  output block construction
- `TaskProgressPanel.tsx` is now around 238 lines after moving requirement
  progress cards, user-facing request cards, and sync/suspend action sections
  into `TaskProgressPanelParts.tsx`
- `TaskProgressPanelHelpers.test.ts` pins the task-progress output format

Watch next:

1. keep Kin-facing task-progress output construction in the helper
2. keep card and action-section rendering in `TaskProgressPanelParts.tsx`
3. preserve focused helper coverage when changing task-confirm output text
4. split the remaining summary/header rendering only if the panel regrows

## Priority 6: Search Domain Local Splits

### `lib/search-domain/normalizerBuilders.ts`

Why:

- around 158 lines after the local search-domain splits
- search-domain is already well-contained, but this file is the next local
  concentration point and is now mostly a facade plus organic/merge helpers
- AI Mode block/table shaping now lives in `normalizerAiModeBuilders.ts`
- local-result shaping now lives in `normalizerLocalBuilders.ts`
- YouTube result shaping now lives in `normalizerYoutubeBuilders.ts`
- shared raw-text block formatting now lives in `normalizerRawBlocks.ts`

Suggested next slice:

1. keep `normalizers.ts` as the public orchestration surface
2. split organic search/news result shaping only if this file regrows
3. run search-domain builder tests and chatgpt search tests

## Priority 7: Repo Hygiene

### `app/page.tsx.bak-20260408-restore`

Status:

- removed after confirming the only live reference was this review note
- the active app entry remains `app/page.tsx`

## Maintenance-Watch Boundaries To Keep

Keep these under watch even though the structure is much healthier:

- ingest authority and token accounting
- device-file vs Drive post-request convergence
- remaining protocol/task-payload `responseMode` names
- `sendToGptFlow` orchestration boundaries; guard context shaping now lives in
  `sendToGptFlowGateContextBuilders.ts`, and prepared-request gate handling now
  lives in `sendToGptPreparedRequestGates.ts`; API request/response contracts
  now live in `sendToGptApiTypes.ts`, and prepared-request/gate context
  contracts live in `sendToGptPreparedRequestTypes.ts`; run-flow argument
  contracts now live in `sendToGptFlowArgTypes.ts`; context/request/response
  artifact contracts now live in `sendToGptFlowArtifactTypes.ts`; shared base
  event/search contracts now live in `sendToGptFlowBaseTypes.ts`, and the
  unused `sendToGptFlowTypes.ts` facade is gone; inline-search extraction, AI
  continuation artifacts, protocol limit priority, and protocol search-engine
  overrides now live in `sendToGptFlowContextResolvers.ts`; prepared-request
  gate side effects now live in `sendToGptPreparedGateHandlers.ts`
- page/controller/panel composition boundaries; `app/page.tsx` now delegates
  domain-bundle to workspace-contract projection to
  `useChatPageWorkspaceDomainInputs.ts`, and panel arg sections now live in
  `chatPagePanelSectionBuilders.ts`; panel/workspace-view type contracts now
  live behind split modules re-exported by `chatPagePanelCompositionTypes.ts`,
  with reference-library / Drive view types isolated in
  `chatPageWorkspaceReferenceTypes.ts`
- user-facing text ownership and mojibake cleanup in touched owner files

## Recommended Next-Session Order

1. Run verification first.
2. Start with `lib/app/task-runtime/transformIntent.ts` if continuing the
   maintenance queue.
3. Keep the change narrow and add or preserve a focused test.
4. Revisit UI or Drive/ingest surfaces only when new behavior grows there.
5. Update `README.md`, `docs/refactor-roadmap.md`, `docs/next-session.md`, and
   the latest dated handoff if any boundary status changes.
