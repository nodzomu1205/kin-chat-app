# PPT Output Review Checklist

Updated: 2026-05-07

## Purpose

Use this checklist before asking the user to run another live `/ppt` generation
or before claiming that PPT design / PPTX output is fixed.

This document is the canonical checklist for the current PPT design and
renderer stabilization work. Do not replace it with an ad hoc checklist in chat.
When a new regression is found, add or revise an item here and note which local
test or artifact inspection covers it.

## Review Order

Trace issues in this order and record which layer was actually observed:

1. image-library candidate context
2. LLM presentation plan JSON
3. task route completeness repair
4. plan parsing
5. slideFrame normalization
6. visual slot matching
7. frameSpec generation
8. generated image collection / chat response
9. renderer layout
10. PPTX XML / media relationships
11. visual review of the actual PPTX

## Checklist

| No | Area | Check | Pass condition | Local verification |
|---:|---|---|---|---|
| 1 | Plan JSON | PPT design JSON exists | `slideFrames` is present and the design text does not show "未生成" | `presentationTaskPlanning.test.ts` |
| 2 | Plan JSON | Body slide count is complete | `slideFrames.length` is at least the larger of `deckFrame.slideCount` and `keyMessages.length` | `routeBuilders.test.ts`, `routeHandlers.test.ts` |
| 3 | Plan JSON | Incomplete plan does not become 500 | If the second LLM completion is still incomplete, deterministic structural completion repairs missing body `slideFrames` and revalidates | `routeHandlers.test.ts` |
| 4 | Plan JSON | Completion does not shrink coverage | Repair must not reduce `keyMessages`, `extractedItems`, or declared slide count merely to pass validation | `routeBuilders.test.ts` |
| 5 | Slide count | Natural deck granularity is preserved | A multi-topic source is not collapsed into one or two body slides; process groups, context, risks, and responses remain represented | prompt/schema inspection plus design text review |
| 6 | Language | User/source language is preserved | Summary, extracted items, key messages, slide titles, headings, body text, labels, and list items use the user/source language unless explicitly requested otherwise | `taskProtocol.test.ts`, design text review |
| 7 | Canonical source | Frame JSON is authoritative | User-facing design text is derived from canonical `slideFrames`; free-form slide text is not the primary source | `presentationTaskPlanning.test.ts` |
| 8 | Legacy path | Old slideDesign / parts paths do not regain authority | Compatibility parsing may exist only as fallback for old documents, not as the main generated route | code search + parser tests |
| 9 | Image selection | LLM does not select stored image IDs | Presentation planning describes `visualSlots`; it does not output `preferredImageId` / `candidateImageIds` chosen by the LLM | `taskProtocol.test.ts`, `presentationVisualSelection.test.ts` |
| 10 | Image selection | Deterministic matcher selects stored assets | App-side matcher maps `visualSlots` to image metadata and writes selected/unresolved matches with scores | `presentationVisualSelection.test.ts` |
| 11 | Image selection | Score and threshold are visible | Chat output shows selected/unresolved status, score, threshold, image ID where applicable, and selected image summary | `presentationGptFlow.test.ts` |
| 12 | Image selection | Weak matches stay unresolved | Below-threshold matches are not silently substituted with unrelated available images | `presentationVisualSelection.test.ts`, chat output review |
| 13 | Image selection | Selected images match requested visible subjects | For each selected image, the visible subject aligns with the slot need, not just the broad slide theme | design text + chat output + image metadata review |
| 14 | Image labels | Labels describe selected image content | Labels are not process labels that contradict the actual selected image | `presentationTaskPlanning.test.ts`, design text review |
| 15 | Image labels | Label is not narrower than selected visual | A slot covering agriculture plus primary processing must not be labeled only as agriculture if a gin image may be selected | prompt inspection + output review |
| 16 | Image labels | Single-image labels are not overbroad | A one-image visual uses the selected slot label where available, not a broad multi-subject visual overview | `presentationTaskPlanning.test.ts` |
| 17 | Image labels | Repeated generic captions are gone | Multiple images do not all show one generic caption unrelated to each image | output review |
| 18 | Image order | Multi-image order follows text order | When slide text lists upstream/midstream/downstream or process steps, selected images follow that order | `presentationVisualSelection.test.ts`, output review |
| 19 | Image reuse | Duplicate image use is allowed but visible | Reuse is acceptable, but repeated use should be intentional or forced by limited library coverage, not hidden by labels | chat output review |
| 20 | Image availability | Gaps remain explicit | Missing concepts such as maps, certification labels, or traceability diagrams remain unresolved rather than being filled by weak photos | chat output review |
| 21 | Visual blocks | Multi-image candidates are not capped at three | Text-main and visual-main paths can carry up to six selected image blocks where the text-safe layout can fit them | `presentationTaskPlanning.test.ts`, `rendererV2.test.ts` |
| 22 | Visual blocks | No old four-block truncation in adaptive text-main | `text + up to 6 visuals` is not cut by `slice(0, 4)` in adaptive text-main normalization or frameSpec conversion | code search + `presentationTaskPlanning.test.ts` |
| 23 | Layout | Text priority comes first | The renderer must not force all images in if that makes text unreadable or overly compressed | `rendererV2.test.ts`, visual review |
| 24 | Layout | Text box aspect ratio is adaptive | The renderer evaluates text box width/height candidates and uses the text-safe shape that leaves useful remaining space | `rendererV2.test.ts` |
| 25 | Layout | Right / bottom / grid options are compared | Adaptive text-main does not behave like a fixed right-grid layout; it may choose right, bottom, or grid according to content | `rendererV2.test.ts` |
| 26 | Layout | Six-image case can use right-side space | If text fits in a left compact box, six supporting images can occupy the right-side grid instead of being truncated to three | `rendererV2.test.ts`, PPTX review |
| 27 | Layout | Dense text can reject right-side compression | When text needs more space, the renderer should choose a wider text box or bottom visuals rather than over-compressing text | `rendererV2.test.ts` |
| 28 | Layout | Single contained image top-aligns | Single contained body images align near the text top/content top rather than floating vertically centered | `rendererV2.test.ts`, PPTX review |
| 29 | Layout | Text and images do not overlap | Geometry and actual PPTX rendering keep text boxes and images separate | `rendererV2.test.ts`, PPTX visual review |
| 30 | Layout | Right-side whitespace is used when appropriate | Slide types with right visual space do not leave avoidable empty right-side area when text can safely narrow | `rendererV2.test.ts`, PPTX visual review |
| 31 | Layout | Image labels do not alter layout spacing | Labels render inside/over the image area and do not create external spacing shifts | `rendererV2.test.ts`, PPTX review |
| 32 | Layout | Image label height is compact | Label boxes remain short enough not to dominate the image; long labels are truncated | `rendererV2.test.ts`, PPTX review |
| 33 | Layout | Adaptive visual-main handles multiple visuals | Visual-main slides with multiple visual blocks render multiple images, not only the first image | `rendererV2.test.ts` |
| 34 | Bookends | visualTitleCover receives a representative image | Cover slides using `visualTitleCover` include a representative image when body visuals exist | `presentationTaskPlanning.test.ts`, `frameSpecImages.test.ts`, `rendererV2.test.ts` |
| 35 | Bookends | Cover image treatment is applied | Cover image fits the slide frame and uses the expected transparent treatment | `rendererV2.test.ts`, PPTX review |
| 36 | Bookends | Summary closing is not duplicated | If the final body slide is already summary-like, closing slide should be a simple `endSlide` | `presentationTaskPlanning.test.ts` |
| 37 | Generated images | Chat image list is complete | Generated image collection includes cover, body, and closing assets where present | `frameSpecImages.test.ts` |
| 38 | Generated images | Unresolved slots do not create fake assets | Unresolved visual slots are reported as unresolved and do not produce image relationships | `rendererV2.test.ts`, chat output review |
| 39 | PPTX artifact | Expected image relationships exist | PPTX slide relationship files contain the expected image relationship count for cover/body slides | `rendererV2.test.ts`, PPTX XML inspection |
| 40 | Schema | FrameSpec validates after normalization | Block counts and layout IDs survive schema parsing without silently dropping content | `presentationSlideFrames.test.ts` where available, `presentationTaskPlanning.test.ts` |
| 41 | Obsolete paths | Replaced routes are removed, not hidden | Old fallback / bypass routes are removed to the root owner when practical and not merely ignored downstream | code search + focused tests |
| 42 | Obsolete paths | No old Image ID planning route remains | There is no live route where the LLM directly decides stored image IDs during presentation planning | code search + `taskProtocol.test.ts` |
| 43 | Obsolete paths | No old 3-image / 4-block policy remains in candidate flow | Remaining `slice(0, 4)` uses must be unrelated to adaptive image candidate capacity, such as two-by-two grid rendering or summary item limits | code search with explanation |
| 44 | Encoding | No mojibake in user-facing output | PPT design text and prompt-facing strings contain no mojibake in newly touched user-facing files | `npm run check:utf8` when Japanese text is edited |
| 45 | Verification | Focused tests cover the touched boundary | Every change to planning, matching, generated image collection, route repair, or renderer layout has a narrow regression test | test run log |
| 46 | Verification | Type, lint, build pass | `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass before asking for user retest | command results |
| 47 | Verification | Renderer dist is rebuilt | After renderer changes, `npm run build --prefix kin-presentation-renderer` has run, or root `npm run build` has rebuilt it | command results |
| 48 | Manual review | Design text, chat output, and PPTX agree | The visible design document, chat image report, and PPTX artifact describe the same slides/images | manual comparison |
| 49 | Manual review | New issues are classified by layer | Any remaining defect is recorded against the observed layer in the review order, not patched only at the visible symptom | review note |
| 50 | Documentation | Checklist changes are persisted | If this checklist changes, update this file rather than replacing it with an inconsistent chat-only list | git diff |
| 51 | Unresolved visuals | All-unresolved visual-main slides remain actionable | If every visual slot on a visual-main slide is unresolved, the design/PPTX should clearly indicate what visual should be inserted later, preserving a clean replacement target for user-provided assets or image generation rather than silently substituting weak library images | PPTX text inspection + future replacement-flow regression |
| 52 | Visual type consistency | Diagram requests are not misrepresented | If a slide asks for a diagram but only photos are available, the design should make that limitation explicit: either keep an unresolved diagram/replacement target or label the selected photos as supporting references, not as a completed diagram | design text + chat output + frameSpec review |
| 53 | Entity-specific slots | Unsupported country/location-specific visual slots remain useful | If visual slots assert countries or locations not supported by image metadata, they may remain unresolved when that gives the user a clear next action: provide matching assets, enable image generation, or replace the placeholder later | visual selection report + PPTX review |
| 54 | Two-stage workflow | Stage 1 does not select images prematurely | Initial design text shows visual prompts and labels, but no image IDs, match scores, visual slots, or usage policies until Resolve visuals is run | `presentationTaskPlanning.test.ts`, design text review |
| 55 | Two-stage workflow | Save preserves selected images | After `Resolve visuals`, pressing `Save` keeps selected opening/body image IDs in the existing library card | `presentationGptFlow.test.ts`, library review |
| 56 | Two-stage workflow | Cover image selection is independent | `visualTitleCover` selection remains when later resolving body visual blocks, and body selections do not clear the cover image | `presentationGptFlow.test.ts`, PPTX review |
| 57 | Obsolete paths | PPTX direct-edit approval remains retired | No live UI or task path imports the retired direct-edit approval module/hook | code search + build |

## Required Verification Before User Retest

Run the maximum practical local verification for the touched area before asking
for another live PPT generation.

Minimum for PPT planning / rendering work:

- focused route/planning/visual selection tests for touched app code
- renderer tests for touched renderer code
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

Also run `npm run check:utf8` after bulk text edits or Japanese user-facing text
edits.
