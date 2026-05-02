import {
  PRESENTATION_BLOCK_STYLES,
  PRESENTATION_BOOKEND_FRAMES,
  PRESENTATION_LAYOUT_FRAMES,
  PRESENTATION_MASTER_FRAMES,
} from "@/lib/app/presentation/presentationSlideFrames";

type PresentationFrameRegistryKind = "master" | "layout" | "blockStyle" | "bookend";

type PresentationFrameRegistryEntry = {
  kind: PresentationFrameRegistryKind;
  id: string;
  label: string;
  description: string;
  blockIds?: string[];
  textStyle?: {
    headingFontSize?: number;
    bodyFontSize?: number;
    itemFontSize?: number;
    headingGapLines?: number;
    bodyGapLines?: number;
    itemGapLines?: number;
    bulletIndent?: number;
    bulletHanging?: number;
    lineSpacingMultiple?: number;
  };
  builtIn: true;
};

export function getPresentationFrameRegistryEntries(): PresentationFrameRegistryEntry[] {
  return [
    ...PRESENTATION_MASTER_FRAMES.map((frame) => ({
      ...frame,
      kind: "master" as const,
      builtIn: true as const,
    })),
    ...PRESENTATION_LAYOUT_FRAMES.map((frame) => ({
      ...frame,
      kind: "layout" as const,
      builtIn: true as const,
    })),
    ...PRESENTATION_BOOKEND_FRAMES.map((frame) => ({
      ...frame,
      kind: "bookend" as const,
      builtIn: true as const,
    })),
    ...PRESENTATION_BLOCK_STYLES.map((frame) => ({
      ...frame,
      kind: "blockStyle" as const,
      builtIn: true as const,
    })),
  ];
}

export function findPresentationFrameRegistryEntry(frameId: string) {
  const normalizedId = frameId.trim();
  return getPresentationFrameRegistryEntries().find(
    (entry) => entry.id === normalizedId
  );
}

export function buildPresentationFrameIndexText() {
  const entries = getPresentationFrameRegistryEntries();
  return [
    "PPT frame registry index.",
    "",
    ...formatFrameGroupLines(
      "Master frames",
      entries.filter((entry) => entry.kind === "master")
    ),
    "",
    ...formatFrameGroupLines(
      "Layout frames",
      entries.filter((entry) => entry.kind === "layout")
    ),
    "",
    ...formatFrameGroupLines(
      "Bookend frames",
      entries.filter((entry) => entry.kind === "bookend")
    ),
    "",
    ...formatFrameGroupLines(
      "Block styles",
      entries.filter((entry) => entry.kind === "blockStyle")
    ),
  ].join("\n");
}

export function buildPresentationFrameJsonText(frameId: string) {
  const entry = findPresentationFrameRegistryEntry(frameId);
  if (!entry) {
    return [
      `PPT frame not found: ${frameId.trim() || "(empty)"}`,
      "",
      "Use `PPT frames: Show index` to see registered frame IDs.",
    ].join("\n");
  }

  return [
    `PPT frame JSON: ${entry.id}`,
    "",
    "```json",
    JSON.stringify(entry, null, 2),
    "```",
  ].join("\n");
}

function formatFrameGroupLines(
  title: string,
  entries: PresentationFrameRegistryEntry[]
) {
  return [
    title,
    ...entries.map((entry) => {
      const suffix = entry.blockIds?.length
        ? ` Blocks: ${entry.blockIds.join(", ")}.`
        : "";
      const styleSuffix = formatTextStyleSummary(entry.textStyle);
      return `- ${entry.id} (${entry.label}): ${entry.description}${suffix}${styleSuffix}`;
    }),
  ];
}

function formatTextStyleSummary(
  textStyle: PresentationFrameRegistryEntry["textStyle"]
) {
  if (!textStyle) return "";
  const parts = [
    textStyle.headingFontSize ? `heading ${textStyle.headingFontSize}pt` : "",
    textStyle.bodyFontSize ? `body ${textStyle.bodyFontSize}pt` : "",
    textStyle.itemFontSize ? `items ${textStyle.itemFontSize}pt` : "",
    textStyle.itemGapLines !== undefined ? `item gap ${textStyle.itemGapLines}` : "",
    textStyle.bulletIndent !== undefined ? `bullet indent ${textStyle.bulletIndent}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? ` Text style: ${parts.join(", ")}.` : "";
}
