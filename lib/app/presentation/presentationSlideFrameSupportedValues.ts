import type {
  PresentationTaskBlockStyleId,
  PresentationTaskBookendFrameId,
  PresentationTaskLayoutFrameId,
  PresentationTaskMasterFrameId,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualRequest,
} from "@/types/task";
import {
  PRESENTATION_BLOCK_STYLES,
  PRESENTATION_BOOKEND_FRAMES,
  PRESENTATION_LAYOUT_FRAMES,
  PRESENTATION_MASTER_FRAMES,
} from "@/lib/app/presentation/presentationSlideFrameDefinitions";
import { stringValue } from "@/lib/app/presentation/presentationSlideFrameValueUtils";

const MASTER_FRAME_IDS = new Set(PRESENTATION_MASTER_FRAMES.map((item) => item.id));
const LAYOUT_FRAME_IDS = new Set(PRESENTATION_LAYOUT_FRAMES.map((item) => item.id));
const BLOCK_STYLE_IDS = new Set(PRESENTATION_BLOCK_STYLES.map((item) => item.id));
const VISUAL_TYPES = new Set([
  "none",
  "photo",
  "illustration",
  "diagram",
  "chart",
  "map",
  "iconSet",
  "table",
]);

export function supportedPageNumberPosition(
  value: unknown
): "bottomRight" | "bottomCenter" | "bottomLeft" {
  const position = stringValue(value);
  if (
    position === "bottomRight" ||
    position === "bottomCenter" ||
    position === "bottomLeft"
  ) {
    return position;
  }
  return "bottomRight";
}

export function supportedPageNumberScope(value: unknown): "bodyOnly" | "allSlides" {
  const scope = stringValue(value);
  return scope === "allSlides" ? "allSlides" : "bodyOnly";
}

export function supportedBookendFrameId(
  value: unknown,
  fallback: PresentationTaskBookendFrameId
): PresentationTaskBookendFrameId {
  const id = stringValue(value);
  return PRESENTATION_BOOKEND_FRAMES.some((frame) => frame.id === id)
    ? (id as PresentationTaskBookendFrameId)
    : fallback;
}

export function supportedLogoPosition(
  value: unknown
): "topRight" | "topLeft" | "bottomRight" | "bottomLeft" {
  const position = stringValue(value);
  if (
    position === "bottomRight" ||
    position === "bottomLeft" ||
    position === "topRight" ||
    position === "topLeft"
  ) {
    return position;
  }
  return "topRight";
}

export function normalizeVisualRequestType(
  type: string,
  _visualText: string
): PresentationTaskVisualRequest["type"] {
  void _visualText;
  return VISUAL_TYPES.has(type) ? (type as PresentationTaskVisualRequest["type"]) : "diagram";
}

export function supportedVisualUsagePolicy(
  value: unknown
): PresentationTaskVisualRequest["usagePolicy"] {
  const policy = stringValue(value);
  return policy === "useOneBest" || policy === "useOneOrMore" || policy === "useAsGrid"
    ? policy
    : undefined;
}

export function supportedFontSize(value: unknown) {
  const raw = stringValue(value);
  return raw === "small" || raw === "standard" || raw === "large" || raw === "xlarge"
    ? raw
    : undefined;
}

export function supportedMasterFrameId(value: unknown): PresentationTaskMasterFrameId {
  const id = stringValue(value);
  return MASTER_FRAME_IDS.has(id as PresentationTaskMasterFrameId)
    ? (id as PresentationTaskMasterFrameId)
    : "titleLineFooter";
}

export function supportedLayoutFrameId(value: unknown): PresentationTaskLayoutFrameId {
  const id = stringValue(value);
  return LAYOUT_FRAME_IDS.has(id as PresentationTaskLayoutFrameId)
    ? (id as PresentationTaskLayoutFrameId)
    : "titleBody";
}

export function supportedSlideRole(value: unknown): PresentationTaskSlideFrame["slideRole"] {
  const role = stringValue(value);
  return role === "visualMain" || role === "textMain" ? role : undefined;
}

export function supportedTextPlacement(
  value: unknown
): NonNullable<PresentationTaskSlideFrame["layoutIntent"]>["textPlacement"] {
  const placement = stringValue(value);
  return placement === "right" ||
    placement === "bottomRight" ||
    placement === "topWide" ||
    placement === "leftColumn"
    ? placement
    : undefined;
}

export function supportedVisualPlacement(
  value: unknown
): NonNullable<PresentationTaskSlideFrame["layoutIntent"]>["visualPlacement"] {
  const placement = stringValue(value);
  return placement === "right" ||
    placement === "bottom" ||
    placement === "rightGrid"
    ? placement
    : undefined;
}

export function supportedNotePolicy(
  value: unknown
): NonNullable<PresentationTaskSlideFrame["layoutIntent"]>["notePolicy"] {
  const policy = stringValue(value);
  return policy === "none" || policy === "shortAnnotation" || policy === "takeaway"
    ? policy
    : undefined;
}

export function supportedBlockStyleId(
  value: unknown,
  kind: PresentationTaskSlideBlock["kind"]
): PresentationTaskBlockStyleId {
  const id = stringValue(value);
  if (BLOCK_STYLE_IDS.has(id as PresentationTaskBlockStyleId)) {
    return id as PresentationTaskBlockStyleId;
  }
  if (kind === "visual") return "visualContain";
  if (kind === "callout") return "callout";
  return "textStackTopLeft";
}

export function supportedBlockKind(
  value: unknown,
  visualRequest: PresentationTaskVisualRequest | null
): PresentationTaskSlideBlock["kind"] {
  const kind = stringValue(value);
  if (kind === "textStack" || kind === "visual" || kind === "list" || kind === "callout") {
    return kind;
  }
  return visualRequest ? "visual" : "textStack";
}
