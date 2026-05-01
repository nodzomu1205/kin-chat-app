# Slide Frame Design Plan

Last updated: 2026-05-01

## Purpose

This document records the next architecture direction for PPT design tasks.

The current free-form slide JSON shape is too permissive:

```json
{
  "slideNumber": 2,
  "placementComposition": "...",
  "parts": [
    { "role": "図", "text": "..." },
    { "role": "説明", "text": "..." }
  ]
}
```

That shape allows GPT to create vague parts such as `図`, `説明`, and
`ポイント`, then pack several unrelated display units into one text field.
Prompt constraints alone are not enough to prevent this. The fix should be a
frame-based JSON system where GPT first chooses a slide frame and then fills a
known schema for that frame.

## Target Pipeline

The intended flow is:

1. Generate the upstream design material in natural language.
   - `summary`
   - `extractedItems`
   - `strategyItems`
   - `keyMessages`
2. Generate each slide through a fixed frame schema.
   - GPT chooses `frameType`.
   - GPT fills only that frame's allowed fields.
   - GPT does not invent arbitrary `role/text` structures.
3. Treat the frame JSON as the canonical slide-design model.
4. Derive the user-facing PPT design document from the canonical frame JSON.
5. Derive renderer-ready `PresentationSpec` from the same canonical frame JSON.

The important boundary is that only the slide-design portion needs the stricter
JSON frame system. The earlier information organization should remain rich
natural language because forcing that layer through narrow JSON caused thin,
low-value outputs.

## Next Implementation: Editable Frame Registry

The next implementation should expose the frame package in chat so the user can
inspect and refine the actual registry used by PPT design and rendering.

Target commands:

```text
PPT frames: Show index
PPT frames: Show JSON / titleLineFooter
PPT frames: Edit JSON / titleLineFooter
PPT frames: Delete JSON / titleLineFooter
```

`Show index` should print every registered master/layout/block frame with ID,
label, and short description.

`Show JSON / <frameId>` should print the stored registry JSON for one frame.

`Edit JSON / <frameId>` should treat the following lines as a replacement JSON
document for that frame. Validate before saving. If the JSON is malformed or
fails obvious frame requirements, return an error message and keep the previous
frame unchanged.

`Delete JSON / <frameId>` should remove a custom frame only when safe. Built-in
frames can be protected initially; if deletion is allowed later, renderer and
prompt references must be checked first.

Important: do not create a docs-only frame list. The command output should come
from the same registry that prompt construction and renderer mapping consume.

## Deck Master Inheritance Rule

`deckFrame` owns common deck-wide decisions such as master frame, background,
page numbering, logo, and typography. A slide should only specify
`masterFrameId` when it intentionally overrides `deckFrame.masterFrameId`.

The normalized in-memory model may still carry an inherited `masterFrameId` for
renderer convenience, but the authored design JSON and visible PPT design text
should not repeat the common master on every slide.

This rule exists because `titleLineFooter` duplication reappeared after an
earlier cleanup. The root risk is residue across prompt examples, parser
defaults, display projection, and renderer schema defaults. Fix the registry and
inheritance model instead of adding more prompt warnings.

## Non-Goals

- Do not make the whole PPT design task a rigid JSON form.
- Do not ask GPT to invent arbitrary slide structures.
- Do not rely on renderer heuristics to interpret vague labels like `説明`.
- Do not patch individual failed words or topics.
- Do not use a fallback pass as the main architecture.

## Canonical Shape

The future slide-design model should look like this:

```ts
type PresentationTaskSlideFrame =
  | TitleStatementFrame
  | BulletConclusionFrame
  | VisualExplanationFrame
  | ProcessFlowFrame
  | MapListFrame
  | ComparisonFrame
  | RiskMatrixFrame
  | TimelineFrame
  | SummaryTakeawayFrame;

type BaseSlideFrame = {
  slideNumber: number;
  frameType: string;
  title: string;
  layoutIntent: string;
  speakerIntent?: string;
};
```

Each `frameType` owns its own fields. The renderer and natural-language display
should switch on `frameType`, not on arbitrary part labels.

## Initial Frame Set

### 1. `titleStatement`

Use for opening slides.

