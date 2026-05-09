import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";
import {
  supportedBlockKind,
  supportedBlockStyleId,
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
  normalizeBlockDisplayFields,
  normalizeBlockIds,
} from "@/lib/app/presentation/presentationSlideFrameBlockNormalization";
import { normalizeLayoutFrameId } from "@/lib/app/presentation/presentationSlideFrameLayout";
import {
  arrayValue,
  numberValue,
  objectValue,
  stringArray,
  stringValue,
} from "@/lib/app/presentation/presentationSlideFrameValueUtils";

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
