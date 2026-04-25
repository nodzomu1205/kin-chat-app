# Refactor Roadmap

Updated: 2026-04-25

## Purpose
This roadmap tracks the maintainability work for the repository.
We use it to keep three things visible at all times:

1. what has already been stabilized
2. what is being refactored now
3. what should be tackled next

The goal is not to rewrite everything at once. The goal is to keep shipping while reducing hidden coupling and future regressions.

Current verification baseline:
- `npx tsc --noEmit` passes
- `npm run lint` passes
- `npm test` passes
- `npm run build` passes
- test status: `141 files / 621 tests`

This roadmap should now be read together with:

- `docs/maintenance-checklist.md`
- `docs/memory-lifecycle.md`

## Current Assessment
The repository is already functionally strong, but a few integration points remain riskier than the rest.

Primary review points:
- `app/api/chatgpt/route.ts`
- `lib/app/send-to-gpt/sendToGptFlow.ts`
- `hooks/useGptMemory.ts`
- `lib/app/memory-interpreter/memoryInterpreter.ts`
- `hooks/useKinTaskProtocol.ts`
- `lib/app/kin-protocol/kinMultipart.ts`

Current cleanup priority:
1. repo-wide `strict` / `creative` / `responseMode` cleanup
2. library-ingest authority watch and remaining device/Drive post-request convergence
3. mojibake cleanup in still-active parsing/matching owner files
4. `lib/app/send-to-gpt/sendToGptFlow.ts` maintenance-watch boundaries
5. `app/page.tsx` / page composition regrow prevention
6. responsive / panel-mode authority guardrails
7. user-facing text drift outside owner files

## Maintenance Checkpoint

This section is the current checkpoint for deciding whether the repository is in
"active refactor" or "maintenance watch" mode.

### Ready To Treat As Stabilized

These areas are not frozen forever, but they are stable enough that future work
should default to small edits, regression tests, and boundary respect instead of
new structural rewrites.

- LLM-first task/topic intent boundary
- task protocol refresh path from approval to draft/Kin sync
- panel-mode authority and responsive focus routing
- GPT settings / protocol text ownership
- shared ingest request boundary
- core workspace / protocol / ingest docs set

### Still In Maintenance Watch

These areas are much healthier than before, but should still be treated as
high-signal review points before and after changes.

- `app/page.tsx` and page-side composition boundaries
- `lib/app/send-to-gpt/sendToGptFlow.ts` and adjacent request/finalize coordinators
- legacy/current ingest split after the shared request + draft layers
- ingest text authority when one imported content fans out into summary,
  library, GPT chat, and Kin protocol surfaces
- remaining builder reshaping across controller/panel composition
- future user-facing copy drift outside the text-owner files
- task-intent/task-progress/compiler boundaries after the residue cleanup, until the
  remaining response-mode carry-through is fully audited
- repo-wide `strict` / `creative` / `responseMode` carry-through after the UI simplifications

### Deletion Principle

When a feature is replaced, we should delete the obsolete path back to its root
owner whenever practical.

That means:

1. remove hidden UI-state carry-through, not just visible controls
2. remove persistence and builder pass-through when no live caller remains
3. remove adjacent dead helpers in the same neighborhood when they are clearly
   orphaned
4. leave temporary compatibility branches only when an active caller is still
   confirmed

### LLM Debug Principle

For LLM-backed boundaries, do not mark an old behavior as removed until the
full adopted-value path has been observed.

Required trace:

1. prompt
2. raw reply
3. parsed reply
4. post-parse transforms / harmonizers
5. final resolved value written to state/UI

This exists because the repo has repeatedly regressed when a recently touched
guard was removed but an older overwrite path still remained elsewhere.

The preferred fix style is subtractive:

- find the exact owner that rewrites the value
- remove that rewrite at the root
- avoid compensating rules, blockers, or prompt inflation unless the root cause
  is already understood and still required

### Debug Honesty Principle

During regression work, do not convert a local reading into a repo-wide claim.

Required discipline:

1. say what was directly observed
2. say what is still inference
3. do not call a path removed until the end-to-end runtime trace proves it
4. prefer "unverified" over a false sense of certainty

### Exit Criteria For "Maintenance Complete"

We can treat the current maintainability program as complete when all of the
following are true:

1. device-file and Drive ingest paths share one practical post-request authority path
2. `sendToGpt` no longer regrows mixed policy inside the top-level coordinator
3. page/controller/panel composition stops regrowing no-op pass-through layers
4. text / settings labels continue to change through owner files only
5. new regressions are caught by tests before they reach manual device review
6. ingest text handling follows one canonical-document model instead of
   symptom-level cleanup at multiple downstream surfaces

Reference:

- `docs/maintenance-checklist.md`

## Immediate Action Plan

This is the practical maintainability plan to follow next.
It is intentionally ordered by regression risk, not by which files are easiest to split.

### Priority 1: Audit repo-wide response-mode carry-through

Why first:
- the visible task-constraint path is now stable enough to leave alone unless a
  concrete regression appears
- the dead GPT settings/persistence `responseMode` carry-through has been
  removed, and the controller/service runtime boundary now uses
  `reasoningMode`
- stale `strict` / `creative` plumbing can still create false reasoning if an
  inner request/task flow or protocol payload field is mistaken for a removed
  setting

Primary authority:
- GPT request preparation and route payload shaping
- task / Kin transfer runtime builders that still pass the fixed reasoning mode
- `lib/app/task-runtime/reasoningMode.ts` as the app-side owner of the runtime reasoning type
- any future UI surface that tries to reintroduce response-mode state

Boundary rules to keep:
- do not remove a mode value from one surface until all live callers have been
  traced
- delete dead persistence / builder pass-through at the root when practical
- add a narrow regression test for each removed or reclassified branch

Mini phases:
1. inventory remaining live `strict`, `creative`, and `responseMode` references
2. classify each reference as active behavior, compatibility read, or dead
   carry-through
3. remove additional dead pass-through in small slices only after classification
4. update docs when a boundary moves from maintenance-watch to stabilized

Recent progress:
- `usePersistedGptOptions` no longer exposes a no-op `responseMode` setting
- `persistedGptOptionsState` no longer stores or returns response-mode state
- page/workspace/panel settings builders no longer pass `responseMode` or
  `onChangeResponseMode` as GPT settings props
- controller services now supply the current fixed `strict` runtime value as
  `reasoningMode` instead of reading it from page settings state
- `components/panels/gpt/gptPanelTypes.ts` no longer owns the runtime
  strict/creative type; `lib/app/task-runtime/reasoningMode.ts` does
- task-intent fallback, current-task intent refresh, Kin task start, Kin
  transfer, transform-intent, and send-to-GPT request internals now use
  `reasoningMode` at their flow/request boundaries
- remaining `responseMode` names are protocol/task payload semantics, not
  strict/creative runtime policy

Done when:
- response-mode state has one clear owner
- no deleted UI option still travels through persistence or request builders
- the next session cannot misread a protocol/payload `responseMode` field as
  active UI policy or LLM strict/creative runtime state

### Priority 2: Untangle task runtime, draft sync, and Kin injection

Why second:
- task bugs have repeatedly come from mixing four different concerns in the same paths:
  - user instruction interpretation
  - approval state changes
  - runtime mutation
  - Kin draft / injection generation

Primary authority:
- `hooks/useTaskProtocolActions.ts`
- `hooks/useTaskDraftHelpers.ts`
- `lib/task/taskProtocolTaskState.ts`
- `lib/app/task-runtime/kinTaskFlow.ts`
- `lib/app/task-runtime/kinTransferFlows.ts`
- `lib/app/ui-state/miscUiFlows.ts`

Target responsibility split:
- `task intent + approval`
  - candidate parsing, approval, rejection, approved shortcut state
- `task runtime`
  - current task id, title, intent, original instruction, progress state
