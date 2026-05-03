# Presentation Renderer Next Implementation Notes

Last updated: 2026-05-03

## Current State

- `/ppt` can create, revise, preview, and render presentation library documents.
- `Document ID` is the routing key for revisions and PPTX generation.
- `Density:` is supported as command metadata and is stored on `PresentationSpec`.
- The renderer remains standalone under `kin-presentation-renderer`.
- The app and renderer communicate through JSON plus generated PPTX bytes.
- PPTX rendering writes only to the OS temp directory at request time. The API
  returns base64 content, and the browser turns it into a Blob download URL.
- New draft creation asks GPT for `PresentationMotherSpec v0.2`, stores that
  mother JSON in the library payload, and adapts it into renderer-ready
  `PresentationSpec v0.1`.
- The Next route imports the built renderer modules directly instead of
  spawning the renderer CLI. This keeps `zod`, `pptxgenjs`, and renderer files
  visible to the Next/Vercel server bundler.
- The library Google Drive save action exports presentation items as raw JSON
  and, when a PPTX has been generated, uploads the latest PPTX to the same Drive
  destination. If the browser Blob URL has expired, the app regenerates the PPTX
  from the stored `PresentationSpec`.
- The root app build runs `npm run build --prefix kin-presentation-renderer`
  before `next build` so Vercel can generate `kin-presentation-renderer/dist`.
- `pptxgenjs` and `zod` are also installed at the root app level because the
  root Next TypeScript build can type-check files under
  `kin-presentation-renderer/src`.
- The app currently has a tolerant normalization layer for common GPT JSON drift:
  `content.title`, `content.bullets`, `leftContent`, `rightContent`,
  `content.leftBullets`, `content.rightBullets`, `content.leftColumn`, and
  `content.rightColumn`.
- The app now has an image library for generated/imported image assets. The
  next renderer-facing step is to route those assets into PPTX rendering. See
  `../HANDOFF-2026-05-01.md`.

## Cleanup Notes

- Keep generated PPTX files out of git. `public/generated-presentations/` is
  legacy local output and should contain only `.gitignore` in source control.
- Keep render request temp JSON out of git. `.tmp-presentation-render/` is
  legacy local output and should contain only `.gitignore` in source control.
- `kin-presentation-renderer/.tmp-render-tests/` is test output and should stay
  ignored.
- The older patch-first GPT revision path has been removed from active code.
  Direct PPTX edits now use a structured approval candidate (`edits[]`) that
  targets slide/block addresses and applies only after user approval.
- Direct PPTX edit text replacement must not preserve stale old bullet items.
  Text-stack/callout replacement clears `items`; list replacement clears `text`
  and writes the approved lines as `items`.
- Do not add renderer-wide typography shrink rules to compensate for one direct
  edit overflow. Future fit handling should be designed through block/frame
  capacity policy or block-level `renderStyle.textStyle`.

## Deployment Notes

- Vercel should run the root `npm run build` script, not the renderer build
  directly.
- The root build intentionally compiles the renderer first:
  `npm run build --prefix kin-presentation-renderer && next build`.
- Do not commit `kin-presentation-renderer/dist`; it is build output.
- `next.config.ts` explicitly includes `kin-presentation-renderer/dist` in the
  `/api/presentation-render` trace so Vercel packages the renderer modules.
- Runtime rendering should happen in-process from the route. Avoid invoking
  `node kin-presentation-renderer/dist/cli.js` from Vercel because the child
  process does not get the same bundled module resolution context.
- Do not write generated PPTX files under `public` at runtime on Vercel. Route
  handlers may run as Lambda functions where the deployment filesystem cannot be
  used for persistent generated assets.
- If deploy fails with missing renderer modules, check both dependency scopes:
  the renderer package needs its own dependencies for local standalone use, and
  the root package needs dependencies that the root TypeScript build resolves.
- If deploy succeeds but PPTX generation fails at runtime, first confirm that
  `kin-presentation-renderer/dist/renderer.js` and `schema.js` are present in
  the deployed build output and included in the `/api/presentation-render` trace.

## Recommended Next Work

### 1. Frame And Template System

The current renderer layout is intentionally simple and now looks repetitive.
Next, define a small frame/template registry that maps semantic slide intent to
layout variants.

Detailed design: see
[`slide-frame-design-plan.md`](./slide-frame-design-plan.md).

Important direction: do not solve the next stage by adding more free-form prompt
instructions to the current `parts: [{ role, text }]` shape. The canonical slide
design should first select a known frame type, then fill that frame's required
slots. The user-facing design text and renderer input should both be projections
from that same frame JSON.

Candidate frame groups:

- Opening/title
- Chapter divider
- Claim plus evidence
- Problem / solution
- Before / after
- Process or flow
- Timeline
- Matrix
- Metric table
- Partner/customer story
- Closing / next actions

The goal is not free-form design yet. The goal is a controlled set of better
defaults that the renderer can choose from predictably.

### 2. Visual Assets And Charts

Add first-class support for richer visual slides.

Candidate additions:

- `image` or `imageText` slide type
- `chart` slide type for simple bar/line/pie charts
- `flow` slide type for process diagrams
- `metricCards` slide type for KPI-heavy pages
- Optional `visualBrief` field for GPT to describe desired imagery without
  directly generating assets

For image assets, use the current image library before generating new images
when the user asks for `Images: on` or `Images: on, library, API`.

Planned `/ppt` image modes:

- `Images: off`: no images
- `Images: on, library`: image library only
- `Images: on, API`: generate new images only
- `Images: on` or `Images: on, library, API`: library first, API fallback

Image-library matching needs image metadata:

- width / height
- aspect ratio
- orientation
- MIME type
- Description

