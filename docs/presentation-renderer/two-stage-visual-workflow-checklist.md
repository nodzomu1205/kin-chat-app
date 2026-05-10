# Two-Stage Visual Workflow Checklist

Updated: 2026-05-08

## Purpose

Use this checklist while splitting PPT design generation into:

1. a simple editable design stage
2. a later visual-resolution stage

The main safety rule is: do not break the current renderer boundary. The
renderer already handles three valuable states well:

- no images, with visual placeholders
- some resolved images and some unresolved placeholders
- fully resolved image-library/API visuals

## Required Pre-User Verification Gate

User live testing is expensive in time, attention, and tokens. Do not ask for a
manual browser/Vercel/PPTX retest until every practical local check has been
run for the touched PPT workflow. For PPT design / Resolve visuals / library
image selection / PPTX output changes, the minimum gate is:

1. inspect the full path, not only the edited helper:
   design generation -> visible design text -> action link/draft command ->
   Resolve visuals -> image selection/deselection -> saved structured plan ->
   chat display with previews -> frameSpec -> PPTX render request -> renderer
   package output.
2. add or update narrow regression tests for the boundary that failed.
3. run focused PPT tests covering the touched path.
4. run `npm test` for the app before claiming broad local confidence.
5. run `npm test --prefix kin-presentation-renderer` when PPTX rendering,
   frameSpec, image hydration, or layout-facing data may be affected.
6. run `npx tsc --noEmit`, `npm run check:utf8`, and `npm run build`.
7. only then ask for user live testing, and state any remaining unautomated
   boundary plainly.

Never treat user live testing as the first regression detector for a PPT flow.
If a fix changes a format or address such as `Slide N / block X / slot Y`,
audit every parser, command-draft helper, library insertion helper, formatter,
and display preview path that consumes that format.

## Regression Lessons From 2026-05-08

Keep the two-stage PPT workflow simple:

- Stage 1 is editable design JSON. It must keep complete `deckFrame +
  slideFrames` and must not be overwritten by incomplete update output.
- Stage 2 is visual slot resolution. Resolve only unresolved slots. If every
  opening/body visual slot is already selected, reopening Resolve visuals must
  display current selections without calling the visual-normalization LLM.
- A block can contain multiple slots, but each slot is a single image decision.
  Selecting one slot must not duplicate that image into sibling slots.
- Visual label edits must reach the renderer boundary. If a saved design edit
  changes a visual slot label while preserving an existing image ID, rebase the
  selected match label/need onto the updated slot metadata so PPTX captions use
  the new label.
- Do not repair simple layout behavior by adding broad update-prompt pressure.
  `adaptiveVisualMain` and `adaptiveTextMain` are renderer/normalization
  invariants; `/ppt Document ID + comment` is a local saved-plan update.

Required regression coverage for future changes in this area:

1. incomplete `/ppt Document ID + comment` update result does not overwrite a
   saved plan.
2. fully resolved opening/body visuals do not call the visual-normalization
   endpoint when Resolve is reopened.
3. one selected slot in a multi-slot block persists only that selected image.
4. saved-plan label edits preserve selected image IDs and update the PPTX
   boundary label.

## Renderer Boundary Guardrails

| No | Check | Code verification | Test / artifact verification | Status |
|---:|---|---|---|---|
| 1 | `frameSpec` remains the canonical renderer input | Confirm `buildFramePresentationSpecFromTaskPlan` remains the only app-side bridge into frame-native PPT output | Existing render flow tests plus `npm run build` | Passed |
| 2 | Placeholder rendering remains valid with no resolved images | Confirm visual blocks may carry prompt/label without `preferredImageId` or `asset` | User confirmed image-free PPTX output works | Passed |
| 3 | Mixed resolved/unresolved visuals remain valid | Confirm only selected visual blocks hydrate `asset.base64`; unresolved blocks are left without `asset` | Flow tests verify selected IDs hydrate; unresolved visuals remain placeholders | Passed |
| 4 | `asset.base64` is not saved in PPT design documents | Confirm `structuredPayload` stores IDs/visual intent, not hydrated asset bytes | Save/plan-library tests and code scan | Passed |
| 5 | Hydration happens only at render time | Confirm library image bytes are attached only for render/PPT output | Render flow/library PPT tests | Passed |
| 6 | Image-free PPT output remains a first-class path | Confirm creating PPT without resolving visuals still renders placeholders | User confirmed placeholder PPTX output remains useful | Passed |
| 7 | Unresolved visuals are not treated as errors | Confirm render flow does not fail because a visual block lacks selected image IDs | Mixed render path covered by flow tests and manual review | Passed |