- `task draft sync`
  - page-visible editable draft only
- `Kin injection`
  - compiled SYS block delivery only

Mini phases:
1. write a short contract comment for `originalInstruction`, `currentTaskIntent.goal`, and `currentTaskDraft.userInstruction`
2. reduce repeated `sourceInstruction` fallback logic into one helper owned by the task-runtime boundary
3. move Kin injection assembly behind a narrower helper so approval flows do not build transport details directly
4. add a recompile-path test matrix: approve, edit, delete, resend

Done when:
- the same task edit does not need to touch UI draft sync and transport assembly in multiple places
- approval flows no longer reconstruct transport details inline

### Priority 2.5: Canonicalize ingest text authority

Why now:
- repeated ingest regressions have shown that one imported content still fans
  out into too many similar text variants
- this creates "fix one symptom, miss another surface" behavior

Primary authority:
- `lib/app/ingest/fileIngestFlow.ts`
- `lib/app/gpt-task/gptTaskClient.ts`
- `hooks/useStoredDocuments.ts`
- `hooks/useReferenceLibrary.ts`
- `docs/ingest-pipeline.md`

Target responsibility split:
- `canonicalDocumentText`
  - stored and displayed document text only
- `documentSummary`
  - summary derived from canonical text only
- `taskPrepEnvelope`
  - task / SYS / Kin wrapper text only
- display projections
  - derive from canonical text and summary only

Forbidden shortcut:
- fixing library/chat/Kin separately without first naming the canonical text

Done when:
- one imported document has one canonical text authority
- library, GPT chat, and Kin outputs no longer disagree because they are built
  from different upstream variants

Recent progress:
- `lib/app/ingest/ingestDocumentModel.ts` now owns the canonical-document vs task-envelope split
- `fileIngestFlow` has started renaming `prepInput/sharedInfo` internals toward
  `taskPrepEnvelope` and `canonicalDocumentText` so authority is visible in code,
  not just in docs
- Drive import summary fallback now uses the same canonical summary helper as
  file ingest instead of a separate local fallback path
- file import and Drive import now share generated-summary resolution and ingest
  usage aggregation through `lib/app/ingest/importSummaryGeneration.ts`
- file import and Drive import now share stored ingested-document record
  construction through `buildIngestedDocumentRecord`
- app-side ingest modules now live under `lib/app/ingest/`
- send-to-GPT app-side modules now live under `lib/app/send-to-gpt/`
- memory-interpreter app-side modules now live under
  `lib/app/memory-interpreter/`
- GPT-memory app-side modules now live under `lib/app/gpt-memory/`
- task-draft app-side modules now live under `lib/app/task-draft/`
- task-runtime app-side modules now live under `lib/app/task-runtime/`
- Kin protocol core and sidecar modules now live under `lib/app/kin-protocol/`
- reference-library app-side modules now live under `lib/app/reference-library/`
- search-history app-side modules now live under `lib/app/search-history/`
- panel/UI state app-side modules now live under `lib/app/ui-state/`
- remaining app-side utility clusters now live under dedicated folders:
  `gpt-task/`, `youtube-transcript/`, `memory-rules/`, `multipart/`,
  `task-support/`, `google-drive/`, `auto-bridge/`, and `gpt-context/`
- task-domain modules now live under `lib/task/`
- memory-domain modules now live under `lib/memory-domain/`
- shared primitives now live under `lib/shared/`, and the search facade now lives under `lib/search-domain/search.ts`
- `/api/ingest` prompts now use one output authority per mode:
  - `compact` -> `kinCompact`
  - `detailed` -> `kinDetailed`
  - text-first PDF/image `max` -> `rawText`
- compact/detailed result selection no longer applies a second clipping pass to generated lines
- file, Drive, YouTube, search, and task snapshot library summaries now respect the shared library-card summary toggle
- file and Drive imports now emit visible GPT chat completion messages
- obsolete intermediate-budget ingest helpers were removed from `routeHelpers.ts`

Next ingest-specific work:
1. reduce remaining device-import vs Drive-import post-processing divergence
2. extract more shared post-request helpers only where duplication is proven live
3. keep ingest summary usage in the ingest bucket as new ingest-adjacent flows are added
4. consolidate device-file ingest UI into the library drawer/settings surfaces
5. implement Google Drive upload subfolder selection without creating a second ingest authority path
6. decide ZIP import scope only after the canonical ingest authority is stable

### Priority 3: Re-audit page-side composition before it regrows

Why third:
- `app/page.tsx` is thinner now, but the next risk is the broad workspace bundle flowing into page-side composition
- if ignored, the old giant-page problem will come back one hook later

Primary authority:
- `app/page.tsx`
- `hooks/useChatPagePanelsComposition.tsx`
- `hooks/useChatPageController.ts`
- `hooks/chatPageControllerCompositionBuilders.ts`
- `hooks/chatPagePanelCompositionBuilders.ts`
- `hooks/useChatPageControllerArgs.ts`
- `hooks/useChatPageGptPanelArgs.ts`
- `hooks/useChatPageKinPanelProps.ts`

Target responsibility split:
- `app/page.tsx`
  - state roots, hook calls, final render only
- `useChatPagePanelsComposition.tsx`
  - page-side composition only
- `useChatPageController.ts`
  - grouped domain action composition only
- composition builders
  - shape conversion only, no new authority

Mini phases:
1. inventory the current `ChatPageWorkspaceViewArgs` bundle by domain
2. remove any fields that are only pass-through noise
3. stop builder files from quietly owning business decisions
4. decide whether controller composition should stay page-only or become an app-level controller boundary

Done when:
- a new feature can identify one clear place for page composition work
- builders stop becoming hidden policy owners

### Priority 4: Unify responsive and panel-mode authority

Why fourth:
- recent regressions showed that layout mode, device heuristics, and panel toggles are still too loosely coupled
- touch PCs and narrow desktop windows should not accidentally fall through to phone-only behavior

Primary authority:
- `hooks/useResponsive.ts`
- `components/panels/kin/KinPanel.tsx`
- `components/panels/gpt/GptPanel.tsx`
- page/controller hooks that choose active panel or panel-mode state

Target responsibility split:
- device / viewport detection
- layout mode decision
- panel visibility / tab state

Mini phases:
1. map every place that decides `isMobile`, single-panel mode, or active tab defaults
2. reduce duplicate heuristics
3. add explicit tests for touch desktop, narrow desktop, and phone

Done when:
- "why did this become mobile UI?" has one answer path
- connection / drawer toggle behavior does not depend on hidden device heuristics

### Priority 5: Keep text and settings ownership boring

Why fifth:
- label regressions have been frequent, but ownership is now much better
- the goal here is to keep that progress stable instead of letting ad-hoc strings creep back in

Primary authority:
- `components/panels/gpt/gptSettingsText.ts`
- `components/panels/gpt/gptUiText.ts`
- `components/panels/kin/kinUiText.ts`
- `components/panels/kin/kinManagementText.ts`
- high-churn settings / toolbar / drawer components

Mini phases:
1. finish normalizing garbled but still live text constants
2. remove display-side emergency overrides once source text is safe to edit directly
3. keep adding narrow UI regression tests for user-facing labels that drift often

Done when:
- user-facing labels have one obvious owner
- copy fixes do not require hunting across multiple panels and helper files

## File Responsibility Table

Use this table before editing. If a change would cross multiple rows, pause and split the work.

