# Presentation Renderer Next Implementation Notes

Last updated: 2026-04-29

## Current State

- `/ppt` can create, revise, preview, and render presentation library documents.
- `Document ID` is the routing key for revisions and PPTX generation.
- `Density:` is supported as command metadata and is stored on `PresentationSpec`.
- The renderer remains standalone under `kin-presentation-renderer`.
- The app and renderer communicate through JSON plus generated PPTX bytes.
- PPTX rendering writes only to the OS temp directory at request time. The API
  returns base64 content, and the browser turns it into a Blob download URL.
- The root app build runs `npm run build --prefix kin-presentation-renderer`
  before `next build` so Vercel can generate `kin-presentation-renderer/dist`.
- `pptxgenjs` and `zod` are also installed at the root app level because the
  root Next TypeScript build can type-check files under
  `kin-presentation-renderer/src`.
- The app currently has a tolerant normalization layer for common GPT JSON drift:
  `content.title`, `content.bullets`, `leftContent`, `rightContent`,
  `content.leftBullets`, `content.rightBullets`, `content.leftColumn`, and
  `content.rightColumn`.

## Cleanup Notes

- Keep generated PPTX files out of git. `public/generated-presentations/` is
  legacy local output and should contain only `.gitignore` in source control.
- Keep render request temp JSON out of git. `.tmp-presentation-render/` is
  legacy local output and should contain only `.gitignore` in source control.
- `kin-presentation-renderer/.tmp-render-tests/` is test output and should stay
  ignored.
- The older patch-first GPT revision path has been removed from active code.
  Revision now asks GPT for a full revised `PresentationSpec`, then the app
  converts it into patch history internally.

## Deployment Notes

- Vercel should run the root `npm run build` script, not the renderer build
  directly.
- The root build intentionally compiles the renderer first:
  `npm run build --prefix kin-presentation-renderer && next build`.
- Do not commit `kin-presentation-renderer/dist`; it is build output.
- `next.config.ts` explicitly includes `kin-presentation-renderer/dist` in the
  `/api/presentation-render` trace so Vercel packages the renderer CLI.
- Do not write generated PPTX files under `public` at runtime on Vercel. Route
  handlers may run as Lambda functions where the deployment filesystem cannot be
  used for persistent generated assets.
- If deploy fails with missing renderer modules, check both dependency scopes:
  the renderer package needs its own dependencies for local standalone use, and
  the root package needs dependencies that the root TypeScript build resolves.
- If deploy succeeds but PPTX generation fails at runtime, first confirm that
  `kin-presentation-renderer/dist/cli.js` exists in the deployed build output.

## Recommended Next Work

### 1. Frame And Template System

The current renderer layout is intentionally simple and now looks repetitive.
Next, define a small frame/template registry that maps semantic slide intent to
layout variants.

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

Keep external asset handling conservative at first. Start with deterministic
charts and simple diagram primitives before adding image search or generated
images.

### 3. GPT JSON Templates

GPT should increasingly fill fixed templates rather than invent JSON shapes.
Maintain the tolerant normalizer as a safety net, but make the normal path
strict.

For each slide type, provide GPT a canonical blank example and explicitly
forbid alternatives such as `content.leftColumn` when the canonical form is
`left` / `right`.

This should reduce renderer-side surprises and make the generated library JSON
easier for users to inspect.

### 4. Narrative Layer

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

### 5. Future User Controls

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
