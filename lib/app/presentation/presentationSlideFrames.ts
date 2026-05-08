import type {
  PresentationTaskBookendFrameId,
  PresentationTaskDeckFrame,
  PresentationTaskLayoutFrameId,
  PresentationTaskMasterFrameId,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualRequest,
} from "@/types/task";
import type { PresentationSpec } from "@/lib/app/presentation/presentationTypes";
import { buildSlideSpecFromFrame } from "@/lib/app/presentation/presentationSlideFrameSpecBuilder";
import {
  normalizeVisualRequestType,
  supportedBlockKind,
  supportedBlockStyleId,
  supportedBookendFrameId,
  supportedFontSize,
  supportedLayoutFrameId,
  supportedLogoPosition,
  supportedMasterFrameId,
  supportedNotePolicy,
  supportedPageNumberPosition,
  supportedPageNumberScope,
  supportedSlideRole,
  supportedTextPlacement,
  supportedVisualPlacement,
  supportedVisualUsagePolicy,
} from "@/lib/app/presentation/presentationSlideFrameSupportedValues";
import {
  arrayValue,
  numberValue,
  objectValue,
  parseJsonValueFromLines,
  positiveNumberValue,
  stringArray,
  stringValue,
} from "@/lib/app/presentation/presentationSlideFrameValueUtils";
export {
  PRESENTATION_BLOCK_STYLES,
  PRESENTATION_BOOKEND_FRAMES,
  PRESENTATION_LAYOUT_FRAMES,
  PRESENTATION_MASTER_FRAMES,
} from "@/lib/app/presentation/presentationSlideFrameDefinitions";

export type PresentationSlideFrameDocument = {
  deckFrame?: PresentationTaskDeckFrame;
  slideFrames: PresentationTaskSlideFrame[];
};

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
    deckFrame: normalizeDeckFrame(root, slideFrames),
    slideFrames,
  };
}

export function parsePresentationSlideFramesFromJsonLines(
  lines: string[]
): PresentationTaskSlideFrame[] {
  return parsePresentationSlideFrameDocumentFromJsonLines(lines).slideFrames;
}