| Domain | Source of truth | Should own | Should not own |
| --- | --- | --- | --- |
| Task intent discovery | `lib/task/taskIntent.ts`, `lib/task/taskIntentFallback.ts` | candidate extraction and approval-aware interpretation | transport assembly, UI field sync |
| Task runtime state | `lib/task/taskProtocolTaskState.ts`, `hooks/useKinTaskProtocol.ts` | task lifecycle state and protocol transitions | panel rendering or ad-hoc string formatting |
| Task draft sync | `hooks/useTaskDraftHelpers.ts` | editable page draft projection | intent classification or Kin send policy |
| Kin task transport | `lib/app/task-runtime/kinTaskFlow.ts`, `lib/app/task-runtime/kinTransferFlows.ts` | compiled SYS block delivery and injection | deciding what the task means |
| Topic fallback | `lib/app/memory-interpreter/memoryInterpreterFallbackOrchestrator.ts` | approved-fragment shortcut and LLM fallback orchestration | broad entry-side pre-classification |
| Page composition | `app/page.tsx`, `hooks/useChatPagePanelsComposition.tsx` | state roots and final composition | hidden business policy |
| Controller composition | `hooks/useChatPageController.ts` | grouped domain action composition | page render concerns or raw panel formatting |
| Responsive mode | `hooks/useResponsive.ts` | viewport/device heuristics | protocol or task policy |
| Text ownership | `components/panels/gpt/gptSettingsText.ts`, `components/panels/gpt/gptUiText.ts`, `components/panels/kin/kinUiText.ts`, `components/panels/kin/kinManagementText.ts` | labels, user-facing copy, formatting helpers | runtime flow decisions |

## Phase Plan

### Phase 1: Foundation
Goal:
- reduce change impact
- extract services from oversized files
- introduce tests around brittle protocol and memory logic

Current scope:
- docs
- `app/api/chatgpt/route.ts` service extraction
- `app/page.tsx` / controller thinning
- protocol / task / multipart / memory test coverage

### Phase 2: Ingest Generalization
Goal:
- evolve ad-hoc ingest flows into a reusable ingest pipeline

Planned scope:
- `IngestJob`
- `IngestItem`
- source adapters
- progress UI

### Phase 3: Proposal Workflow Hardening
Goal:
- make Kin-originated task / knowledge proposals safer and easier to audit

Planned scope:
- `ProtocolAction`
- `ExecutionBudget`
- approval workflow
- audit log

### Phase 4: Shared Workspace
Goal:
- prepare shared state for future multi-Kin collaboration

Planned scope:
- `Workspace`
- `SharedArtifact`
- `HandoffRecord`
- role / handoff rules

### Phase 5: Kin-first UI
Goal:
- move toward a Kin-first workspace with GPT as a backoffice layer

Planned scope:
- Kin-centered workspace UI
- GPT settings / audit / operations backoffice

## Progress

### 1. Docs
Status: In progress

Done:
- `README.md`
- `docs/architecture.md`
- `docs/domain-model.md`
- `docs/refactor-roadmap.md`
- `docs/protocol-actions.md`
- `docs/ingest-pipeline.md`
- `docs/workspace-model.md`

Next:

### 2. Page / UI Thinning
Status: Partially done

Done:
- `GptSettingsDrawer` split
- `ReceivedDocsDrawer` cleanup
- part of `app/page.tsx` orchestration extraction
- `panelPropsBuilders.ts` now absorbs pending-injection progress, task-draft field callbacks, and settings count clamping
- `useTaskDraftWorkspace.ts` now absorbs task-draft slot state and navigation from `app/page.tsx`
- `app/page.tsx` effect / hook inputs now call hooks directly after removing no-op passthrough builder layers
- no-op page action / panel passthrough builders were removed after they stopped carrying real authority
- `chatPageActionTypes.ts` now owns the shared page-action type contracts that other hooks and memory modules depend on
- `useChatPageController.ts` now composes grouped domain action sets (`kin` / `gpt` / `task` / `protocol` / `memory`) through smaller controller hooks instead of delegating through an extra facade hook
- `useChatPageController.ts` now owns the page-level wiring between chat actions, protocol automation, and panel reset actions
- `useChatPageControllerArgs.ts`, `useChatPageKinPanelProps.ts`, and `useChatPageGptPanelArgs.ts` now own the controller/panel argument assembly that previously lived inline in `app/page.tsx`
- `useChatPagePanelsComposition.tsx` now owns the final page-side controller + panel composition, so `app/page.tsx` no longer instantiates `useChatPageController`, `KinPanel`, `GptPanel`, or `buildGptPanelProps(...)` directly
- workspace view-args assembly with panel refs now also lives inside `useChatPagePanelsComposition.tsx`, so `app/page.tsx` only passes grouped workspace state/actions/services plus refs instead of constructing final composition view args itself
- `useChatPageReferenceDomain.ts` now owns the multipart/stored-document/reference-library/Google-Drive page-side composition, so `app/page.tsx` no longer wires that reference domain inline
- `useChatPageTaskProtocolDomain.ts` now owns the memory-interpreter / GPT-memory / task-protocol / task-draft-helper page-side composition, so `app/page.tsx` no longer wires that domain inline
- `useChatPageUiState.ts` now owns the page-root chat/panel UI state and scroll wiring, so `app/page.tsx` no longer defines those state roots inline
- `useChatPageWorkspaceInputs.ts` now owns grouped workspace state/actions/services assembly, so `app/page.tsx` passes domain bundles instead of rebuilding the full workspace contract inline
- `chatPageWorkspaceCompositionTypes.ts` now re-exports domain-level workspace state/action/service aliases, and `useChatPageWorkspaceInputs.ts` now consumes those aliases instead of re-declaring the full contract locally
- `chatPageWorkspaceInputBuilders.ts` now builds workspace state/actions/services through domain-level sub-builders instead of one giant flat field map, so the builder layer stays shape-focused and easier to audit
- `chatPageWorkspaceCompositionBuilders.ts` and `chatPagePanelCompositionBuilders.ts` now also assemble view/panel args through smaller section builders, keeping page-side composition closer to pure shape conversion instead of one large projection block
- `useChatPageControllerArgs.ts` and `chatPageControllerArgBuilders.ts` now assemble controller-side grouped inputs through smaller section builders as well, so controller composition stays focused on shape conversion instead of one inline projection block
- `chatPageControllerCompositionTypes.ts` now exposes section-level controller aliases, and `chatPagePanelCompositionTypes.ts` now depends on those narrower aliases instead of repeatedly reaching through the full controller composition type
- `chatPagePanelCompositionTypes.ts` now also splits `ChatPageWorkspaceViewArgs` into section-level aliases, and `chatPageWorkspaceCompositionTypes.ts` now builds on those aliases instead of indexing through one monolithic workspace-view type everywhere
- `chatPagePanelCompositionBuilders.ts` now shares one panel-base projection plus GPT references projection helpers instead of repeating the same workspace reshaping across both panel builders
- `useChatPageController.ts` now assembles the grouped controller return through one helper, keeping the hook focused on domain-action wiring rather than inline return-shape construction
- `useChatPagePanelsComposition.tsx` now consumes page workspace groups directly and owns task-snapshot glue itself, so the no-op passthrough hooks `useChatPagePanelsView.tsx` and `useChatPageWorkspaceView.tsx` were removed
- `chatPageControllerCompositionTypes.ts` and `chatPagePanelCompositionTypes.ts` now split the old page-composition type hub by authority boundary instead of keeping controller and panel contracts in one file
- `chatPageControllerCompositionBuilders.ts` and `chatPagePanelCompositionBuilders.ts` now split workspace reshaping into controller-side and panel-side builders, making the remaining page composition path easier to audit
- persisted page-side settings hooks now load storage through lazy initializers instead of mount-only `setState`, reducing React 19 `set-state-in-effect` debt across the page path
- protocol default text is now centralized in `kinProtocolText.ts`, and protocol migration now auto-repairs stale legacy / mojibake saved defaults before they reappear in settings or task flows
- legacy `SYS_KIN_RESPONSE` guidance is now migrated to the requested `KIN_RESPONSE` format while the Kin send flow still accepts old replies for compatibility
- `page -> controller` action wiring now crosses the boundary as grouped `identity / uiState / task / protocol / search / services` args, and controller-side domain hooks now consume those grouped sources directly without a broad flatten step
- `chatPageControllerArgBuilders.ts` now owns the sub-hook input reshaping that used to sit inline in `useChatPageController.ts`
- `useChatPageMessagingDomainActions.ts` now owns the GPT / Kin controller-side composition, allowing the thin wrappers `useChatPageGptActions.ts` and `useChatPageKinActions.ts` to be removed
- `useChatPageTaskDomainActions.ts` now owns the task / protocol / file-ingest controller-side composition, allowing the thin wrappers `useChatPageTaskActions.ts` and `useChatPageProtocolActions.ts` to be removed
- `useChatPagePanelDomainActions.ts` now owns protocol automation + panel reset composition, so `useChatPageController.ts` no longer wires those effects/actions inline
- `usePendingMemoryRuleQueue.ts` now owns the memory-rule candidate merge policy instead of leaving that closure inline in `app/page.tsx`
- `useTaskProtocolProjection.ts` and `useArchiveCompletedTaskResults.ts` now own page-facing task-protocol projection and completed-task archive lifecycle glue
- GPT settings now have a separate full-area workspace path with 3 icon entry points while the existing hanging drawers remain in place
- GPT chat scroll position is now preserved when switching into and back out of the settings workspace
- `KinPanel` now receives direct render props from `app/page.tsx`; its thin builder layer was removed
- `GptPanel` now has a formal split between:
  - `BuildGptPanelArgs` for section-grouped builder input
  - `GptPanelProps` for section-only rendering
