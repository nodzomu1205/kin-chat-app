import {
  sanitizeReadableSlideFrameTitle as sanitizeReadableSlideFrameTitleValue,
  sanitizeSlideFrameTitle as sanitizeSlideFrameTitleValue,
} from "@/lib/app/presentation/presentationSlideFrameNormalization";

export {
  PRESENTATION_BLOCK_STYLES,
  PRESENTATION_BOOKEND_FRAMES,
  PRESENTATION_LAYOUT_FRAMES,
  PRESENTATION_MASTER_FRAMES,
} from "@/lib/app/presentation/presentationSlideFrameDefinitions";
export {
  hasRenderablePresentationSlideFrames,
  parsePresentationSlideFrameDocumentFromJsonLines,
  parsePresentationSlideFramesFromJsonLines,
  type PresentationSlideFrameDocument,
} from "@/lib/app/presentation/presentationSlideFrameParsing";
export { buildPresentationSpecFromSlideFrames } from "@/lib/app/presentation/presentationSlideFrameSpecBuilder";
export { formatPresentationSlideFramePlanLines } from "@/lib/app/presentation/presentationSlideFrameFormatting";

export function sanitizeReadableSlideFrameTitle(value: string) {
  return sanitizeReadableSlideFrameTitleValue(value);
}

export function sanitizeSlideFrameTitle(value: string) {
  return sanitizeSlideFrameTitleValue(value);
}