## Stage 1: Simple Editable PPT Design

Goal: the first PPT design document is short and editable. It describes visual
intent but does not select images.

| No | Check | Code verification | Test / artifact verification | Status |
|---:|---|---|---|---|
| 8 | Visible design text shows visual prompt | Formatter includes `visualRequest.prompt` or equivalent visual prompt text; generation constraints require non-empty prompts | Planning formatter + constraints test | Passed |
| 9 | Visible design text shows in-image display label | Formatter includes the label/brief that will appear inside the visual placeholder/image; generation constraints require labels | Planning formatter + constraints test | Passed |
| 10 | Visible design text hides visual type | Formatter no longer prints visual type in the user-facing Stage 1 design text | Snapshot/string test | Passed |
| 11 | Visible design text hides visual slots | Formatter does not print `Visual slots` in Stage 1 | Snapshot/string test | Passed |
| 12 | Visible design text hides image match scores | Formatter does not print match score lines in Stage 1 | Snapshot/string test | Passed |
| 13 | Visible design text hides Image ID | Formatter does not print `Image ID` in Stage 1 unless showing a resolved visual-review view | Snapshot/string test | Passed |
| 14 | Visible design text hides candidate Image IDs | Formatter does not print `Candidate image IDs` in Stage 1 | Snapshot/string test | Passed |
| 15 | Visible design text hides visual usage policy | Formatter does not print usage policy in Stage 1 | Snapshot/string test | Passed |
| 16 | Internal plan may still hold visual intent | Parser/normalizer keeps enough prompt/label information to build placeholders later | Plan round-trip test | Passed |
| 17 | User edits to prompt/label survive save/reload | Editing and saving a design preserves prompt/label in `structuredPayload` | Library save/reload and Save-source tests | Passed |

## Stage 1 Action Menu

Goal: the design document ends with stable actions that work from chat and from
library display.

| No | Check | Code verification | Test / artifact verification | Status |
|---:|---|---|---|---|
| 18 | Design text includes `Save` action | Action is emitted with a stable command/action payload, not only decorative text | Action rendering test | Passed |
| 19 | Design text includes `Save and create PPT` action | Action saves the current plan and renders image-free or currently-resolved PPT output | Flow test | Passed |
| 20 | Design text includes `Resolve visual blocks` action | Action starts the visual-resolution workflow for the document ID | Flow/parser test | Passed |
| 21 | Actions remain valid after library save | Library `[show]` output preserves actionable commands or structured action metadata | Library display test and user confirmation | Passed |
| 22 | Action text does not depend on stale chat-only state | Actions can reconstruct required document ID from saved plan/library item or recent structured PPT design message | Library/recent flow test | Passed |
| 23 | Old image render command is deprecated safely | `/ppt ... Images: on, library/API/hybrid` no longer conflicts with the new resolve workflow | Command parser test | Passed |

## Stage 2: Resolve Visual Blocks

Goal: users choose images only after the editable design is stable.