Keep external asset handling conservative. Do not special-case only one
orientation such as landscape. Treat landscape, portrait, square, and extreme
aspect ratios as general layout signals, and prefer `contain` placement unless
the selected frame explicitly allows cropping.

### 3. GPT JSON Templates

GPT should increasingly fill fixed templates rather than invent JSON shapes.
Maintain the tolerant normalizer as a safety net, but make the normal path
strict.

For each slide type, provide GPT a canonical blank example and explicitly
forbid alternatives such as `content.leftColumn` when the canonical form is
`left` / `right`.

This should reduce renderer-side surprises and make the generated library JSON
easier for users to inspect.

### 4. Prompt Cleanup Review

Before adding more prompt instructions, review the PPT-related prompts as a
small design surface rather than as scattered compensating rules.

Primary files to review:

- `lib/app/presentation/presentationTaskPlanning.ts`
- `lib/app/presentation/presentationGptPrompts.ts`
- `lib/task/taskProtocol.ts`
- `lib/app/gpt-task/gptTaskClient.ts`
- `lib/app/gpt-task/gptTaskClientBuilders.ts`

Review goals:

- Separate durable architecture rules from temporary debugging instructions.
- Remove topic-specific or phrase-specific fixes.
- Replace repeated "must not" prompt layers with frame-schema validation where
  possible.
- Keep the upstream information extraction prompt natural-language oriented,
  because forcing that layer through narrow JSON made the content thin.
- Keep slide-level JSON strict, but make that strictness come from known frame
  types and required fields rather than a growing list of ad hoc role/text
  warnings.
- Decide whether debug output belongs in internal metadata, logs, or dev-only UI
  rather than in the user-facing PPT design text.

### 5. Direct Edit Capacity And Retry

PPT direct edit is now approval-based, but the next improvement should be
designed rather than patched locally.

Open items:

- add a retry/reinterpret button that sends edited target/instruction/proposal
  context back through the direct-edit interpreter
- give the interpreter layout-capacity hints so proposed text is concise enough
  for the target block
- surface overflow/fit risk in approval before rendering where practical
- handle large structural rewrites by sending the user back to PPT design
  revision instead of trying to force them into one direct block edit

The expected outcome is a smaller set of prompts with clearer ownership:

- one prompt for rich source extraction and strategy drafting
- one prompt for slide frame selection and slot filling
- one projection layer from frame JSON to user-facing design text
- one projection layer from frame JSON to renderer-ready `PresentationSpec`

### 5. Likely Cleanup After Frame Migration

The current implementation contains several compatibility and bridge layers that
are useful while the PPT design flow is still stabilizing, but they may become
residue after the frame-based model is implemented.

Review these areas after `slideFrameJson` becomes the canonical slide source:

- `lib/app/presentation/slidePartsParser.ts`
  - Free-form natural language slide parsing.
  - Generic `role/text` part normalization.
  - Heuristics that decide whether a role is visual, message, title, or layout.
- `lib/app/presentation/presentationTaskPlanning.ts`
  - `parsePresentationTaskSlidesFromLines` fallback use.
  - `slideDesignJson` compatibility parsing if the new source is
    `slideFrameJson`.
  - Layout inference based on Japanese words such as left/right/center, map,
    flow, timeline, or visual.
  - Relevance matching from extracted facts into slide bullets.
- `lib/app/presentation/presentationGptPrompts.ts`
  - Prompt rules that compensate for free-form JSON drift.
  - Repeated "do not stop at 4 or 5 facts" and similar model-behavior guardrails,
    if schema validation and staged generation make them unnecessary.
  - Any instruction that exists only to patch one observed failure mode rather
    than express a stable contract.
- `lib/task/taskProtocol.ts`
  - Presentation-plan prompt fragments that duplicate rules owned by
    `presentationTaskPlanning.ts` or the future frame-schema prompt.
- `kin-presentation-renderer/src/renderer.ts`
  - Temporary two-column variants used to approximate arbitrary design intent.
  - Box-heavy placeholder layouts once each frame type has a dedicated renderer.
- `kin-presentation-renderer/src/schema.ts`
  - Temporary fields added only to carry vague visual/layout hints, if they are
    replaced by explicit frame fields.
- Tests around legacy parsing and normalization.
  - Keep migration coverage, but retire tests that lock in the old free-form
    `parts: [{ role, text }]` behavior as the preferred path.

Cleanup order:

1. Introduce frame JSON and validators while preserving legacy import.
2. Switch generation to frame JSON.
3. Switch user-facing display and renderer projection to frame JSON.
4. Keep legacy parsers only for old saved library items.
5. Remove or quarantine prompt rules and renderer heuristics that are no longer
   on the active path.

The key review question should be: "Is this code still part of the normal
authoring path, or only helping old documents and old experiments survive?"

### 6. Narrative Layer

Introduce a narrative field so the full reasoning is preserved even when the
visible slide is concise.

Candidate shape:

```ts
type SlideNarrative = {
  script?: string;
  keyMessage?: string;
  evidence?: string[];
  sourceNotes?: string[];
};
```

Possible integration:

- Each slide can carry `narrative`.
- GPT writes full information into `narrative.script`.
- Visible slide fields are selected from the narrative according to `density`.
- Future renderer versions can export speaker notes from `narrative.script`.

This should help avoid the current failure mode where GPT compresses rich source
material into keyword-only bullets.

### 7. Future User Controls

`Density:` is the first command metadata field. Additional user-controlled
fields can follow the same pattern.

Candidates:

- `Theme: business-clean`
- `Frame: proposal`
- `Language: ja`
- `Audience: executive`
- `Tone: formal`
- `Font: ...`

Add these one at a time, only when they map cleanly to either GPT generation or
renderer behavior.
