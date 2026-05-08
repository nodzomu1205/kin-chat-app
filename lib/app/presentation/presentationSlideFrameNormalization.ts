import type {
  PresentationTaskLayoutFrameId,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";
import {
  supportedBlockKind,
  supportedBlockStyleId,
  supportedLayoutFrameId,
  supportedMasterFrameId,
  supportedNotePolicy,
  supportedSlideRole,
  supportedTextPlacement,
  supportedVisualPlacement,
} from "@/lib/app/presentation/presentationSlideFrameSupportedValues";
import {
  normalizeBlockRenderStyle,
  normalizeVisualRequest,
} from "@/lib/app/presentation/presentationSlideFrameVisualRequest";
import {
  arrayValue,
  numberValue,
  objectValue,
  stringArray,
  stringValue,
} from "@/lib/app/presentation/presentationSlideFrameValueUtils";

const LAYOUT_BLOCK_LIMITS: Record<
  PresentationTaskLayoutFrameId,
  { min: number; max: number }
> = {
  singleCenter: { min: 1, max: 1 },
  titleBody: { min: 1, max: 1 },
  leftRight50: { min: 2, max: 2 },
  visualLeftTextRight: { min: 2, max: 2 },
  textLeftVisualRight: { min: 2, max: 2 },
  heroTopDetailsBottom: { min: 3, max: 3 },
  threeColumns: { min: 3, max: 3 },
  twoByTwoGrid: { min: 4, max: 4 },
  adaptiveVisualMain: { min: 1, max: 7 },
  adaptiveTextMain: { min: 1, max: 7 },
};

export function normalizeSlideFrame(
  value: unknown,
  index: number
): PresentationTaskSlideFrame | null {
  const candidate = objectValue(value);
  if (!candidate) return null;
  const blocks = arrayValue(candidate.blocks)
    .map((block, blockIndex) => normalizeBlock(block, blockIndex))
    .filter((block): block is PresentationTaskSlideBlock => !!block)
    .slice(0, 10);
  if (blocks.length === 0) return null;
  const layoutFrameId = normalizeLayoutFrameId(candidate.layoutFrameId, blocks);

  return {
    slideNumber: numberValue(candidate.slideNumber) || index + 1,
    title:
      sanitizeReadableSlideFrameTitle(stringValue(candidate.title || candidate.heading)) ||
      `Slide ${index + 1}`,
    masterFrameId: supportedMasterFrameId(candidate.masterFrameId),
    layoutFrameId,
    slideRole: supportedSlideRole(candidate.slideRole),
    layoutIntent: normalizeLayoutIntent(candidate.layoutIntent),
    speakerIntent: stringValue(candidate.speakerIntent) || undefined,
    blocks: normalizeBlockIds(blocks),
  };
}

function normalizeBlock(
  value: unknown,
  index: number
): PresentationTaskSlideBlock | null {
  const candidate = objectValue(value);
  if (!candidate) return null;
  const visualRequest = normalizeVisualRequest(candidate.visualRequest);
  const kind = supportedBlockKind(candidate.kind, visualRequest);
  const styleId = supportedBlockStyleId(candidate.styleId, kind);
  const text = stringValue(candidate.text || candidate.body || candidate.message);
  const heading = stringValue(candidate.heading || candidate.title || candidate.label);
  const items = stringArray(candidate.items || candidate.bullets || candidate.points);
  if (!heading && !text && items.length === 0 && !visualRequest) return null;

  return normalizeBlockDisplayFields({
    id: stringValue(candidate.id) || `block${index + 1}`,
    kind,
    styleId,
    heading: heading || undefined,
    text: text || undefined,
    items: items.length > 0 ? items : undefined,
    renderStyle: normalizeBlockRenderStyle(candidate.renderStyle),
    visualRequest: visualRequest || undefined,
  });
}

function normalizeBlockIds(blocks: PresentationTaskSlideBlock[]) {
  return blocks.map((block, index) => ({
    ...block,
    id: block.id || `block${index + 1}`,
  }));
}

function normalizeBlockDisplayFields(
  block: PresentationTaskSlideBlock
): PresentationTaskSlideBlock {
  if (block.styleId === "listCompact") {
    return {
      ...block,
      kind: block.kind === "visual" ? block.kind : "list",
      text: undefined,
    };
  }
  if (block.styleId === "headlineCenter" && block.heading && block.text) {
    return {
      ...block,
      heading: undefined,
    };
  }
  if (block.styleId === "visualContain" || block.styleId === "visualCover") {
    return {
      ...block,
      heading: undefined,
      text: undefined,
      items: undefined,
    };
  }
  return block;
}

function normalizeLayoutIntent(
  value: unknown
): PresentationTaskSlideFrame["layoutIntent"] {
  const candidate = objectValue(value);
  if (!candidate) return undefined;
  const textPlacement = supportedTextPlacement(candidate.textPlacement);
  const visualPlacement = supportedVisualPlacement(candidate.visualPlacement);
  const notePolicy = supportedNotePolicy(candidate.notePolicy);
  const layoutIntent: NonNullable<PresentationTaskSlideFrame["layoutIntent"]> = {};
  if (textPlacement) layoutIntent.textPlacement = textPlacement;
  if (visualPlacement) layoutIntent.visualPlacement = visualPlacement;
  if (notePolicy) layoutIntent.notePolicy = notePolicy;
  return Object.keys(layoutIntent).length > 0 ? layoutIntent : undefined;
}

function normalizeLayoutFrameId(
  value: unknown,
  blocks: PresentationTaskSlideBlock[]
): PresentationTaskLayoutFrameId {
  const requested = supportedLayoutFrameId(value);
  const limits = LAYOUT_BLOCK_LIMITS[requested];
  if (blocks.length >= limits.min && blocks.length <= limits.max) {
    return requested;
  }
  if (blocks.length === 1) return "titleBody";
  if (blocks.length === 2) {
    const firstVisual = !!blocks[0]?.visualRequest;
    const secondVisual = !!blocks[1]?.visualRequest;
    if (firstVisual && !secondVisual) return "visualLeftTextRight";
    if (!firstVisual && secondVisual) return "textLeftVisualRight";
    return "leftRight50";
  }
  if (blocks.length === 3) return "threeColumns";
  if (blocks.length === 4) return "twoByTwoGrid";
  return "titleBody";
}

export function sanitizeReadableSlideFrameTitle(value: string) {
  return value
    .replace(/\s*[（(]\s*見出しなし\s*[）)]\s*/g, "")
    .replace(/\s*[・・]\s*隕句・縺予s*縺ｪ縺予s*[・・]\s*/g, "")
    .replace(/\s*[・・]\s*heading\s*none\s*[・・]\s*/gi, "")
    .trim();
}

export function sanitizeSlideFrameTitle(value: string) {
  return value
    .replace(/\s*[（(]\s*見出しなし\s*[）)]\s*/g, "")
    .replace(/\s*[・・]\s*隕句・縺予s*縺ｪ縺予s*[・・]\s*/g, "")
    .replace(/\s*[繝ｻ繝ｻ]\s*heading\s*none\s*[繝ｻ繝ｻ]\s*/gi, "")
    .trim();
}