- GPT drawer consumers now depend on section contracts instead of broad `GptPanelProps` picks where possible
- GPT settings rules / protocol UI is now split into dedicated section modules plus shared settings primitives, so `GptSettingsSections.tsx` no longer carries those two large blocks inline
- `useGptMemory.ts` reduced to a smaller orchestration hook
- `memoryInterpreter.ts` reduced through staged helper extraction
- rejected memory-rule candidates now trigger immediate memory reapplication so tentative wrong topics can be cleared
- task drawer now supports approval-driven `SYS_TASK` drafting where count / limit candidates are approved separately and reflected immediately into both the Kin draft and task-progress action items
- task-progress view now supports direct user-side clear / archive when a drafted task should not proceed

Next:
- review whether `useChatPageController.ts` should stay as a thin page-only hook or become a wider `useChatAppController`
- review whether the remaining `app/page.tsx` orchestration should stay as explicit `useChatPagePanelsComposition(...)` source groups or move further behind page-facing composition hooks
- decide whether pure-transfer GPT panel sections (`protocol` / `references` / parts of `settings`) should eventually be assembled outside `panelPropsBuilders`
- review whether the remaining memory-rule / task coordination should move behind a narrower controller boundary
- keep task-progress lifecycle controls (`start / archive / selection / approval refresh`) concentrated in the task protocol controller boundary instead of regrowing in `useChatPageController.ts` or page-level UI code

### 2.5. Task Protocol Hook Thinning
Status: In progress

Primary file:
- [`hooks/useKinTaskProtocol.ts`](../hooks/useKinTaskProtocol.ts)

Done:
- protocol ingest extraction
- empty runtime / requirement merge extraction
- pending-answer / finalize mutation extraction
- task start / replace-current-intent state builder extraction
- task recompile source-of-truth fallback is now centralized so approval refresh uses one `originalInstruction -> draft -> goal` rule
- `taskIntent` regression coverage now targets the live fallback/shortcut path directly, and old test-only public shortcut helpers were removed from the module surface
- compiled Kin task multipart/input preparation now flows through one transport helper instead of being rebuilt inline inside approval refresh and task-start flows
- approval-driven current-task refresh now has an explicit `resolve intent` step and a separate `apply runtime/draft/transport` step inside the flow
- `useTaskProtocolActions.ts` now routes approve/update/delete through one shared current-task refresh helper instead of rebuilding the same refresh call three times
- approved-candidate normalization now lives behind a task-intent-domain helper instead of being rebuilt inline inside UI flow code
- `useTaskProtocolActions.test.ts` now locks the refresh boundary for approve/update/delete, including the `originalInstruction -> draft -> goal` source fallback order
- approved-phrase collection transforms (`approve` / `update` / `delete`) now live in the task-intent domain instead of `miscUiFlows.ts`
- current-task refresh orchestration now lives in its own app-flow module (`currentTaskIntentRefresh`) instead of sharing a general UI flow file
- task draft protocol sync now uses a shared draft-projection helper and shared param type instead of rebuilding the projection shape inline inside the hook
- task runtime start/replace now share one prompt-artifact helper for title / compiled prompt / requirement-progress generation instead of duplicating that assembly
- `useKinTaskProtocol.ts` now routes most runtime mutations through shared commit/mutate helpers instead of repeating `runtime + snapshots` update wiring inline
- archive fallback selection now has a pure helper in `taskRuntimeCollection.ts`, with tests covering active-task and non-active-task archive behavior
- page composition now attaches panel scroll refs through a workspace-composition builder helper instead of doing a final inline `ui` spread in `app/page.tsx`
- `useChatPagePanelsComposition.tsx` no longer returns an unused controller object, and task-snapshot save glue now lives behind panel-composition builders with regression tests
- single-panel layout authority now routes through `usePanelLayout.ts` and `lib/app/ui-state/panelLayout.ts`, so page-level active-panel normalization and action-side panel focusing no longer each own their own mobile checks
- protocol automation, stored-document loading, multipart restore, file-ingest Kin focus, and GPT/Kin transfer flows now depend on shared `focusKinPanel` / `focusGptPanel` callbacks instead of scattering `if (isMobile) setActiveTab(...)`
- task/protocol flows and `sendToGpt` arg builders now use the same shared panel-focus callbacks, and responsive tests now pin wide desktop, narrow desktop, and touch-desktop layout expectations
- page/composition contracts now name panel visibility state as `activePanelTab` / `setActivePanelTab`, so panel-level navigation is easier to distinguish from local drawer/settings tabs
- `useResponsive.ts` now documents that it only owns the single-panel-layout heuristic and must not choose which panel gets focus
- panel composition now names cross-panel actions as `onSwitchToKinPanel` / `onSwitchToGptPanel`, reducing ambiguity with unrelated local `activeTab` setters inside drawers and settings
- `app/test-task/page.tsx` now follows the same `usePanelLayout` / `isSinglePanelLayout` naming as the main page, so the sandbox panel route does not drift from production layout terminology
- `chatPageWorkspaceCompositionBuilders.ts` no longer keeps a private no-refs workspace shape plus a second refs wrapper; the final workspace view args are now built in one pass
- `useChatPageControllerArgs.ts` now consumes workspace view args directly, so controller composition no longer depends on a separate workspace-to-controller reshaping builder
- protocol automation labels now live in dedicated text-owner modules (`gptProtocolAutomationText.ts`, `gptUiTextOverrides.ts`), and the GPT toolbar's `データ取込` label is no longer hardcoded inline in the render path
- test coverage for parser, runtime, ingest, state, mutations, and task-state helpers
- task intent approval flow rebuilt toward:
  - LLM-primary candidate extraction
  - approved shortcut matching
  - immediate recompile / Kin draft sync after approval
- task-progress runtime now exposes direct archive support used by the progress UI clear button

Next:
- physically remove dead compatibility-era helpers from `lib/task/taskIntent.ts` so the active runtime path is easier to audit
- decide whether `addPendingRequest` should also move to a pure helper
- continue Priority 4 by deciding whether `useResponsive.ts` should stay heuristic-only or graduate into a broader layout-mode boundary with explicit narrow-desktop tests

### 3. Server Route Service Extraction
Status: In progress

Primary file:
- [`app/api/chatgpt/route.ts`](../app/api/chatgpt/route.ts)