| No | Check | Code verification | Test / artifact verification | Status |
|---:|---|---|---|---|
| 24 | Resolve view lists every visual block | Resolver enumerates all visual blocks across body and relevant bookend slides | Visual selection + flow tests | Passed |
| 25 | Each entry shows slide/block address | Output uses stable labels like `Slide 1 / block 2` and `Opening slide / visual` | Resolver output tests | Passed |
| 26 | Each entry shows visual prompt | Resolve view shows the prompt from Stage 1 | Resolver output tests and user confirmation | Passed |
| 27 | Each entry shows display label | Resolve view shows the in-image label/brief from Stage 1 | Resolver output tests and user confirmation | Passed |
| 28 | Automatic library candidates are scored | App-side matcher can show candidate image IDs/titles and scores in the resolve view; Japanese school/exam visual needs expand into English metadata terms; preview image markdown is emitted when local image bytes are available | Visual selection + message rendering tests | Passed |
| 29 | Candidate clicks append command lines | Clicking a candidate appends or updates `Slide N / block X: img_...` in the input | Command draft merge test | Passed |
| 30 | Manual library selection appends address only | Manual option presets `Slide N / block X:` without guessing an image ID | Command draft merge test | Passed |
| 31 | Multiple visual choices accumulate | Selecting several blocks builds one command with multiple slide/block lines | Command draft merge test | Passed |
| 32 | Existing selections are displayed | Previously selected image IDs appear as selected state when reopening resolve view | Resolver state test and user confirmation | Passed |
| 33 | `off` clears a block selection | Command parser accepts `Slide N / block X: off` and clears IDs for that visual block | Parser/update path checked | Passed |
| 34 | Re-resolving only changes addressed blocks | Applying a resolve command does not rewrite unrelated slide text or visuals | Plan update tests cover opening/body preservation | Passed |
| 35 | Multiple IDs set multi-image policy | Multiple image IDs on one line produce `candidateImageIds` and appropriate usage policy | Plan update path checked | Passed |
| 36 | Slot-level selections stay isolated | Selecting one slot in a multi-slot block stores only that slot's image and does not duplicate it into sibling slots | `presentationGptFlow.test.ts` | Passed |
| 37 | Fully resolved plans do not rerun visual LLM | Reopening Resolve visuals for a fully selected opening/body plan shows current selections without calling the visual-normalization endpoint or charging task usage | `presentationGptFlow.test.ts`; user confirmed live behavior | Passed |
| 38 | API generation is intentionally deferred | The current stable Resolve flow uses image-library selection or unresolved placeholders; direct API image generation inside Resolve is future work only if explicitly requested | Code search confirms no active Resolve-to-API branch | Deferred |

## Create PPT After Resolution

Goal: PPT output uses resolved images where available and placeholders elsewhere.

| No | Check | Code verification | Test / artifact verification | Status |
|---:|---|---|---|---|
| 39 | `Save and create PPT` saves before render | Flow persists the current plan before rendering | Flow test | Passed |
| 40 | Render sends only required image bytes | Request payload includes only IDs referenced by the current frameSpec | Payload-focused flow tests | Passed |
| 41 | Render compresses large library images | Large images are optimized for PPT transfer without modifying stored originals | Vercel 413 repair verified by user | Passed |
| 42 | Image-free render still works after Stage 1 | Unresolved Stage 1 design can render directly with placeholders | User confirmed placeholder PPTX output | Passed |
| 43 | Mixed render works after partial resolution | Some resolved images render while unresolved blocks remain placeholders | Flow tests and user review | Passed |
| 44 | Fully resolved render works | All selected visuals hydrate and appear in PPTX | User confirmed final visual PPTX quality | Passed |
| 45 | Cover visual behavior remains intact | `visualTitleCover` opening image is independently selectable and preserved through later body selections | Flow regression tests and user confirmation | Passed |
| 46 | Updated labels reach PPTX boundary | `/ppt Document ID + comment` edits can change visual labels while preserving selected image IDs; renderer-facing `brief` uses the updated label | `presentationGptFlow.test.ts`; user confirmed live label display | Passed |
| 47 | PPTX response stays below Vercel limits | Route does not echo image content base64 in JSON | Vercel live retry passed | Passed |
| 48 | PPTX request stays below Vercel limits | Render request uses required/optimized assets only | Vercel live retry passed | Passed |

## Deprecated / Removed Command Paths

| No | Check | Code verification | Test / artifact verification | Status |
|---:|---|---|---|---|
| 49 | Old `Images: on, library` direct render is removed or redirected | Parser/flow no longer treats this as the primary image-selection path | Command parser test | Passed |
| 50 | Old `Images: on, API` direct render is removed or redirected | API generation is entered through Resolve visual blocks or explicit image generation action | Command parser test | Passed |
| 51 | Old `Images: on, API, library` hybrid shortcut is removed or redirected | Hybrid behavior does not bypass Stage 2 review | Command parser test | Passed |
| 52 | Deprecated commands produce neutral guidance | If old commands are used, they do not trigger image render or direct edit paths | Flow/parser test | Passed |
| 53 | `titleLineFooter` suppresses redundant headings | When a slide title and first text/list heading are effectively the same, renderer input sets `showHeading: false` | Planning test + build | Passed |
| 54 | PPT direct-edit approval UI is removed | Library settings no longer imports or renders the retired PPTX direct-edit approval queue | Build + reference scan | Passed |
| 55 | `visualTitleCover` participates in Resolve visuals | Opening cover visual is listed, auto-matched, manually selectable, saved, and hydrated like body visual blocks | Visual selection + flow tests | Passed |

