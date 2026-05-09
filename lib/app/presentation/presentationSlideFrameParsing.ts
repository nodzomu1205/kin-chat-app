import type {
  PresentationTaskDeckFrame,
  PresentationTaskSlideFrame,
} from "@/types/task";
import { normalizeDeckFrame } from "@/lib/app/presentation/presentationSlideFrameDeckFrame";
import { normalizeSlideFrame } from "@/lib/app/presentation/presentationSlideFrameNormalization";
import { normalizeVisualRequest } from "@/lib/app/presentation/presentationSlideFrameVisualRequest";
import {
  arrayValue,
  objectValue,
  parseJsonValueFromLines,
} from "@/lib/app/presentation/presentationSlideFrameValueUtils";

export type PresentationSlideFrameDocument = {
  deckFrame?: PresentationTaskDeckFrame;
  slideFrames: PresentationTaskSlideFrame[];
};

export function parsePresentationSlideFrameDocumentFromJsonLines(
  lines: string[]
): PresentationSlideFrameDocument {
  const parsed = parseJsonValueFromLines(lines);
  if (!parsed) return { slideFrames: [] };

  const root = objectValue(parsed);
  const slideValues = root
    ? arrayValue(root.slideFrames || root.slides)
    : arrayValue(parsed);
  const slideFrames = slideValues
    .map((value, index) => normalizeSlideFrame(value, index))
    .filter((frame): frame is PresentationTaskSlideFrame => !!frame);

  return {
    deckFrame: normalizeDeckFrame(root, slideFrames, normalizeVisualRequest),
    slideFrames,
  };
}

export function parsePresentationSlideFramesFromJsonLines(
  lines: string[]
): PresentationTaskSlideFrame[] {
  return parsePresentationSlideFrameDocumentFromJsonLines(lines).slideFrames;
}

export function hasRenderablePresentationSlideFrames(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}