Done:
- [`lib/server/chatgpt/openaiResponse.ts`](../lib/server/chatgpt/openaiResponse.ts)
  - `extractUsage`
  - `extractJsonObjectText`
  - `extractResponseText`
- [`lib/server/chatgpt/requestNormalization.ts`](../lib/server/chatgpt/requestNormalization.ts)
  - `resolveChatRouteMode`
  - `normalizeInstructionMode`
  - `normalizeReasoningMode`
  - `normalizeMemoryInput`
  - `normalizeChatMessages`
- [`lib/server/chatgpt/promptBuilders.ts`](../lib/server/chatgpt/promptBuilders.ts)
  - `buildInstructionWrappedInput`
  - `buildBaseSystemPrompt`
  - `buildSearchSystemPrompt`
- [`lib/server/chatgpt/openaiClient.ts`](../lib/server/chatgpt/openaiClient.ts)
  - `callOpenAIResponses`
  - `extractOpenAIJsonObjectText`
- [`lib/server/chatgpt/searchRequest.ts`](../lib/server/chatgpt/searchRequest.ts)
  - `resolveSearchRequest`
- [`lib/server/chatgpt/searchExecution.ts`](../lib/server/chatgpt/searchExecution.ts)
  - `executeSearchRequest`
  - normalization helpers
- [`lib/server/chatgpt/responseBuilders.ts`](../lib/server/chatgpt/responseBuilders.ts)
  - `buildChatRouteResponse`
  - `buildMapLinkShortcutResponse`
- [`lib/app/send-to-gpt/sendToGptTranscriptHelpers.ts`](../lib/app/send-to-gpt/sendToGptTranscriptHelpers.ts)
  - YouTube transcript request helper extraction
- [`lib/app/send-to-gpt/sendToGptFlowRequestPreparation.ts`](../lib/app/send-to-gpt/sendToGptFlowRequestPreparation.ts)
  - protocol limit resolution
  - combined `prepareSendToGptRequest` request-preparation step extracted from `sendToGptFlow.ts`
  - `buildPreparedRequestArtifacts` now isolates the pure request-ready enrichment step inside request preparation
- [`lib/app/send-to-gpt/sendToGptFlowRequestPayload.ts`](../lib/app/send-to-gpt/sendToGptFlowRequestPayload.ts)
  - chat API request payload builder
- [`lib/app/send-to-gpt/sendToGptFlowRequestText.ts`](../lib/app/send-to-gpt/sendToGptFlowRequestText.ts)
  - protocol override request-text builder
  - final request-text assembly
- [`lib/app/send-to-gpt/sendToGptFlowState.ts`](../lib/app/send-to-gpt/sendToGptFlowState.ts)
  - implicit search usage / context helper
  - protocol post-response side-effect helper
  - shared recent-message / previous-topic memory-update helpers
- [`lib/app/send-to-gpt/sendToGptFlowGuards.ts`](../lib/app/send-to-gpt/sendToGptFlowGuards.ts)
  - now grouped into pre-preparation and post-preparation gate pipelines for the main `sendToGpt` coordinator
- [`lib/app/send-to-gpt/sendToGptProtocolBuilders.ts`](../lib/app/send-to-gpt/sendToGptProtocolBuilders.ts)
  - protocol request / response block builders extracted from the former monolithic `sendToGptFlowHelpers.ts`
- [`lib/app/send-to-gpt/sendToGptFlowTypes.ts`](../lib/app/send-to-gpt/sendToGptFlowTypes.ts)
  - shared flow / helper protocol and artifact types extracted for reuse across `sendToGptFlow.ts` and helpers
- [`lib/app/send-to-gpt/sendToGptFlowContext.ts`](../lib/app/send-to-gpt/sendToGptFlowContext.ts)
  - protocol event / search-context derivation extracted from the former monolithic `sendToGptFlowHelpers.ts`
  - now internally split into protocol interaction extraction, protocol limit resolution, and derived search resolution helpers
  - [`lib/app/send-to-gpt/sendToGptText.ts`](../lib/app/send-to-gpt/sendToGptText.ts)
    - UTF-8-safe request text and task-info text helpers extracted so the main `sendToGpt` path no longer depends on mojibake-prone literals
  - [`lib/app/send-to-gpt/sendToGptFlowArgBuilders.ts`](../lib/app/send-to-gpt/sendToGptFlowArgBuilders.ts)
    - common `runSendToGptFlow` arg assembly extracted from `useGptMessageActions.ts`
  - [`lib/app/send-to-gpt/sendToGptFlowRequest.ts`](../lib/app/send-to-gpt/sendToGptFlowRequest.ts)
    - chat API request execution and assistant-artifact shaping extracted from the main `runSendToGptFlow` coordinator
  - [`lib/app/send-to-gpt/sendToGptFlowResponse.ts`](../lib/app/send-to-gpt/sendToGptFlowResponse.ts)
    - assistant response shaping, protocol wrapping, and protocol search-response artifacts extracted from the former monolithic `sendToGptFlowHelpers.ts`
  - [`lib/app/send-to-gpt/sendToGptFlowGuards.ts`](../lib/app/send-to-gpt/sendToGptFlowGuards.ts)
    - early-return gate handling extracted from the front half of `runSendToGptFlow`
  - [`lib/app/send-to-gpt/sendToGptFlowFinalize.ts`](../lib/app/send-to-gpt/sendToGptFlowFinalize.ts)
    - assistant finalize side effects, implicit search handling, and memory follow-up extracted from the back half of `runSendToGptFlow`
- [`lib/app/send-to-gpt/sendToGptFlow.ts`](../lib/app/send-to-gpt/sendToGptFlow.ts)
  - request / search / protocol / memory / UI args now grouped through shared flow-slice types
  - low-value request/finalize bundle staging was removed so the coordinator now passes prepared request data directly into `request` and `finalize`
- [`lib/app/memory-interpreter/memoryInterpreterText.ts`](../lib/app/memory-interpreter/memoryInterpreterText.ts)
  - shared text normalization / topic candidate helpers extracted from `memoryInterpreter.ts`
  - search-directive detection is now anchored to a UTF-8-safe shared prefix regex
- [`lib/app/memory-interpreter/memoryInterpreterTopicText.ts`](../lib/app/memory-interpreter/memoryInterpreterTopicText.ts)
  - shared topic-tail cleanup now keeps `memoryInterpreterText.ts` and `memoryInterpreterTopicExtractor.ts` aligned
- [`lib/app/memory-interpreter/memoryInterpreterTextPatterns.ts`](../lib/app/memory-interpreter/memoryInterpreterTextPatterns.ts)
  - shared acknowledgement lead-in and sentence-marker patterns extracted for reuse across memory text helpers
- [`lib/app/memory-interpreter/memoryInterpreterFacts.ts`](../lib/app/memory-interpreter/memoryInterpreterFacts.ts)
  - fact / preference / tracked-entity helpers extracted from `memoryInterpreter.ts`
- [`lib/app/memory-interpreter/memoryInterpreterWorks.ts`](../lib/app/memory-interpreter/memoryInterpreterWorks.ts)
  - active-document resolution and works-by-entity merge helpers extracted from `memoryInterpreter.ts`
- [`lib/app/memory-interpreter/memoryInterpreterContext.ts`](../lib/app/memory-interpreter/memoryInterpreterContext.ts)
  - context / goal / follow-up-rule helpers extracted from `memoryInterpreter.ts`
- [`lib/app/memory-interpreter/memoryInterpreterFallbackHelpers.ts`](../lib/app/memory-interpreter/memoryInterpreterFallbackHelpers.ts)
  - approved-rule matching and fallback prompt / JSON helpers extracted from `memoryInterpreter.ts`
- [`lib/app/gpt-memory/gptMemoryStorage.ts`](../lib/app/gpt-memory/gptMemoryStorage.ts)
  - local storage and kin-memory-map load/save helpers extracted from `useGptMemory.ts`
