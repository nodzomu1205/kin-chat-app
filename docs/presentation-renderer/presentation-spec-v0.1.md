# PresentationSpec v0.1

This document defines the first contract between Kin/GPT and the future
PowerPoint renderer.

The goal of v0.1 is not to describe every possible PowerPoint feature. It is to
give GPT a small, stable JSON target that can be validated and rendered
predictably.

## Scope

`PresentationSpec` is the canonical JSON format for creating `.pptx` files from
Kin-led presentation flows.

In the first phase, the renderer should support:

- Title slides
- Section divider slides
- Bullet slides
- Two-column slides
- Table slides
- Closing slides

The renderer owns visual layout, spacing, typography, and theme application.
GPT should describe the presentation intent and content, not exact coordinates.

## Design Principles

- Keep JSON semantic rather than PowerPoint-specific.
- Prefer slide types over free-form canvas instructions.
- Validate before rendering.
- Version the format from the beginning.
- Let the renderer decide detailed layout so output quality can improve without
  changing GPT prompts.
- Keep v0.1 small enough to test with real presentation examples.

## Top-Level Shape

```ts
type PresentationSpec = {
  version: "0.1";
  title: string;
  subtitle?: string;
  language?: "ja" | "en";
  audience?: string;
  purpose?: string;
  theme?: PresentationTheme;
  density?: PresentationDensity;
  slides: SlideSpec[];
};

type PresentationTheme =
  | "business-clean"
  | "warm-minimal"
  | "executive-dark";

type PresentationDensity =
  | "concise"
  | "standard"
  | "detailed"
  | "dense";
```

`density` controls the expected information density of generated and rendered
slides. If omitted, the application should treat it as `"standard"`.

- `concise`: executive summary style, usually 2-3 key points per content slide.
- `standard`: default, usually 3-5 useful points per content slide.
- `detailed`: explanation-oriented, usually 5-7 substantive points with details
  and figures when available.
- `dense`: internal-review style, more information, tables, comparisons, and
  detail fields where useful.

## Slide Types

```ts
type SlideSpec =
  | TitleSlide
  | SectionSlide
  | BulletsSlide
  | TwoColumnSlide
  | TableSlide
  | ClosingSlide;
```

### Title Slide

Use for the opening slide.

```ts
type TitleSlide = {
  type: "title";
  title: string;
  subtitle?: string;
  kicker?: string;
  presenter?: string;
  date?: string;
  notes?: string;
};
```

### Section Slide

Use to separate major chapters.

```ts
type SectionSlide = {
  type: "section";
  title: string;
  subtitle?: string;
  sectionNumber?: string;
  notes?: string;
};
```

### Bullets Slide

Use for a main claim with supporting points.

```ts
type BulletsSlide = {
  type: "bullets";
  title: string;
  lead?: string;
  bullets: BulletItem[];
  takeaway?: string;
  notes?: string;
};

type BulletItem = {
  text: string;
  detail?: string;
  emphasis?: "normal" | "strong" | "muted";
};
```

### Two-Column Slide

Use for comparisons, before/after, problem/solution, or paired arguments.

```ts
type TwoColumnSlide = {
  type: "twoColumn";
  title: string;
  lead?: string;
  left: ColumnContent;
  right: ColumnContent;
  takeaway?: string;
  notes?: string;
};

type ColumnContent = {
  heading: string;
  body?: string;
  bullets?: BulletItem[];
};
```

### Table Slide

Use for compact structured information. Tables should stay small in v0.1.

```ts
type TableSlide = {
  type: "table";
  title: string;
  lead?: string;
  columns: string[];
  rows: string[][];
  takeaway?: string;
  notes?: string;
};
```

Rules:

- `columns.length` should match every row length.
- Prefer 2 to 5 columns.
- Prefer 2 to 8 rows.
- Long prose should not be placed inside table cells.

### Closing Slide

Use for final message, next steps, or call to action.

```ts
type ClosingSlide = {
  type: "closing";
  title: string;
  message?: string;
  nextSteps?: string[];
  contact?: string;
  notes?: string;
};
```

## Renderer Responsibilities

The renderer should:

- Validate the input against `PresentationSpec v0.1`.
- Reject unknown slide types.
- Render Japanese and English text without layout breakage.
- Apply one of the supported themes.
- Add page numbers unless the theme disables them.
- Keep content inside slide bounds.
- Produce a `.pptx` file without requiring Microsoft PowerPoint.

## GPT Responsibilities

GPT should:

- Output strict JSON only when asked for `PresentationSpec`.
- Use supported slide types only.
- Avoid coordinate-level layout instructions.
- Keep each slide focused on one main idea.
- Respect the requested `density`; do not discard useful information too
  aggressively for `detailed` or `dense` outputs.
- Use `notes` for speaker notes or intent that should not appear directly on the
  slide.

## Recommended v0.1 Validation Rules

- `version` must be `"0.1"`.
- `title` must be non-empty.
- `slides` must contain at least 1 slide and preferably no more than 20 slides.
- `density` must be one of `concise`, `standard`, `detailed`, or `dense` when
  present.
- Every slide must have a non-empty `type` and `title`.
- Unknown fields should be allowed during early prototyping but ignored by the
  renderer.
- Unknown slide types should fail validation.
- Table rows must match the column count.
- Text fields should be trimmed before rendering.

## Initial Build Milestones

1. Create a standalone `kin-presentation-renderer` TypeScript project.
2. Implement this schema with Zod.
3. Add a CLI: `render-presentation input.json output.pptx`.
4. Render the six v0.1 slide types with PptxGenJS.
5. Add tests for validation and sample rendering.
6. Add an HTTP endpoint only after CLI output is visually acceptable.

## Future Extensions

Candidate additions for v0.2:

- Image slides
- Chart slides
- Quote slides
- Appendix slides
- Brand theme packages
- Per-slide visual density hints
- Source citations
- Export to PDF through LibreOffice or another headless conversion path
