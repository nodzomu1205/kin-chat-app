# PresentationPatch v0.1

`PresentationPatch` is the first internal format for revising a generated
presentation after visual review.

The intended flow is:

1. Generate `PresentationSpec` JSON.
2. Render `.pptx`.
3. Review the PowerPoint file.
4. Convert slide-level revision instructions into `PresentationPatch`.
5. Apply the patch to the source JSON.
6. Render a new `.pptx`.

This keeps the source of truth in JSON rather than editing generated PowerPoint
files directly.

## Shape

```ts
type PresentationPatch = {
  version: "0.1";
  description?: string;
  operations: PresentationPatchOperation[];
};

type PresentationPatchOperation =
  | UpdateDeckOperation
  | UpdateSlideOperation
  | ReplaceSlideOperation
  | InsertSlideOperation
  | DeleteSlideOperation
  | MoveSlideOperation;
```

Slide numbers are 1-based because they should match what users see in
PowerPoint.

## Operations

```ts
type UpdateDeckOperation = {
  op: "updateDeck";
  title?: string;
  subtitle?: string;
  audience?: string;
  purpose?: string;
  theme?: PresentationTheme;
};

type UpdateSlideOperation = {
  op: "updateSlide";
  slideNumber: number;
  patch: Record<string, unknown>;
};

type ReplaceSlideOperation = {
  op: "replaceSlide";
  slideNumber: number;
  slide: SlideSpec;
};

type InsertSlideOperation = {
  op: "insertSlide";
  afterSlideNumber: number;
  slide: SlideSpec;
};

type DeleteSlideOperation = {
  op: "deleteSlide";
  slideNumber: number;
};

type MoveSlideOperation = {
  op: "moveSlide";
  fromSlideNumber: number;
  toSlideNumber: number;
};
```

## Example

```json
{
  "version": "0.1",
  "description": "Revise slide 2 and shorten slide 5.",
  "operations": [
    {
      "op": "updateSlide",
      "slideNumber": 2,
      "patch": {
        "title": "目指す体験を一言で言うと",
        "takeaway": "Kinは会話を、PowerPointという成果物へ接続する。"
      }
    },
    {
      "op": "deleteSlide",
      "slideNumber": 4
    }
  ]
}
```

## Notes

- Patches are validated before use.
- The patched presentation is validated again as `PresentationSpec v0.1`.
- `updateSlide` performs a shallow merge. For nested changes, provide the full
  replacement value for that field.
- This format is intended as the target for future Kin/GPT natural-language
  revision flows.