- [`lib/app/gpt-memory/gptMemoryCandidatePreparation.ts`](../lib/app/gpt-memory/gptMemoryCandidatePreparation.ts)
  - fallback evaluation, candidate filtering, and candidate-memory preparation extracted from `useGptMemory.ts`
- [`lib/app/gpt-memory/gptMemoryUpdateCoordinator.ts`](../lib/app/gpt-memory/gptMemoryUpdateCoordinator.ts)
  - summarize branch and finalized update orchestration extracted from `useGptMemory.ts`
- [`lib/app/gpt-memory/gptMemorySummaryResolution.ts`](../lib/app/gpt-memory/gptMemorySummaryResolution.ts)
  - summarized-state resolution extracted from `useGptMemory.ts`
- [`lib/app/gpt-memory/gptMemoryReapply.ts`](../lib/app/gpt-memory/gptMemoryReapply.ts)
  - approved-rule merge and reapplicable-recent selection extracted from `useGptMemory.ts`
- [`lib/app/gpt-memory/gptMemoryRegistry.ts`](../lib/app/gpt-memory/gptMemoryRegistry.ts)
  - kin-memory-map registry updates and memory-settings normalization extracted from `useGptMemory.ts`
- [`lib/app/send-to-gpt/sendToGptShortcutFlows.ts`](../lib/app/send-to-gpt/sendToGptShortcutFlows.ts)
  - inline URL shortcut helper is now on the main execution path
- redundant library response post-processing branches removed from `sendToGptFlow.ts`
- dead local inline search / URL helper functions removed from `sendToGptFlow.ts`
- low-risk unused imports in `sendToGptFlow.ts` cleaned as part of iterative polishing
- remaining dead inline URL fallback block removed from `sendToGptFlow.ts`
- request-start UI mutation, shared GPT assistant-message creation, and request-failure append logic now live in `sendToGptFlowState.ts`, leaving `sendToGptFlow.ts` closer to orchestration-only
- prepared-request limit-violation resolution and final-request-text assembly now live behind dedicated helpers in `sendToGptFlowRequestPreparation.ts`, so the remaining request-preparation path is easier to unit-test directly
- protocol request-answer parsing and AI continuation artifact assembly now live behind dedicated helpers in `sendToGptFlowContext.ts`, with direct tests covering REQ parsing, continuation-token/link selection, and protocol limit priority
- `preparedRequest` gate-time and execution-time projections now live behind dedicated helpers in `sendToGptFlowRequestPreparation.ts`, reducing deep property reads inside `sendToGptFlow.ts`
- `PreparedRequestGateContext` / `PreparedRequestExecutionContext` now live in shared `sendToGptFlowTypes.ts`, and the GPT request payload assembly is exposed via a public helper in `sendToGptFlowRequest.ts` for direct tests
- `PreparedRequestFinalizeContext` now carries the finalize-time subset into `sendToGptFlowFinalize.ts`, so `sendToGptFlow.ts` no longer manually fans out each finalize argument
- explicit search-usage replay and memory-follow-up summary handling now live behind dedicated helpers in `sendToGptFlowFinalize.ts`, so finalize reads more like orchestration than a mixed side-effect block
- task-directive, protocol-limit, and youtube-transcript gate projections now live behind dedicated helpers in `sendToGptFlowGuards.ts`, so `runPreparedRequestGates(...)` mostly coordinates decision-to-handler dispatch
- multipart-import and inline-URL pre-preparation projections now also live in `sendToGptFlowGuards.ts`, and `prepareSendToGptMemoryContext(...)` now bundles memory-context + request-memory setup for `sendToGptFlow.ts`
- ingest extraction shaping and GPT bridge-state updates now live behind dedicated helpers in `fileIngestFlow.ts`, with direct tests covering extracted-text normalization and `activeDocument` / recent-message bridge updates
- Kin injection block assembly and post-ingest prepared/deepened task-draft projection now also live behind dedicated helpers in `fileIngestFlow.ts`, reducing late-stage branching inside `runFileIngestFlow(...)`
- ingest summary-message assembly and attach-to-current-task input/draft projection also now live behind dedicated helpers in `fileIngestFlow.ts`, further shrinking the late-stage mixed string-building / draft-mutation block
- ingest transform resolution and auto-prep / auto-deepen orchestration now also flow through dedicated helpers in `fileIngestFlow.ts`, while keeping the existing fallback strings and branching behavior unchanged
- ingest-side GPT memory wiring now uses `KinMemoryState`-based runtime types instead of local `any` placeholders, tightening the `useFileIngestActions.ts` -> `fileIngestFlow.ts` boundary without changing behavior
- `useFileIngestActions.ts` now builds a dedicated `runFileIngestFlow(...)` arg bundle instead of expanding the full call inline, and task-draft GPT memory bridging now also uses `KinMemoryState`-based types instead of local `any` placeholders
- `useTaskDraftActions.ts` now builds dedicated flow-arg bundles through `taskDraftFlowArgBuilders.ts` instead of expanding every task-draft flow call inline
- task-draft flow request start, recent-message slicing, assistant-result bridging, and summary-usage replay now flow through shared helpers in `taskDraftFlowShared.ts`, with direct tests pinning the sequence
- prepared/deepened task-draft projection and library-source resolution now live in `taskDraftFlowProjection.ts`, reducing repeated `setCurrentTaskDraft(...)` shapes inside `taskDraftActionFlows.ts`
- task-draft title resolution and GPT/manual source builders now live in `taskDraftFlowResolvers.ts`, so `taskDraftActionFlows.ts` no longer owns those task-domain decisions inline
- `/api/ingest` now reads request/result normalization and line-budget helpers through shared `lib/server/ingest/routeHelpers.ts`, with direct tests covering output extraction, parsed-result normalization, and budget fallback behavior
- `/api/ingest` prompt assembly now lives in `lib/server/ingest/promptBuilder.ts`, with direct tests covering visual/text-mode prompt guidance
- `/api/ingest` selected-line / summary-level branching now also lives in `lib/server/ingest/resultSelection.ts`, so the route no longer owns the full result-budget decision tree inline
- `app/api/ingest/route.ts` itself is now aligned to helper-backed orchestration, with local parsing/budget/prompt duplication removed in favor of server helper modules
- legacy local helper block removed from `route.ts`
- `lib/app/ingest/ingestClient.ts` now owns shared `/api/ingest` request assembly, fetch, title resolution, and error resolution for file ingest and Drive import callers
- obsolete post-ingest task-update branches have now been removed from the active device-ingest path instead of being kept dormant behind hidden settings
- `docs/ingest-pipeline.md` now documents the current ingest boundaries so device import and Drive import do not drift into separate private helper stacks
- approved-candidate reapply now uses the same formal memory recomputation path as approved-rule reapply
- fallback debug payload is no longer persisted inside memory state, and the obsolete summary-merge branch `gptMemoryStateSummaryMerge.ts` has been removed so recent-message compaction now has one authoritative path
- `lib/memory-domain/memory.ts` now declares task-scoped memory keys explicitly and `gptMemoryStorage` clears task-scoped state through that shared lifecycle helper instead of a private local cleanup path
- `useMemoryInterpreterSettings.ts` now delegates rule-store persistence to `lib/app/memory-rules/memoryRuleStore.ts`, so interpreter settings, pending candidates, approved rules, and rejected signatures share one persistence boundary
- `useGptMemory.ts` now delegates runtime load/update/reapply orchestration to `lib/app/gpt-memory/gptMemoryRuntime.ts`, shrinking the hook toward a lifecycle facade and giving memory runtime handoff its own tested boundary
- `docs/memory-lifecycle.md` now fixes the intended split between stable memory, task-scoped memory, and displayed-context memory, and `lib/memory-domain/memory.ts` exposes matching lifecycle key lists
- token accounting now restores total-token aggregation, counts memory compaction inside conversation recent/cumulative usage, relabels the old summary line as compaction, and routes ingest-time summary generation usage into the ingest bucket
- closing-reply detection now uses a single source of truth
- chat topic adjudication flow was structurally rebuilt and reached a stable live-reviewed state
- task title auto-generation was rebuilt around a clean naming pipeline
- `currentTaskIntentRefresh.test.ts` now fixes the approval refresh path end-to-end at the flow boundary, covering LLM re-interpretation, runtime replace, task-draft sync, and Kin input refresh in one test

