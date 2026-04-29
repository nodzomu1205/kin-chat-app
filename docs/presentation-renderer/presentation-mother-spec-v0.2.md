# PresentationMotherSpec v0.2

`PresentationMotherSpec` is the rich source JSON created by GPT before the app
converts it into renderer-ready `PresentationSpec v0.1`.

The mother JSON should preserve as much useful information as possible. The
renderer or adapter is responsible for selecting what fits the final PPTX.

## Shape

```ts
type PresentationMotherSpec = {
  version: "0.2-mother";
  title: string;
  purpose: string;
  audience: string;
  language: "ja" | "en";
  theme?: "business-clean" | "warm-minimal" | "executive-dark";
  sourceIntent: string;
  slides: MotherSlide[];
};

type MotherSlide = {
  title: string;
  templateFrame: string;
  wallpaper: string;
  bodies: MotherBody[];
  script: string;
};

type MotherBody = {
  keyMessage: string;
  keyMessageFacts: string[];
  keyVisual: MotherVisual;
  keyVisualFacts: string[];
};

type MotherVisual = {
  type:
    | "none"
    | "photo"
    | "illustration"
    | "diagram"
    | "chart"
    | "table"
    | "placeholder";
  brief: string;
  generationPrompt: string;
  assetId: string;
  status: "none" | "pending" | "auto" | "attached" | "generated";
};
```

## Rules

- GPT must return every field. Use `""` for unknown text and `[]` for empty
  fact arrays.
- `bodies` means the number of key-message/key-visual blocks inside one slide.
- Use one body for most slides.
- Use two bodies for left/right contrast, before/after, problem/solution, or
  other paired structures.
- Use three or four bodies only when there is a clear parallel structure.
- GPT should not discard useful facts to fit a slide layout.
- `keyMessage` should be non-empty for every body unless there is literally no
  usable source content.
- Facts should live in `keyMessageFacts` or `keyVisualFacts`, not only in
  `script`.
- Fact counts should vary naturally by slide. Include more facts when they add
  distinct value, but avoid padding or repeating the same idea. Each fact array
  is capped at 15 items.
- The mother spec has no density concept. It should preserve all useful
  available information, with each fact array capped at 15 items to avoid
  unbounded payloads. Output density belongs to the renderer or adapter.
- `script` should be read-aloud presenter narration, not a short meta
  description of what the slide explains.
- `keyVisual.brief` should be a concise visual plan.
- `keyVisual.generationPrompt` should be directly usable by a later visual
  generation step. It should specify subject, composition or layout, labels or
  data to include, language, style, and what to avoid. Chart and table prompts
  should include chart/table type, axes or columns, categories/series, known
  values, and `needs source data` where numeric values are unknown.
- Visual assets are not required at mother-spec time. Use `assetId: ""` and
  `status: "pending"` until an image or generated diagram is attached.

## Current Adapter

The first implementation converts mother JSON into existing `PresentationSpec
v0.1` so the current renderer can stay stable:

- 1 body -> `bullets`
- 1 body with a visual request -> temporary `twoColumn` bridge layout
- 2 bodies -> `twoColumn`
- 3-4 bodies -> compact `table`

The adapter applies output density after the mother JSON is created. For
example, `standard` keeps fewer visible facts than `detailed` or `dense`, while
the full mother JSON remains available for later regeneration.

Future renderer work can consume `templateFrame`, `wallpaper`, visual requests,
and asset IDs directly, then choose freer per-slide layouts instead of relying
on the temporary visual-to-column bridge.