## Verification Log

Record each implementation pass here.

| Date | Scope | Code verification | Tests / build | Manual result | Notes |
|---|---|---|---|---|---|
| 2026-05-06 | Checklist created | No product code changed | Not run | N/A | Starting point for two-stage visual workflow |
| 2026-05-06 | Stage 1 display + action links + initial Resolve flow | Formatter hides image-selection metadata while keeping prompt/label; initial PPT generation no longer auto-selects images; message links can draft/run `/ppt` commands; Resolve view can propose/apply library IDs; old `Images: on` render shortcuts route to Resolve instead of direct image render | `npm test -- lib/app/presentation/presentationTaskPlanning.test.ts lib/app/presentation/presentationCommandParser.test.ts lib/app/presentation/presentationVisualSelection.test.ts lib/app/presentation/presentationGptFlow.test.ts components/message/MessageContent.test.tsx`; `npm test -- lib/app/task-draft/taskDraftPrepFlows.test.ts lib/app/task-draft/taskDraftDeepenFlows.test.ts lib/app/task-draft/taskDraftAttachFlows.test.ts lib/app/send-to-gpt/sendToGptPreparedGateHandlers.test.ts`; `npm run build`; `npm run check:utf8` | Later confirmed in the 2026-05-07 live test | API generation inside Resolve was intentionally left out of the stable path |
| 2026-05-06 | Save/Save and create repair | `Save` can persist an unsaved recent PPT design from structured message metadata; `Save and create PPT` saves before render and writes latest PPTX back to the saved document; constraints now require visual prompts and labels | `npm test -- lib/app/presentation/presentationGptFlow.test.ts lib/app/presentation/presentationTaskPlanning.test.ts`; broader PPT/task focused test set; `npm run build`; `npm run check:utf8` | Manual browser retry pending | Existing already-rendered messages from before this fix may need regeneration because they did not carry structured plan metadata |
| 2026-05-06 | Resolve command accumulation + candidate previews | Candidate/manual links now merge into the current `/ppt Resolve visuals` draft for the same document instead of replacing it; repeated clicks update/add slide-block lines; Resolve output includes markdown image previews for matched images when local image bytes are available | `npm test -- lib/app/presentation/presentationTaskPlanning.test.ts lib/app/presentation/presentationCommandParser.test.ts lib/app/presentation/presentationCommandDraft.test.ts lib/app/presentation/presentationVisualSelection.test.ts lib/app/presentation/presentationGptFlow.test.ts components/message/MessageContent.test.tsx lib/app/task-draft/taskDraftPrepFlows.test.ts lib/app/task-draft/taskDraftDeepenFlows.test.ts lib/app/task-draft/taskDraftAttachFlows.test.ts lib/app/send-to-gpt/sendToGptPreparedGateHandlers.test.ts`; `npm run build`; `npm run check:utf8` | Manual browser retry pending | Preview images depend on the image asset still being present in local IndexedDB |
| 2026-05-06 | Resolved-image render repair | Normal `Create PPT` now auto-enables library hydration when the frameSpec contains selected `preferredImageId`/`candidateImageIds`; resolved designs visibly show `選択済み画像` lines | Same focused PPT/task test set; `npm run build`; `npm run check:utf8` | Manual PPTX image smoke pending | Root cause was route stripping visual assets whenever `generateImages` was false |
| 2026-05-06 | Japanese visual matching + render message cleanup | Japanese school/exam/study visual needs now add English matcher terms so existing image metadata can match again; PPTX-created chat message no longer prints selected image IDs, generated image IDs, scores, or per-slide match details | `npm test -- lib/app/presentation/presentationTaskPlanning.test.ts lib/app/presentation/presentationCommandParser.test.ts lib/app/presentation/presentationCommandDraft.test.ts lib/app/presentation/presentationVisualSelection.test.ts lib/app/presentation/presentationGptFlow.test.ts lib/app/presentation/presentationGptPrompts.test.ts components/message/MessageContent.test.tsx lib/app/task-draft/taskDraftPrepFlows.test.ts lib/app/task-draft/taskDraftDeepenFlows.test.ts lib/app/task-draft/taskDraftAttachFlows.test.ts lib/app/send-to-gpt/sendToGptPreparedGateHandlers.test.ts`; `npm run build`; `npm run check:utf8` | Manual Resolve smoke pending | Root cause for zero auto matches was Japanese visual-slot text not overlapping English image metadata terms |
| 2026-05-06 | Resolve label preservation | Applying `Resolve visuals` now starts from the same visual-slot-resolved plan used by the Resolve view, so the prompt/label shown during selection is the prompt/label saved back into the PPT design and used by PPTX render | `npm test -- lib/app/presentation/presentationGptFlow.test.ts`; focused PPT/task test set; `npm run build`; `npm run check:utf8` | Manual browser retry pending | Regression test confirms the original broad label is not restored after manual image selection |
| 2026-05-06 | Selected-image previews in design/resolve | The chat-rendered PPT design after `Resolve visuals` appends local image previews after selected image IDs when image bytes are available; reopening Resolve for a selected block now shows `currently selected images` instead of replacing them with automatic candidates | `npm test -- lib/app/presentation/presentationGptFlow.test.ts`; focused PPT/task test set; `npm run build`; `npm run check:utf8` | Manual browser retry pending | Stored PPT design text still keeps stable image IDs only; previews are generated at chat-display time from local image assets |
| 2026-05-07 | Library saved-plan actions | Re-saving a PPT design updates the existing presentation-plan library card instead of creating a duplicate; library `[show]` uses the saved structured plan and appends selected-image previews; library `[PPT]` hydrates selected library images for PPTX output and leaves unresolved visuals as placeholders | `npm test -- lib/app/presentation/presentationGptFlow.test.ts`; focused PPT/library test set; `npm run build`; `npm run check:utf8` | Manual browser retry pending | Library card rendering now uses `structuredPayload` as the authoritative plan when available |
| 2026-05-07 | Save guard for library previews | Display-only PPT design previews that cannot recover `slideFrames`/`slides` are ignored as Save sources, and library `[show]` messages carry the saved structured plan in message metadata | `npm test -- lib/app/presentation/presentationGptFlow.test.ts`; focused PPT/library test set; `npm run build`; `npm run check:utf8` | Manual browser retry pending | Prevents a `[show]` preview from overwriting a complete saved PPT design with an incomplete text-only parse |
| 2026-05-07 | Resolve-result Save image retention | `Resolve visuals` result messages now carry the updated structured PPT plan in message metadata, so pressing `Save` from that displayed design preserves selected `preferredImageId` and `candidateImageIds` | `npm test -- lib/app/presentation/presentationGptFlow.test.ts`; focused PPT/library test set; `npm run build`; `npm run check:utf8` | Manual browser retry pending | Regression test covers Resolve -> Save retaining selected image IDs |
| 2026-05-07 | Save source requires slideFrames | Recent message text parsed into legacy `slides` is no longer accepted as a Save overwrite source; only structured/frame-native `slideFrames` plans may update an existing PPT design card | `npm test -- lib/app/presentation/presentationGptFlow.test.ts`; focused PPT/library test set; `npm run build`; `npm run check:utf8` | Manual browser retry pending | Prevents selected image IDs from being dropped by a text-only legacy slide parse |
| 2026-05-07 | Saved structured plan precedence | Library lookup now prefers `structuredPayload.slideFrames` over any parsed `excerptText`, so stale/display-only text cannot mask selected `preferredImageId`/`candidateImageIds` stored in the card | `npm test -- lib/app/presentation/presentationPlanLibrary.test.ts lib/app/presentation/presentationGptFlow.test.ts`; focused PPT/library test set; `npm run build`; `npm run check:utf8` | Manual browser retry pending | This is the authoritative fix for Save/PPT paths reading saved cards with selected images |
| 2026-05-07 | Two-stage route finalized + titleLineFooter heading cleanup | Parser now keeps only Save / Save and create PPT / Resolve visual blocks / Resolve visuals as active PPT menu commands; old image-mode, preview, direct-edit, and PPT-frame command entry points are no longer wired; `titleLineFooter` hides redundant slide-block headings at renderer-boundary time | `npm test -- lib/app/presentation/presentationGptPrompts.test.ts lib/app/presentation/presentationGptFlow.test.ts lib/app/presentation/presentationCommandParser.test.ts lib/app/presentation/presentationTaskPlanning.test.ts`; `npm run build` | Manual browser retry pending | Image hydration still remains render-time only; placeholder and selected-image paths are unchanged |
| 2026-05-07 | Retired direct-edit approval + cover Resolve visuals | Removed PPTX direct-edit approval hook/module/tests and library settings UI; removed task direct-edit prompt/client path; `visualTitleCover` opening visuals now appear in Resolve visual blocks and accept `Opening slide / visual: img_...` selections | `npm test -- lib/app/presentation/presentationVisualSelection.test.ts lib/app/presentation/presentationGptFlow.test.ts lib/app/presentation/presentationCommandParser.test.ts`; `npm run build` | Manual browser retry pending | Reference scan across `components hooks lib types` shows no remaining direct-edit symbols |
| 2026-05-07 | Final Save/recent sync + cleanup pass | PPT command assistant messages now update `recentMessages`, so Resolve -> Save uses the newly selected opening/body images even before library props refresh; deprecated direct-edit symbols were re-scanned; docs updated to make two-stage workflow the main path | `npm test -- lib/app/presentation/presentationGptFlow.test.ts lib/app/presentation/presentationCommandDraft.test.ts lib/app/presentation/presentationVisualSelection.test.ts`; `npm run build`; final cleanup scans | User confirmed all current PPT behavior is良好 | Search found no live DirectEdit/PptDirectEdit/presentationDirectEdit code paths; remaining `generateImages/imageMode` are render payload fields, not old user commands |
| 2026-05-08 | PPT visual slot stabilization and regression recovery | Restored simple invariants after repeated regressions: incomplete saved-plan update output no longer overwrites existing `slideFrames`; fully resolved opening/body visuals do not rerun visual-normalization LLM; adaptive visual-main text is renderer-boundary body text; selected image IDs are preserved while updated visual labels are rebased into `selectionMatches` and PPTX-facing `brief`; one selected slot in a multi-slot block persists only that slot image | `npm test -- lib/app/presentation/presentationGptFlow.test.ts lib/app/presentation/presentationTaskPlanning.test.ts lib/app/presentation/presentationPlanValidation.test.ts lib/app/presentation/presentationRenderE2e.test.ts`; `npm test --prefix kin-presentation-renderer -- src/rendererV2.test.ts`; `npx tsc --noEmit`; `npm test`; `npm test --prefix kin-presentation-renderer`; `npm run check:utf8`; `npm run build` | User confirmed `/ppt Document ID` update preserves JSON, fully resolved Resolve visuals no longer consumes LLM time/tokens, and edited labels display in PPTX. Multi-slot duplicate-image fix is locally tested but pending future manual confirmation with another deck. | Do not reintroduce broad update-prompt pressure for simple layout invariants. Keep Stage 1 design JSON, Stage 2 slot selection, and renderer boundary separate. |
| 2026-05-10 | Library edit sync + maintenance closeout | Presentation-plan library edit text now syncs opening-slide titles, visual prompts, visual label changes, and intentional visual-label deletion back into structured JSON while preserving selected image IDs; chat `[show]` display, frameSpec projection, and PPTX output all observe hidden visual labels through `renderStyle.hiddenLabelSlotIds`; visual edit merge and legacy slide display helpers were split into smaller modules | `npm test -- lib/app/presentation/presentationPlanTextEditSync.test.ts lib/app/presentation/presentationTaskPlanning.test.ts lib/app/reference-library/presentationPlanPptxActions.test.ts`; `npm test -- lib/app/presentation/presentationTaskPlanning.test.ts`; `npm run build` | User confirmed edited Opening slide title, visual label edit/deletion, JSON reflection, PPTX output, and library show display all worked well | Treat library text, structured JSON, chat display, frameSpec, and renderer output as separate projections. A fix is incomplete until the intended projection chain is synchronized. |