Next:
- keep `memoryInterpreter.ts` and `useGptMemory.ts` stable unless a correctness issue is found
- thin `app/page.tsx` by moving panel prop assembly and orchestration glue outward
- keep thinning `sendToGptFlowRequestPreparation.ts`, `sendToGptFlowState.ts`, and `sendToGptFlow.ts` so the remaining coordinator path stays easy to audit
- consider the next `sendToGptFlow` slice around request-text normalization or transcript request handling
- continue polishing the new GPT settings workspace and reduce duplication between it and the legacy settings drawer
- review `app/api/ingest/route.ts`, `hooks/useFileIngestActions.ts`, `hooks/useGoogleDrivePicker.ts`, and `lib/app/ingest/fileIngestFlow.ts` as the next ingest-side integration points
- periodically audit topic write authority and remove any newly regrown hidden mutation paths instead of layering blockers over them

### 4. Test Readiness
Status: In progress

Priority targets:
- protocol parser
- protocol runtime
- task intent parser
- multipart chunking
- progress counting principle
- YouTube URL / transcript handling
- prompt / response helpers
- memory helpers

Done:
- `Vitest` foundation
- [`vitest.config.ts`](../vitest.config.ts)
- [`lib/app/ui-state/panelPropsBuilders.test.ts`](../lib/app/ui-state/panelPropsBuilders.test.ts)
- [`lib/server/chatgpt/requestNormalization.test.ts`](../lib/server/chatgpt/requestNormalization.test.ts)
- [`lib/server/chatgpt/searchRequest.test.ts`](../lib/server/chatgpt/searchRequest.test.ts)
- [`lib/server/chatgpt/searchExecution.test.ts`](../lib/server/chatgpt/searchExecution.test.ts)
- [`lib/server/chatgpt/promptBuilders.test.ts`](../lib/server/chatgpt/promptBuilders.test.ts)
- [`lib/server/chatgpt/openaiResponse.test.ts`](../lib/server/chatgpt/openaiResponse.test.ts)
- [`lib/app/kin-protocol/kinMultipart.test.ts`](../lib/app/kin-protocol/kinMultipart.test.ts)
- [`lib/task/taskIntent.test.ts`](../lib/task/taskIntent.test.ts)
- [`lib/task/taskProgress.test.ts`](../lib/task/taskProgress.test.ts)
- [`lib/task/taskProgressPolicy.test.ts`](../lib/task/taskProgressPolicy.test.ts)
- [`lib/server/youtubeTranscriptHelpers.test.ts`](../lib/server/youtubeTranscriptHelpers.test.ts)
- [`lib/task/taskProtocolParser.test.ts`](../lib/task/taskProtocolParser.test.ts)
- [`lib/task/taskProtocolRuntime.test.ts`](../lib/task/taskProtocolRuntime.test.ts)
- [`lib/task/taskProtocolIngest.test.ts`](../lib/task/taskProtocolIngest.test.ts)
- [`lib/task/taskProtocolState.test.ts`](../lib/task/taskProtocolState.test.ts)
- [`lib/task/taskProtocolMutations.test.ts`](../lib/task/taskProtocolMutations.test.ts)
- [`lib/task/taskProtocolTaskState.test.ts`](../lib/task/taskProtocolTaskState.test.ts)
- [`lib/task/taskCompiler.test.ts`](../lib/task/taskCompiler.test.ts)
- [`lib/memory.test.ts`](../lib/memory.test.ts)
- [`lib/app/gpt-memory/gptMemoryStateHelpers.test.ts`](../lib/app/gpt-memory/gptMemoryStateHelpers.test.ts)
- [`lib/app/gpt-memory/gptMemorySummarizePolicy.test.ts`](../lib/app/gpt-memory/gptMemorySummarizePolicy.test.ts)
- [`lib/app/gpt-memory/gptMemoryPersistence.test.ts`](../lib/app/gpt-memory/gptMemoryPersistence.test.ts)
- [`lib/app/gpt-memory/gptMemoryFallback.test.ts`](../lib/app/gpt-memory/gptMemoryFallback.test.ts)
- [`lib/app/gpt-memory/gptMemoryApproval.test.ts`](../lib/app/gpt-memory/gptMemoryApproval.test.ts)
- [`lib/app/memory-interpreter/memoryInterpreterText.test.ts`](../lib/app/memory-interpreter/memoryInterpreterText.test.ts)
- [`lib/app/memory-interpreter/memoryInterpreterFacts.test.ts`](../lib/app/memory-interpreter/memoryInterpreterFacts.test.ts)
- [`lib/app/memory-interpreter/memoryInterpreterWorks.test.ts`](../lib/app/memory-interpreter/memoryInterpreterWorks.test.ts)
- [`lib/app/memory-interpreter/memoryInterpreterContext.test.ts`](../lib/app/memory-interpreter/memoryInterpreterContext.test.ts)
- [`lib/app/memory-interpreter/memoryInterpreterFallbackHelpers.test.ts`](../lib/app/memory-interpreter/memoryInterpreterFallbackHelpers.test.ts)
- [`lib/app/gpt-memory/gptMemoryStorage.test.ts`](../lib/app/gpt-memory/gptMemoryStorage.test.ts)
- [`lib/app/gpt-memory/gptMemoryCandidatePreparation.test.ts`](../lib/app/gpt-memory/gptMemoryCandidatePreparation.test.ts)
- [`lib/app/gpt-memory/gptMemoryUpdateCoordinator.test.ts`](../lib/app/gpt-memory/gptMemoryUpdateCoordinator.test.ts)
- [`lib/app/gpt-memory/gptMemorySummaryResolution.test.ts`](../lib/app/gpt-memory/gptMemorySummaryResolution.test.ts)
- [`lib/app/gpt-memory/gptMemoryReapply.test.ts`](../lib/app/gpt-memory/gptMemoryReapply.test.ts)
- [`lib/app/gpt-memory/gptMemoryRegistry.test.ts`](../lib/app/gpt-memory/gptMemoryRegistry.test.ts)
- [`hooks/useMemoryRuleActions.test.ts`](../hooks/useMemoryRuleActions.test.ts)

