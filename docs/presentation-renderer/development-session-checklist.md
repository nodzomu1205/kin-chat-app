# PPT Development Session Checklist

Updated: 2026-05-06

## Purpose

Use this checklist at the start, during, and end of each PPT-generation
development session. The goal is to keep the session goal, implementation work,
verification, and next-session handoff tied to one stable record instead of
rebuilding the checklist from memory in chat.

This checklist complements
[`ppt-output-review-checklist.md`](./ppt-output-review-checklist.md):

- `ppt-output-review-checklist.md` is for reviewing a generated design/PPTX.
- this document is for managing the development session around that review.

## Session Setup

Before code changes:

1. Record the session development goal.
2. Record the concrete user-visible failure or improvement target.
3. Identify the canonical path to trace, such as:
   - task prompt
   - task route
   - parser
   - plan normalization
   - visual slot matching
   - frameSpec generation
   - render route
   - renderer
   - generated PPTX artifact
4. Check relevant docs:
   - `docs/engineering-judgment-policy.md`
   - `docs/presentation-renderer/ppt-output-review-checklist.md`
   - latest dated handoff
5. Search for old routes, bypasses, and fallback wiring in the touched area
   before editing.

## During Implementation

For each issue:

1. State which layer actually caused the observed behavior.
2. Prefer fixing the canonical route over adding a fallback branch.
3. If a fallback or repair path is unavoidable, document:
   - the primary route failure mode
   - why the repair is structural rather than a semantic guess
   - which test proves it does not hide the failure
4. Add or update a narrow regression test for the touched boundary.
5. Keep old replaced routes removed to the root owner where practical.
6. Update `ppt-output-review-checklist.md` when a new output-review criterion is
   discovered.

## Closeout Checklist

Before asking the user for another live generation or closing the session:

1. Compare the latest generated design text, chat output, and PPTX artifact
   against `ppt-output-review-checklist.md`.
2. Record which checklist items passed, failed, or were intentionally accepted
   as next-edit guidance.
3. Search touched areas for:
   - old image-ID planning routes
   - obsolete fallbacks
   - old 3-image / 4-block truncation
   - duplicate completion logic
   - hidden policy in builder glue
4. Run the maximum practical local verification:
   - focused app tests for touched planning/render route code
   - focused renderer tests for touched renderer code
   - `npx tsc --noEmit`
   - `npm run check:utf8` when docs or Japanese-facing text changed
   - `npm run lint`
   - `npm run build`
5. Update docs with:
   - session goal
   - implementation summary
   - code areas touched
   - verification results
   - remaining issues and next session plan
6. Commit only after the above is recorded.

## 2026-05-06 Session Record

### Development Goal

Stabilize PPT design/PPTX generation so a cotton supply-chain deck can be
generated with:

- complete body slideFrames
- deterministic image-library selection through visual slots
- visible match scores and unresolved slots
- adaptive text/image layouts
- usable multi-image process slides
- visual title cover image handling
- clear next actions when suitable images are missing

### Main Implementation Work

- Replaced direct LLM image-ID planning with visual-slot planning and
  deterministic app-side image matching.
- Added selected/unresolved image match reports with score and threshold.
- Repaired incomplete `slideFrames` handling so declared body slide count and
  key message count do not collapse into one or two generated slides.
- Expanded adaptive text-main and adaptive visual-main paths to carry up to six
  selected images where text-safe layout allows it.
- Updated renderer layout scoring so text remains the priority while the
  remaining right/bottom space is used more effectively.
- Added compact in-image labels for selected visuals.
- Ensured `visualTitleCover` can reuse the representative resolved body image
  asset when the cover visual request is cloned from the body slide.
- Added canonical output-review and session-development checklists under
  `docs/presentation-renderer/`.

### Code Areas Touched

- task prompt / protocol:
  - `lib/task/taskProtocol.ts`
  - `lib/task/taskCompilerSections.ts`
  - `types/task.ts`
- task route and repair:
  - `app/api/task/route.ts`
  - `lib/server/task/routeBuilders.ts`
  - `lib/server/task/routeHandlers.ts`
- presentation planning and normalization:
  - `lib/app/presentation/presentationTaskPlanning.ts`
  - `lib/app/presentation/presentationPlanValidation.ts`
  - `lib/app/presentation/presentationSlideFrames.ts`
  - `lib/app/presentation/presentationVisualSelection.ts`
  - `lib/app/presentation/presentationImageLibrary.ts`
- render route / image assets:
  - `app/api/presentation-render/route.ts`
  - `lib/server/presentation/imageGeneration.ts`
  - `lib/server/presentation/frameSpecImages.ts`
- renderer:
  - `kin-presentation-renderer/src/rendererV2.ts`
  - `kin-presentation-renderer/src/schema.ts`
- docs:
  - `docs/presentation-renderer/ppt-output-review-checklist.md`
  - `docs/presentation-renderer/development-session-checklist.md`
  - `docs/HANDOFF-2026-05-05.md`

### Verification Completed

Focused verification run during the session:

- presentation/task route focused tests: passed
- visual selection / planning / generated image collection tests: passed
- rendererV2 tests: passed
- `npx tsc --noEmit`: passed
- `npm run check:utf8`: passed
- `npm run lint`: passed
- `npm run build`: passed

Latest user-provided deck check:

- generated PPTX: `ppt_motsjm2h_trn8tg_20260506082542.pptx`
- total slides: 7
- body slides: 5
- cover slide image relationships: 1
- body slide image relationships: 3, 3, 0, 0, 1
- closing slide image relationships: 0

The `visualTitleCover` issue observed earlier is fixed in this latest artifact:
the cover slide now has one image relationship.

### Accepted Current Limitations

- Some nearest-available library image matches may still be imperfect. In the
  latest cotton deck, Slide 2 selected a retail/store image for an upstream
  label. This is accepted for now as a replaceable image-library match, but it
  remains a watch item.
- All-unresolved visual slots are acceptable when they clearly tell the user
  what visual should be inserted later. They should support later asset
  replacement or image generation instead of being treated as a failed deck.

### Next Session Plan

Continue PPT-generation development with a different source/material set.

Primary goals:

1. Re-run behavior review against `ppt-output-review-checklist.md` using a new
   topic and different available assets.
2. Validate the unresolved-visual workflow as an intentional next-action path.
3. Design and test a smoother way to insert later user-provided images or
   generated images into existing PPTX/design slots.
4. Fine-tune image matching only where it repeatedly selects clearly wrong
   nearest matches, without over-restricting the matcher so useful approximate
   images disappear.
5. Keep checking for old fallback/bypass regrowth before each change.
