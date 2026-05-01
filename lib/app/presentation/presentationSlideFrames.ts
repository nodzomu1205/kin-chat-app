import type {
  PresentationTaskBlockStyleId,
  PresentationTaskDeckFrame,
  PresentationTaskLayoutFrameId,
  PresentationTaskMasterFrameId,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualRequest,
} from "@/types/task";
import type {
  BulletItem,
  CardContent,
  ColumnContent,
  PresentationSpec,
  SlideSpec,
} from "@/lib/app/presentation/presentationTypes";

type FrameDefinition<TId extends string> = {
  id: TId;
  label: string;
  description: string;
};

export const PRESENTATION_MASTER_FRAMES: Array<
  FrameDefinition<PresentationTaskMasterFrameId>
> = [
  {
    id: "plain",
    label: "Plain",
    description: "No fixed title band or footer decoration.",
  },
  {
    id: "titleLineFooter",
    label: "Title line + footer",
    description: "Top title area, thin separator, and page footer.",
  },
  {
    id: "logoHeaderFooter",
    label: "Logo header + footer",
    description: "Header area with optional logo slot and footer.",
  },
  {
    id: "fullBleedVisual",
    label: "Full bleed visual",
    description: "Visual-first slide with minimal chrome.",
  },
];

export const PRESENTATION_LAYOUT_FRAMES: Array<
  FrameDefinition<PresentationTaskLayoutFrameId> & { blockIds: string[] }
> = [
  {
    id: "singleCenter",
    label: "Single center",
    description: "One centered block for a strong statement or visual.",
    blockIds: ["block1"],
  },
  {
    id: "titleBody",
    label: "Title + body",
    description: "Main message followed by supporting text or bullets.",
    blockIds: ["block1"],
  },
  {
    id: "leftRight50",
    label: "Left 50 / Right 50",
    description: "Two equally weighted blocks.",
    blockIds: ["block1", "block2"],
  },
  {
    id: "visualLeftTextRight",
    label: "Visual left / text right",
    description: "Visual block on the left, message stack on the right.",
    blockIds: ["block1", "block2"],
  },
  {
    id: "textLeftVisualRight",
    label: "Text left / visual right",
    description: "Message stack on the left, visual block on the right.",
    blockIds: ["block1", "block2"],
  },
  {
    id: "heroTopDetailsBottom",
    label: "Hero top / details bottom",
    description: "Large top block with compact supporting blocks below.",
    blockIds: ["block1", "block2", "block3"],
  },
  {
    id: "threeColumns",
    label: "Three columns",
    description: "Three parallel blocks with equal emphasis.",
    blockIds: ["block1", "block2", "block3"],
  },
  {
    id: "twoByTwoGrid",
    label: "2 x 2 grid",
    description: "Four compact blocks for categories or options.",
    blockIds: ["block1", "block2", "block3", "block4"],
  },
];

export const PRESENTATION_BLOCK_STYLES: Array<
  FrameDefinition<PresentationTaskBlockStyleId>