Next:
- task budget tests
- more pure-helper extraction around `sendToGptFlowRequestPreparation` / `sendToGptFlowState` / `app/page.tsx` / ingest flow
- add narrow tests around task-intent approval sync and task-progress archive / clear behavior if those surfaces change again
- add docs for protocol actions and ingest pipeline before larger phase-2 work
- composition regrow prevention now has narrow workspace section tests, and `sendToGptFlow` has step builders so the main flow stays orchestration-focused
- `sendToGptFlow.ts` now builds shared step args and a prepared phase bundle through `sendToGptFlowStepBuilders.ts`, with narrow tests pinning the top-level coordinator handoff so pre-gate, prepared-request, execution, and finalize stages do not regrow inline shape conversion
- `sendToGptFlowRequestPreparation` / `sendToGptFlowState` now delegate section shaping to dedicated builders, with narrow tests around prepared-request sections and implicit-search / memory state builders
- `sendToGptFlowResponse` / `sendToGptFlowFinalize` now also use dedicated builders for response shaping and finalize side-effect args, keeping both files orchestration-focused
- `sendToGptFlowContext` / `sendToGptFlowRequest` now route protocol/search derivation and request payload shaping through dedicated builders, with narrow tests around context derivation and request payload args
- protocol block generation now shares common line/block builders across `taskRuntimeProtocol` and `sendToGptProtocolBuilders`, with narrow tests to keep wrapper/field formatting stable
- `app/api/chatgpt/route.ts` now dispatches to mode-specific server handlers, while route builders own search payload / OpenAI message assembly / summarize prompt construction
- `openaiClient` / `openaiResponse` now route request/response shape conversion through dedicated builders, with narrow tests for payload/result assembly and response extraction
- `app/api/task/route.ts` and `app/api/kindroid/route.ts` now dispatch into dedicated server handlers, while task / Kindroid request-shaping and response-shaping live in focused route builders with narrow regression tests
- `app/api/ingest/route.ts` now delegates orchestration to a dedicated server handler with focused ingest response/request builders, and `gptTaskClient` now routes upload-kind detection, prep-envelope shaping, and `/api/task` payload assembly through shared pure builders
- `ingestClient` now routes shared request-form assembly, fallback title/error extraction, and option bundling through dedicated builders, while `fileIngestFlow` consumes that shared ingest boundary directly instead of hand-casting option bags
- `fileIngestFlow` now consumes a dedicated `fileIngestFlowBuilders` helper module for extraction / transform / bridge / task-update shaping, so the main flow path is less tied to inline helper implementations even before the remaining local helper bodies are fully removed
- `fileIngestFlow` helper regression tests now target `fileIngestFlowBuilders` directly, reducing the remaining coupling that needs to be unwound before the duplicate helper bodies in `fileIngestFlow.ts` can be removed safely
- `fileIngestFlow.ts` now re-exports its public helper surface from `fileIngestFlowBuilders`, so external consumers already see the builder-backed boundary while the remaining legacy helper bodies stay temporarily parked for deletion in a follow-up cleanup
- `fileIngestFlow.ts` has now dropped those parked legacy helper bodies and unused helper imports entirely, leaving the runtime flow and public helper surface anchored directly on `fileIngestFlowBuilders`
- `ingestDocumentModel.ts` now owns shared stored-document normalization, override application, ingested/Kin document record shaping, and reference-library document item shaping; `useStoredDocuments.ts`, file ingest, and Drive import now consume shared extraction/document helpers instead of separate fallback paths
- `useReferenceLibrary.ts` now builds document-backed library items through the shared ingest document model, and `useGoogleDrivePicker.ts` now derives stored import text from the same ingest extraction builder used by file ingest, reducing the remaining summary/text authority split between device imports, Drive imports, and library projection
- `librarySummaryClient` now lives under `lib/app/reference-library/` and routes request-body assembly, response parsing, error-message resolution, and usage normalization through dedicated client builders, while `app/api/library-summary/route.ts` now delegates prompt/request normalization and success shaping to focused server-side library summary handlers/builders
- `app/api/link-preview`, `app/api/url-card`, and `app/api/youtube-transcript` now follow the same thin-route pattern, with shared HTML metadata parsing plus dedicated route builders/handlers owning URL validation, source shaping, transcript candidate selection, and success/fallback payload assembly
- `serpApiClient` now routes SerpAPI URL construction and error-message shaping through dedicated builders, and the YouTube transcript app helpers now share a single `youtubeTranscriptBuilders` boundary for transcript cleaning, excerpting, Kin block creation, and success/failure artifact shaping
- `searchService` now routes engine-plan selection, continuation-token extraction, and final merged payload shaping through dedicated builders, while `sendToGptTranscriptHelpers` now delegates YouTube URL parsing and transcript success/failure artifact shaping to focused helper builders instead of carrying that logic inline
- `search-domain/normalizers.ts` now delegates engine-specific payload shaping and merged payload assembly to dedicated normalizer builders, while `sendToGptYoutubeFlow.ts` now routes transcript request context, request-body assembly, document-record shaping, assistant message shaping, and failure state shaping through focused flow builders
- the individual search-domain engine modules now route Google / News / Maps / Local / AI Mode / YouTube request argument assembly through shared engine request builders, leaving each engine file closer to pure fetch/enrichment orchestration
- `search-domain/extractors.ts` now delegates HTML stripping / line scoring / snippet selection to dedicated extractor builders, and Google / News engine enrichment now shares focused enrichment builders instead of duplicating raw-result slicing and snippet-seed shaping inline
- `useTaskProtocolActions.ts` and `useKinTransferActions.ts` now build task-intent sync and Kin transfer handoff through shared `taskRuntimeActionBuilders.ts`, with narrow tests pinning source-instruction resolution, pending-intent merge policy, and the shared flow-arg bundles so task runtime / Kin injection transport stays out of the page-side hooks
- `useTaskDraftHelpers.ts` now routes draft mutation, prefixed-field parsing, character-constraint resolution, and base-text selection through shared `taskDraftActionBuilders.ts`, while `currentTaskIntentRefresh.ts` now delegates refresh gating and draft/Kin apply shaping to dedicated builders so the remaining task runtime refresh path reads as orchestration rather than mixed projection logic
- `useResponsive.ts` now routes mobile-user-agent detection, touch-capability detection, and effective-width selection through shared `lib/app/ui-state/responsiveLayout.ts` helpers, with direct tests pinning mobile UA, touch desktop, and narrow-width single-panel behavior
- `GptSettingsWorkspace.tsx` now delegates its large approval, ingest, and Google Drive sections to `GptSettingsWorkspaceSections.tsx`, reducing the chance that the workspace root regrows into another mixed UI/policy hub
- `taskDraftActionFlows.ts` now acts as a thin export surface while prep/update/latest-GPT, attach-library, and deepen flows live in dedicated `taskDraft*Flows.ts` modules backed by shared `taskDraftActionFlowTypes.ts`
- `chatPageWorkspaceInputBuilders.ts` now acts as a thin export surface while state/actions/services assembly lives in dedicated workspace builder modules, reducing the chance that one file silently becomes the next page-side policy hub
- `sendToGptFlowHelpers.test.ts` is now split by concern, with response/protocol coverage moved to `sendToGptFlowResponseBuilders.test.ts` and state/finalize coverage moved to `sendToGptFlowStateBuilders.test.ts`, leaving the remaining helper test file focused on gate/step/request builder phases
- GPT settings workspace sections are now split again into `GptSettingsApprovalSections.tsx` and `GptSettingsLibrarySections.tsx`, so approval workflows and library/ingest controls no longer share one section hub by default
- `taskDraft*Flows.ts` now share recent-message context and success-postlude helpers through `taskDraftFlowShared.ts`, reducing repeated assistant-append and summary-replay logic across prep/update/attach/deepen orchestration
- `sendToGptFlow` guard coverage now lives in `sendToGptFlowGuards.test.ts`, so guard failures are diagnosed separately from step/request builder regressions
- Google Drive library export now lets the user choose a child folder under the configured parent before upload, and Drive folder indexing now includes per-entry timestamps, file sizes, and importable-item counts through `googleDrivePickerBuilders.ts`

## Next Review Points
At the start of each new refactor step, review these files first:

1. `app/api/chatgpt/route.ts`
2. `app/page.tsx`
3. `lib/app/send-to-gpt/sendToGptFlowRequestPreparation.ts` / `lib/app/send-to-gpt/sendToGptFlowState.ts` / `lib/app/send-to-gpt/sendToGptFlow.ts`

## Working Agreement
For each refactor step:

1. share the files to be touched before editing
2. keep the change small and phase-based
3. stop after each mini-phase
4. run typecheck and tests
5. update docs / roadmap as progress changes

## Success Condition
This roadmap is successful when future contributors can answer, at any time:

- what has already been stabilized
- what is currently being refactored
- what remains risky
- what should be done next

That visibility is part of the maintainability work itself.
