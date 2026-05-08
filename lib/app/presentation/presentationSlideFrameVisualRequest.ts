import type {
  PresentationTaskSlideBlock,
  PresentationTaskVisualRequest,
} from "@/types/task";
import {
  normalizeVisualRequestType,
  supportedFontSize,
  supportedVisualUsagePolicy,
} from "@/lib/app/presentation/presentationSlideFrameSupportedValues";
import {
  objectValue,
  stringArray,
  stringValue,
} from "@/lib/app/presentation/presentationSlideFrameValueUtils";

export function normalizeVisualRequest(value: unknown): PresentationTaskVisualRequest | null {
  const candidate = objectValue(value);
  if (!candidate) return null;
  const type = stringValue(candidate.type);
  const brief = stringValue(candidate.brief || candidate.text || candidate.label);
  const prompt = stringValue(candidate.prompt || candidate.generationPrompt);
  const promptNote = stringValue(candidate.promptNote || candidate.promptStatus || candidate.note);
  const visualSlots = normalizeVisualSlots(candidate.visualSlots || candidate.slots);
  const labels = stringArray(candidate.labels || candidate.displayLabels || candidate.label);
  const usagePolicy = supportedVisualUsagePolicy(candidate.usagePolicy);
  const maxVisualItems = positiveInteger(candidate.maxVisualItems);
  if (
    !brief &&
    !prompt &&
    !promptNote &&
    visualSlots.length === 0
  ) return null;
  return {
    type: normalizeVisualRequestType(type, [brief, prompt, promptNote].join(" ")),
    brief,
    prompt: prompt || undefined,
    promptNote: promptNote || undefined,
    visualSlots: visualSlots.length > 0 ? visualSlots : undefined,
    usagePolicy,
    maxVisualItems,
    labels: labels.length > 0 ? labels : undefined,
    renderStyle: normalizeVisualRenderStyle(candidate.renderStyle),
  };
}

export function normalizeBlockRenderStyle(
  value: unknown
): PresentationTaskSlideBlock["renderStyle"] | undefined {
  const candidate = objectValue(value);
  if (!candidate) return undefined;
  const fontSize = supportedFontSize(candidate.fontSize);
  const itemFontSize = supportedFontSize(candidate.itemFontSize);
  const showHeading =
    typeof candidate.showHeading === "boolean" ? candidate.showHeading : undefined;
  const textStyle = normalizeTextStyle(candidate.textStyle);
  if (!fontSize && !itemFontSize && showHeading === undefined && !textStyle) {
    return undefined;
  }
  return { fontSize, itemFontSize, showHeading, textStyle };
}

function normalizeVisualSlots(value: unknown): NonNullable<PresentationTaskVisualRequest["visualSlots"]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const candidate = objectValue(item);
    if (!candidate) return [];
    const label = stringValue(candidate.label || candidate.title || candidate.name);
    const need = stringValue(candidate.need || candidate.query || candidate.description || candidate.text);
    if (!label && !need) return [];
    return [
      {
        slotId: stringValue(candidate.slotId || candidate.id) || `slot${index + 1}`,
        label: label || need,
        need: need || label,
        keywords: uniqueStrings(stringArray(candidate.keywords || candidate.terms)),
        order: positiveInteger(candidate.order) || index + 1,
        maxImages: positiveInteger(candidate.maxImages) || undefined,
      },
    ];
  });
}

function normalizeTextStyle(
  value: unknown
): NonNullable<PresentationTaskSlideBlock["renderStyle"]>["textStyle"] | undefined {
  const candidate = objectValue(value);
  if (!candidate) return undefined;
  const textStyle = {
    headingFontSize: positiveNumber(candidate.headingFontSize),
    bodyFontSize: positiveNumber(candidate.bodyFontSize),
    itemFontSize: positiveNumber(candidate.itemFontSize),
    headingGapLines: nonNegativeNumber(candidate.headingGapLines),
    bodyGapLines: nonNegativeNumber(candidate.bodyGapLines),
    itemGapLines: nonNegativeNumber(candidate.itemGapLines),
    bulletIndent: nonNegativeNumber(candidate.bulletIndent),
    bulletHanging: nonNegativeNumber(candidate.bulletHanging),
    lineSpacingMultiple: positiveNumber(candidate.lineSpacingMultiple),
  };
  return Object.values(textStyle).some((item) => item !== undefined)
    ? textStyle
    : undefined;
}

function normalizeVisualRenderStyle(
  value: unknown
): PresentationTaskVisualRequest["renderStyle"] | undefined {
  const candidate = objectValue(value);
  if (!candidate) return undefined;
  const orientation = stringValue(candidate.orientation);
  const showBrief =
    typeof candidate.showBrief === "boolean" ? candidate.showBrief : undefined;
  const normalizedOrientation =
    orientation === "horizontal" || orientation === "vertical" ? orientation : undefined;
  if (!normalizedOrientation && showBrief === undefined) return undefined;
  return { orientation: normalizedOrientation, showBrief };
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function nonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}