> = [
  {
    id: "headlineCenter",
    label: "Headline center",
    description: "Large centered headline treatment.",
  },
  {
    id: "textStackTopLeft",
    label: "Text stack top-left",
    description: "Heading plus body/items aligned to the top-left.",
  },
  {
    id: "listCompact",
    label: "Compact list",
    description: "Dense list treatment for supporting points.",
  },
  {
    id: "visualContain",
    label: "Visual contain",
    description: "Visual request contained inside the block.",
  },
  {
    id: "visualCover",
    label: "Visual cover",
    description: "Visual request may fill or bleed beyond the block.",
  },
  {
    id: "callout",
    label: "Callout",
    description: "Emphasized note or conclusion.",
  },
];

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
          ? `${deckFrame.pageNumber.position || "bottomRight"} / ${deckFrame.pageNumber.style || "n / total"}`
          : "なし"
      }`
    );
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
    lines.push(`Frame: ${frame.masterFrameId} / ${frame.layoutFrameId}`);
    frame.blocks.forEach((block) => {
      formatBlockDisplayLines(block).forEach((line) => lines.push(line));
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
    slides: args.frames.map((frame, index) => buildSlideSpecFromFrame(frame, index)),
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
      sanitizeSlideFrameTitle(stringValue(candidate.title || candidate.heading)) ||
      `Slide ${index + 1}`,
    masterFrameId: supportedMasterFrameId(candidate.masterFrameId),
    layoutFrameId,
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
    },
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

function supportedPageNumberPosition(
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

function supportedLogoPosition(
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
  const labels = stringArray(candidate.labels);
  if (!brief && !prompt && !promptNote && labels.length === 0) return null;
  return {
    type: VISUAL_TYPES.has(type) ? (type as PresentationTaskVisualRequest["type"]) : "diagram",
    brief,
    prompt: prompt || undefined,
    promptNote: promptNote || undefined,
    labels: labels.length > 0 ? labels : undefined,
    renderStyle: normalizeVisualRenderStyle(candidate.renderStyle),
  };
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
  if (!fontSize && !itemFontSize && showHeading === undefined) return undefined;
  return { fontSize, itemFontSize, showHeading };
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

function supportedFontSize(value: unknown) {
  const raw = stringValue(value);
  return raw === "small" || raw === "standard" || raw === "large" || raw === "xlarge"
    ? raw
    : undefined;
}

function buildSlideSpecFromFrame(
  frame: PresentationTaskSlideFrame,
  index: number
): SlideSpec {
  if (frame.layoutFrameId === "singleCenter") {
    const primary = frame.blocks[0];
    return {
      type: "title",
      title: frame.title,
      subtitle: blockMessage(primary) || undefined,
      keyVisual: blockVisualText(primary) || visualBlock(frame)?.visualRequest?.brief,
      notes: frame.speakerIntent,
    };
  }

  if (
    frame.layoutFrameId === "visualLeftTextRight" ||
    frame.layoutFrameId === "textLeftVisualRight" ||
    frame.layoutFrameId === "leftRight50"
  ) {
    const [first, second] = frame.blocks;
    return {
      type: "twoColumn",
      title: frame.title,
      layoutVariant:
        frame.layoutFrameId === "visualLeftTextRight"
          ? "visualLeftTextRight"
          : frame.layoutFrameId === "textLeftVisualRight"
            ? "textLeftVisualRight"
            : undefined,
      left: buildColumn(first, "Left"),
      right: buildColumn(second, "Right"),
      takeaway: frame.blocks.find((block) => block.kind === "callout")?.text,
      notes: frame.speakerIntent,
    };
  }

  if (
    frame.layoutFrameId === "threeColumns" ||
    frame.layoutFrameId === "twoByTwoGrid" ||
    frame.layoutFrameId === "heroTopDetailsBottom"
  ) {
    return {
      type: "cards",
      title: frame.title,
      layoutVariant: frame.layoutFrameId,
      cards: frame.blocks.map(blockToCard),
      notes: frame.speakerIntent,
    };
  }

  const bullets = frame.blocks.flatMap(blockToBullets);
  return {
    type: "bullets",
    title: frame.title,
    lead: blockMessage(frame.blocks[0]) || undefined,
    bullets: bullets.length > 0 ? bullets : [{ text: "Content to be refined" }],
    takeaway: frame.blocks.find((block) => block.kind === "callout")?.text,
    notes: frame.speakerIntent,
  };
}

function buildColumn(
  block: PresentationTaskSlideBlock | undefined,
  fallbackHeading: string
): ColumnContent {
  if (!block) {
    return { heading: fallbackHeading, bullets: [{ text: "Content to be refined" }] };
  }
  const visualText = blockVisualText(block);
  if (block.visualRequest) {
    return {
      heading: visualText || fallbackHeading,
      bullets: blockToBullets(block),
    };
  }
  return {
    heading: block.heading || visualText || fallbackHeading,
    body: block.text,
    bullets: blockToBullets(block),
  };
}

function blockToCard(block: PresentationTaskSlideBlock): CardContent {
  const visualText = blockVisualText(block);
  return {
    title: block.heading || visualText || block.id,
    body: block.text || undefined,
    bullets: blockToBullets(block),
    kind: block.visualRequest
      ? "visual"
      : block.kind === "callout" || block.styleId === "callout"
        ? "callout"
        : "text",
  };
}

function blockToBullets(block: PresentationTaskSlideBlock | undefined): BulletItem[] {
  if (!block) return [];
  const bullets: BulletItem[] = [];
  (block.items || []).forEach((text) => bullets.push({ text }));
  if (block.visualRequest?.prompt) {
    bullets.push({ text: `Prompt: ${block.visualRequest.prompt}`, emphasis: "muted" });
  } else if (block.visualRequest?.promptNote) {
    bullets.push({
      text: `Prompt needed: ${block.visualRequest.promptNote}`,
      emphasis: "muted",
    });
  }
  if (block.visualRequest?.labels?.length) {
    bullets.push({ text: `Labels: ${block.visualRequest.labels.join(", ")}`, emphasis: "muted" });
  }
  return bullets;
}

function visualBlock(frame: PresentationTaskSlideFrame) {
  return frame.blocks.find((block) => block.visualRequest);
}

function blockMessage(block: PresentationTaskSlideBlock | undefined) {
  if (!block) return "";
  return block.text || "";
}

function blockVisualText(block: PresentationTaskSlideBlock | undefined) {
  if (!block?.visualRequest) return "";
  return block.visualRequest.brief || block.visualRequest.prompt || "";
}

function formatBlockDisplayLines(block: PresentationTaskSlideBlock) {
  const lines = [`- ${block.id} ${block.kind} (${block.styleId})`];
  if (block.heading) lines.push(`  - 表示見出し: ${block.heading}`);
  if (block.text) lines.push(`  - 表示本文: ${block.text}`);
  if (block.items?.length) {
    lines.push("  - 表示項目:");
    block.items.forEach((item) => lines.push(`    - ${item}`));
  }
  if (block.visualRequest) {
    lines.push(`  - ビジュアル種別: ${block.visualRequest.type}`);
    if (block.visualRequest.brief) {
      lines.push(`  - ビジュアル概要: ${block.visualRequest.brief}`);
    }
    if (block.visualRequest.prompt) {
      lines.push(`  - ビジュアルプロンプト: ${block.visualRequest.prompt}`);
    } else {
      lines.push(
        `  - ビジュアルプロンプト: 別途プロンプト生成必要${
          block.visualRequest.promptNote ? `（${block.visualRequest.promptNote}）` : ""
        }`
      );
    }
    if (block.visualRequest.labels?.length) {
      lines.push("  - ビジュアル内表示ラベル:");
      block.visualRequest.labels.forEach((label) => lines.push(`    - ${label}`));
    }
    if (block.visualRequest.asset?.imageId) {
      lines.push(`  - Image ID: ${block.visualRequest.asset.imageId}`);
    }
  }
  return lines;
}

function supportedMasterFrameId(value: unknown): PresentationTaskMasterFrameId {
  const id = stringValue(value);
  return MASTER_FRAME_IDS.has(id as PresentationTaskMasterFrameId)
    ? (id as PresentationTaskMasterFrameId)
    : "titleLineFooter";
}

function supportedLayoutFrameId(value: unknown): PresentationTaskLayoutFrameId {
  const id = stringValue(value);
  return LAYOUT_FRAME_IDS.has(id as PresentationTaskLayoutFrameId)
    ? (id as PresentationTaskLayoutFrameId)
    : "titleBody";
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

function supportedBlockStyleId(
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

function supportedBlockKind(
  value: unknown,
  visualRequest: PresentationTaskVisualRequest | null
): PresentationTaskSlideBlock["kind"] {
  const kind = stringValue(value);
  if (kind === "textStack" || kind === "visual" || kind === "list" || kind === "callout") {
    return kind;
  }
  return visualRequest ? "visual" : "textStack";
}

function findStrategyValue(items: string[], key: string) {
  const matched = items.find((item) =>
    item.toLowerCase().startsWith(`${key.toLowerCase()}:`)
  );
  return matched?.replace(new RegExp(`^${key}\\s*:\\s*`, "i"), "").trim() || undefined;
}

function extractJsonCandidate(lines: string[]) {
  const joined = lines
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .join("\n")
    .trim();
  const fenced = joined.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;
  const firstArray = joined.indexOf("[");
  const firstObject = joined.indexOf("{");
  const start =
    firstArray >= 0 && firstObject >= 0
      ? Math.min(firstArray, firstObject)
      : Math.max(firstArray, firstObject);
  return start >= 0 ? joined.slice(start).trim() : joined;
}

function parseJsonValueFromLines(lines: string[]) {
  if (lines.length === 0) return null;
  try {
    return JSON.parse(extractJsonCandidate(lines));
  } catch {
    return null;
  }
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

export function sanitizeSlideFrameTitle(value: string) {
  return value
    .replace(/\s*[（(]\s*見出し\s*なし\s*[）)]\s*/g, "")
    .replace(/\s*[（(]\s*heading\s*none\s*[）)]\s*/gi, "")
    .trim();
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean);
  const text = stringValue(value);
  return text ? [text] : [];
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function positiveNumberValue(value: unknown) {
  const number = numberValue(value);
  return number && number > 0 ? number : undefined;
}