export function formatPresentationSlideFramePlanLines(
  frames: PresentationTaskSlideFrame[],
  deckFrame?: PresentationTaskDeckFrame
) {
  const lines: string[] = [];
  if (deckFrame) {
    lines.push("全体設定");
    lines.push(`- 想定ページ数: ${deckFrame.slideCount || frames.length}枚`);
    lines.push(`- 共通マスター: ${deckFrame.masterFrameId}`);
    lines.push(`- 背景・壁紙: ${deckFrame.wallpaper || deckFrame.background || "指定なし"}`);
    lines.push(
      `- ページ番号: ${
        deckFrame.pageNumber?.enabled
          ? `${deckFrame.pageNumber.position || "bottomRight"} / ${deckFrame.pageNumber.style || "n / total"} / ${deckFrame.pageNumber.scope || "bodyOnly"}`
          : "なし"
      }`
    );
    if (deckFrame.openingSlide?.enabled) {
      lines.push(
        `- Opening slide: ${deckFrame.openingSlide.frameId} / ${deckFrame.openingSlide.title || "deck title"}`
      );
      if (
        deckFrame.openingSlide.frameId === "visualTitleCover" &&
        deckFrame.openingSlide.visualRequest
      ) {
        formatStageOneVisualDisplayLines({
          id: "openingVisual",
          kind: "visual",
          styleId: "visualCover",
          visualRequest: deckFrame.openingSlide.visualRequest,
        }).forEach((line) => lines.push(line));
      }
    }
    if (deckFrame.closingSlide?.enabled) {
      lines.push(
        `- Closing slide: ${deckFrame.closingSlide.frameId} / ${deckFrame.closingSlide.title || "- END -"}`
      );
    }
    lines.push(
      `- ロゴ: ${
        deckFrame.logo?.enabled
          ? `${deckFrame.logo.position || "topRight"}${deckFrame.logo.label ? ` / ${deckFrame.logo.label}` : ""}`
          : "なし"
      }`
    );
    lines.push("");
  }
  frames.forEach((frame, index) => {
    if (index > 0) lines.push("");
    lines.push(`Slide ${frame.slideNumber}: ${frame.title || "Untitled"}`);
    lines.push(
      deckFrame?.masterFrameId === frame.masterFrameId
        ? `Frame: ${frame.layoutFrameId}`
        : `Frame: ${frame.masterFrameId} / ${frame.layoutFrameId}`
    );
    if (frame.slideRole) lines.push(`Role: ${frame.slideRole}`);
    if (frame.layoutIntent) {
      lines.push(
        [
          "Layout intent:",
          frame.layoutIntent.textPlacement
            ? `text=${frame.layoutIntent.textPlacement}`
            : "",
          frame.layoutIntent.visualPlacement
            ? `visual=${frame.layoutIntent.visualPlacement}`
            : "",
          frame.layoutIntent.notePolicy
            ? `note=${frame.layoutIntent.notePolicy}`
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
    }
    frame.blocks.forEach((block) => {
      formatReadableBlockDisplayLines(block, frame).forEach((line) => lines.push(line));
    });
  });
  return lines;
}

export function buildPresentationSpecFromSlideFrames(args: {
  title: string;
  frames: PresentationTaskSlideFrame[];
  strategyItems?: string[];
}): PresentationSpec {
  return {
    version: "0.1",
    title: args.title || "Presentation",
    language: "ja",
    audience: findStrategyValue(args.strategyItems || [], "audience"),
    purpose: findStrategyValue(args.strategyItems || [], "purpose"),
    theme: "business-clean",
    density: "standard",
    slides: args.frames.map((frame) => buildSlideSpecFromFrame(frame)),
  };
}

export function hasRenderablePresentationSlideFrames(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function normalizeSlideFrame(
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

function normalizeDeckFrame(
  root: Record<string, unknown> | null,
  slideFrames: PresentationTaskSlideFrame[]
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
    openingSlide: normalizeBookendSlide(candidate.openingSlide, "titleCover"),
    closingSlide: normalizeBookendSlide(candidate.closingSlide, "endSlide"),
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
  fallbackFrameId: PresentationTaskBookendFrameId
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

function normalizeVisualRequest(value: unknown): PresentationTaskVisualRequest | null {
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

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeBlockRenderStyle(
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


function formatReadableBlockDisplayLines(
  block: PresentationTaskSlideBlock,
  frame?: PresentationTaskSlideFrame
) {
  const lines = [`- ${block.id} ${block.kind} (${block.styleId})`];
  if (
    frame?.layoutFrameId === "adaptiveVisualMain" &&
    !block.visualRequest
  ) {
    if (block.text) lines.push(`  - 表示本文: ${block.text}`);
    return lines;
  }
  if (block.heading) lines.push(`  - 表示見出し: ${block.heading}`);
  if (block.text) lines.push(`  - 表示本文: ${block.text}`);
  if (block.items?.length) {
    lines.push("  - 表示項目:");
    block.items.forEach((item) => lines.push(`    - ${item}`));
  }
  if (block.visualRequest) {
    formatStageOneVisualDisplayLines(block).forEach((line) => lines.push(line));
    return lines;
  }
  return lines;
}

function formatStageOneVisualDisplayLines(block: PresentationTaskSlideBlock) {
  const visual = block.visualRequest;
  if (!visual) return [];

  const lines: string[] = [];
  const slots = (visual.visualSlots || [])
    .filter((slot) => slot.need.trim() || slot.label.trim())
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (slots.length > 0) {
    slots.forEach((slot, index) => {
      lines.push(`  - Visual slot ${index + 1}:`);
      lines.push(`    - ビジュアルプロンプト: ${slot.need}`);
      lines.push(`    - ビジュアル内表示ラベル: ${slot.label || visual.labels?.[index] || visual.brief || "未設定"}`);
      const selectedImageId = selectedImageIdForVisualSlot(visual, slot.slotId, index);
      if (selectedImageId) {
        lines.push(`    - 選択済み画像: ${selectedImageId}`);
      }
    });
    return lines;
  }
  if (visual.prompt) {
    lines.push(`  - ビジュアルプロンプト: ${visual.prompt}`);
  } else {
    lines.push(`  - Visual prompt: prompt needed${visual.promptNote ? ` (${visual.promptNote})` : ""}`);
  }

  const displayLabel = visual.labels?.find((label) => label.trim()) || visual.brief;
  if (displayLabel) {
    lines.push(`  - ビジュアル内表示ラベル: ${displayLabel}`);
  }
  const selectedImageIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  );
  if (selectedImageIds.length > 0) {
    lines.push(`  - 選択済み画像: ${selectedImageIds.join(", ")}`);
  }

  return lines;
}

function selectedImageIdForVisualSlot(
  visual: NonNullable<PresentationTaskSlideBlock["visualRequest"]>,
  slotId: string,
  slotIndex: number
) {
  const match = (visual.selectionMatches || []).find(
    (item) => item.slotId === slotId && item.status === "selected" && item.imageId
  );
  if (match?.imageId) return match.imageId;
  const selectedIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  );
  return selectedIds[slotIndex] || (slotIndex === 0 ? selectedIds[0] || "" : "");
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

function findStrategyValue(items: string[], key: string) {
  const matched = items.find((item) =>
    item.toLowerCase().startsWith(`${key.toLowerCase()}:`)
  );
  return matched?.replace(new RegExp(`^${key}\\s*:\\s*`, "i"), "").trim() || undefined;
}

export function sanitizeReadableSlideFrameTitle(value: string) {
  return value
    .replace(/\s*[（(]\s*見出し\s*なし\s*[）)]\s*/g, "")
    .replace(/\s*[（(]\s*heading\s*none\s*[）)]\s*/gi, "")
    .trim();
}

export function sanitizeSlideFrameTitle(value: string) {
  return value
    .replace(/\s*[（(]\s*見出し\s*なし\s*[）)]\s*/g, "")
    .replace(/\s*[・・]\s*heading\s*none\s*[・・]\s*/gi, "")
    .trim();
}
