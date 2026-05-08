import type {
  PresentationTaskBookendFrameId,
  PresentationTaskDeckFrame,
  PresentationTaskMasterFrameId,
  PresentationTaskSlideFrame,
  PresentationTaskVisualRequest,
} from "@/types/task";
import {
  supportedBookendFrameId,
  supportedLogoPosition,
  supportedMasterFrameId,
  supportedPageNumberPosition,
  supportedPageNumberScope,
} from "@/lib/app/presentation/presentationSlideFrameSupportedValues";
import {
  numberValue,
  objectValue,
  positiveNumberValue,
  stringArray,
  stringValue,
} from "@/lib/app/presentation/presentationSlideFrameValueUtils";

type NormalizeVisualRequest = (value: unknown) => PresentationTaskVisualRequest | null;

export function normalizeDeckFrame(
  root: Record<string, unknown> | null,
  slideFrames: PresentationTaskSlideFrame[],
  normalizeVisualRequest: NormalizeVisualRequest
): PresentationTaskDeckFrame | undefined {
  if (slideFrames.length === 0) return undefined;
  const candidate =
    objectValue(root?.deckFrame) ||
    objectValue(root?.globalFrame) ||
    objectValue(root?.slideMaster) ||
    {};
  const inferredMaster = mostCommonMasterFrameId(slideFrames);
  const pageNumber = objectValue(candidate.pageNumber);
  const logo = objectValue(candidate.logo);
  const typography = objectValue(candidate.typography);
  return {
    slideCount: numberValue(candidate.slideCount || candidate.pageCount) || slideFrames.length,
    masterFrameId: supportedMasterFrameId(candidate.masterFrameId || inferredMaster),
    background: stringValue(candidate.background) || undefined,
    wallpaper: stringValue(candidate.wallpaper) || undefined,
    typography: typography
      ? {
          fontFamily: stringValue(typography.fontFamily) || undefined,
          bodyScale: positiveNumberValue(typography.bodyScale),
          itemScale: positiveNumberValue(typography.itemScale),
        }
      : undefined,
    pageNumber: {
      enabled:
        typeof pageNumber?.enabled === "boolean"
          ? pageNumber.enabled
          : stringValue(candidate.pageNumber).toLowerCase() !== "none",
      position: supportedPageNumberPosition(pageNumber?.position),
      style: stringValue(pageNumber?.style) || "n / total",
      scope: supportedPageNumberScope(pageNumber?.scope),
    },
    openingSlide: normalizeBookendSlide(
      candidate.openingSlide,
      "titleCover",
      normalizeVisualRequest
    ),
    closingSlide: normalizeBookendSlide(
      candidate.closingSlide,
      "endSlide",
      normalizeVisualRequest
    ),
    logo: {
      enabled:
        typeof logo?.enabled === "boolean"
          ? logo.enabled
          : !!stringValue(candidate.logo),
      position: supportedLogoPosition(logo?.position),
      label: stringValue(logo?.label || candidate.logo) || undefined,
    },
  };
}

function normalizeBookendSlide(
  value: unknown,
  fallbackFrameId: PresentationTaskBookendFrameId,
  normalizeVisualRequest: NormalizeVisualRequest
): PresentationTaskDeckFrame["openingSlide"] | undefined {
  const candidate = objectValue(value);
  if (!candidate) return undefined;
  const enabled =
    typeof candidate.enabled === "boolean" ? candidate.enabled : stringValue(value) !== "none";
  if (!enabled) {
    return {
      enabled: false,
      frameId: fallbackFrameId,
    };
  }
  return {
    enabled: true,
    frameId: supportedBookendFrameId(candidate.frameId, fallbackFrameId),
    title: stringValue(candidate.title) || undefined,
    subtitle: stringValue(candidate.subtitle) || undefined,
    message: stringValue(candidate.message) || undefined,
    kicker: stringValue(candidate.kicker) || undefined,
    presenter: stringValue(candidate.presenter) || undefined,
    date: stringValue(candidate.date) || undefined,
    nextSteps: stringArray(candidate.nextSteps),
    contact: stringValue(candidate.contact) || undefined,
    notes: stringValue(candidate.notes) || undefined,
    visualRequest: normalizeVisualRequest(candidate.visualRequest) || undefined,
  };
}

function mostCommonMasterFrameId(
  slideFrames: PresentationTaskSlideFrame[]
): PresentationTaskMasterFrameId {
  const counts = new Map<PresentationTaskMasterFrameId, number>();
  slideFrames.forEach((frame) => {
    counts.set(frame.masterFrameId, (counts.get(frame.masterFrameId) || 0) + 1);
  });
  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "titleLineFooter"
  );
}