```ts
type TitleStatementFrame = BaseSlideFrame & {
  frameType: "titleStatement";
  title: string;
  statement: string;
  subtitle?: string;
  visualRequest?: VisualRequest;
};
```

Display example:

```text
スライド1
- 型: タイトル + ステートメント
- 配置・構成: 上部にタイトル、中央に主メッセージ、下部に補足文
- 配置するパーツ:
  - タイトル: ...
  - 主メッセージ: ...
  - 補足文: ...
```

### 2. `bulletConclusion`

Use for claim-plus-evidence slides without a primary visual.

```ts
type BulletConclusionFrame = BaseSlideFrame & {
  frameType: "bulletConclusion";
  lead: string;
  bullets: Array<{
    label?: string;
    text: string;
  }>;
  conclusion: string;
};
```

Rules:

- One bullet equals one display unit.
- Do not pack multiple bullet lines into one string.
- Use `label` only when it helps scanning.

### 3. `visualExplanation`

Use when one visual carries the slide.

```ts
type VisualExplanationFrame = BaseSlideFrame & {
  frameType: "visualExplanation";
  lead: string;
  visual: VisualRequest;
  explanationItems: Array<{
    label: string;
    text: string;
  }>;
  takeaway: string;
};
```

Example use:

- Product image plus explanation
- Photo plus interpretation
- Concept diagram plus captions

### 4. `processFlow`

Use for ordered steps, production processes, workflows, and pipelines.

```ts
type ProcessFlowFrame = BaseSlideFrame & {
  frameType: "processFlow";
  lead: string;
  steps: Array<{
    label: string;
    description: string;
  }>;
  takeaway: string;
  visualRequest?: VisualRequest;
};
```

Example:

```json
{
  "frameType": "processFlow",
  "title": "コットン生産の主要工程",
  "lead": "コットンは農産物から工業素材へ複数工程を経て変換される。",
  "steps": [
    { "label": "栽培・収穫", "description": "春に種を蒔き、白い綿繊維を収穫する。" },
    { "label": "ジニング", "description": "種子やゴミを取り除き、原綿として梱包する。" }
  ],
  "takeaway": "工程ごとの処理が品質と供給安定性を左右する。"
}
```

### 5. `mapList`

Use for geography plus highlighted regions or countries.

```ts
type MapListFrame = BaseSlideFrame & {
  frameType: "mapList";
  lead: string;
  mapFocus: string[];
  items: Array<{
    label: string;
    note: string;
  }>;
  takeaway: string;
  visualRequest?: VisualRequest;
};
```

Example:

```json
{
  "frameType": "mapList",
  "title": "主要なコットン生産国",
  "mapFocus": ["インド", "中国", "アメリカ", "ブラジル"],
  "items": [
    { "label": "インド", "note": "主要生産国の一つ。" },
    { "label": "中国", "note": "大規模な生産・加工基盤を持つ。" }
  ],
  "takeaway": "主要国の分布を押さえることで供給構造を理解できる。"
}
```

### 6. `comparison`

Use for contrast, before/after, options, or two-sided arguments.

```ts
type ComparisonFrame = BaseSlideFrame & {
  frameType: "comparison";
  lead: string;
  left: {
    heading: string;
    items: string[];
  };
  right: {
    heading: string;
    items: string[];
  };
  conclusion: string;
};
```

### 7. `riskMatrix`

Use for environmental, social, compliance, operational, or business risks.

```ts
type RiskMatrixFrame = BaseSlideFrame & {
  frameType: "riskMatrix";
  lead: string;
  risks: Array<{
    label: string;
    category: string;
    description: string;
    implication: string;
  }>;
  takeaway: string;
};
```

For the cotton example, this would avoid vague `ポイント` blocks:

```json
{
  "frameType": "riskMatrix",
  "title": "環境・社会的課題",
  "risks": [
    {
      "label": "水リスク",
      "category": "環境",
      "description": "大量の水使用により水不足や汚染が生じる。",
      "implication": "生産地域の環境負荷が高まる。"
    },
    {
      "label": "労働問題",
      "category": "社会",
      "description": "児童労働、強制労働、低賃金労働のリスクがある。",
      "implication": "企業には厳格な労働環境モニタリングが求められる。"
    }
  ],
  "takeaway": "課題は環境と人権の両面から管理する必要がある。"
}
```

### 8. `timeline`

Use for dates, phases, milestones, or implementation plans.

```ts
type TimelineFrame = BaseSlideFrame & {
  frameType: "timeline";
  lead: string;
  milestones: Array<{
    label: string;
    period?: string;
    description: string;
  }>;
  takeaway: string;
};
```

### 9. `summaryTakeaway`

Use for closing or synthesis.

```ts
type SummaryTakeawayFrame = BaseSlideFrame & {
  frameType: "summaryTakeaway";
  keyTakeaways: string[];
  finalMessage: string;
  nextActions?: string[];
};
```

## Visual Request

Visuals should also be structured, not embedded as generic `図` text.

```ts
type VisualRequest = {
  type:
    | "none"
    | "photo"
    | "illustration"
    | "diagram"
    | "chart"
    | "map"
    | "iconSet"
    | "table";
  brief: string;
  prompt?: string;
  labels?: string[];
};
```

Rules:

- `brief` describes what the visual is.
- `prompt` is used when an image/diagram can later be generated.
- `labels` contains text that must appear inside the visual.
- Visual instructions must not be hidden only in `layoutIntent`.

## GPT Generation Process

The GPT-facing process should be two-step inside one request or as two explicit
internal steps:

1. Choose a frame for each slide.
2. Fill the schema for that frame.

The prompt should not say "create any suitable JSON". It should say:

- choose one allowed `frameType`
- fill only the fields allowed for that `frameType`
- do not create arbitrary `role/text` parts
- if content does not fit, choose a different frame

## Validation Rules

Before saving or rendering:

- Every slide must have a known `frameType`.
- Required fields for that frame must be present.
- Arrays such as `steps`, `items`, `risks`, and `milestones` must contain
  atomic display units.
- Generic catch-all fields such as `説明`, `ポイント`, and `図` should not appear
  as standalone roles in the canonical frame model.
- `layoutIntent` may describe placement, but it must not introduce elements
  that do not exist in the frame fields.

## Display Projection

The user-facing PPT design document should be derived from frame JSON.

Example for `processFlow`:

```text
スライド2
- 型: 工程フロー
- 配置・構成: 上部にタイトル、中央に工程フロー、下部に結論
- 配置するパーツ:
  - タイトル: コットン生産の主要工程
  - リード: コットンは農産物から工業素材へ複数工程を経て変換される
  - 工程:
    - 栽培・収穫: 春に種を蒔き、白い綿繊維を収穫する
    - ジニング: 種子やゴミを取り除き、原綿として梱包する
  - 結論: 工程ごとの処理が品質と供給安定性を左右する
```

The display text is not the source of truth. It is a projection.

## Renderer Projection

The renderer should map frame types to known layouts.

Initial mapping:

- `titleStatement` -> title slide
- `bulletConclusion` -> bullets slide
- `visualExplanation` -> image/diagram + text layout
- `processFlow` -> flow diagram layout
- `mapList` -> map/visual + list layout
- `comparison` -> two-column comparison
- `riskMatrix` -> matrix/cards layout
- `timeline` -> horizontal or vertical timeline
- `summaryTakeaway` -> closing slide

The renderer should never need to infer that `説明` means a list, chart, or
caption. The frame type tells it what layout family to use.

## Migration Plan

1. Add `SlideFrameType` and frame-specific TypeScript types.
2. Add parser/validator for frame JSON.
3. Update PPT design task generation to return `slideFrames` instead of
   free-form `slideDesign.slides[].parts`.
4. Update `formatPresentationTaskPlanText` to render frame-specific natural
   language.
5. Update `buildPresentationSpecFromTaskPlan` to project frames into current
   `PresentationSpec v0.1`.
6. Update renderer layouts incrementally by frame type.
7. Keep the current free-form `parts` parser only as a legacy importer, not as
   the active generation target.

## Acceptance Criteria

- Internal debug metadata, logs, or a dev-only inspection view can show
  `slideSource: slideFrameJson` or equivalent.
- Each slide has a known `frameType`.
- No generated canonical slide contains generic standalone roles such as
  `説明`, `ポイント`, or `図`.
- Multi-line display units are represented as arrays in JSON, not packed into
  one text field.
- PPTX output uses frame-specific layouts rather than the same two-column box
  pattern everywhere.
