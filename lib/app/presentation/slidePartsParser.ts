import type {
  PresentationTaskSlideLayoutItem,
  PresentationTaskSlidePlan,
} from "@/types/task";
import type { BulletItem } from "@/lib/app/presentation/presentationTypes";

export const SLIDE_PART_ROLES = {
  title: ["タイトル", "title"],
  message: [
    "狙い",
    "副題",
    "サブタイトル",
    "主メッセージ",
    "メッセージ",
    "伝えること",
    "目的",
  ],
  visual: [
    "キービジュアル",
    "ビジュアル",
    "図表",
    "図",
    "地図",
    "工程図",
    "イメージ",
    "画像",
    "写真",
    "アイコン",
  ],
} as const;

export function cleanBulletPrefix(value: string) {
  return value.replace(/^\s*-\s*/, "").replace(/^\s*-\s*/, "").trim();
}

function splitListValue(value: string) {
  return value
    .split(/[、,，]|(?:\s*\/\s*)/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractLabelValue(value: string) {
  const line = cleanBulletPrefix(value);
  const match = line.match(/^([^:：]+)[:：]\s*(.*)$/u);
  if (!match) return null;
  return {
    label: match[1].trim(),
    value: match[2].trim(),
  };
}

function cleanDisplayText(value: string) {
  return value
    .replace(/^\[+|\]+$/g, "")
    .replace(/^[「"']+|[」"']+$/g, "")
    .trim();
}

function emptyStructuredSlideContent(): PresentationTaskSlidePlan["structuredContent"] {
  return {
    title: "",
    mainMessage: "",
    facts: [],
    visual: {
      brief: "",
      supportingFacts: [],
    },
    layout: {
      instruction: "",
      elements: [],
    },
  };
}

function syncStructuredSlideContent(slide: PresentationTaskSlidePlan) {
  slide.structuredContent = {
    title: slide.title,
    mainMessage: slide.keyMessage,
    facts: [...slide.supportingInfo],
    visual: {
      brief: slide.keyVisual,
      supportingFacts: [...slide.visualSupportingInfo],
    },
    layout: {
      instruction: slide.placementComposition,
      elements: [...slide.layoutItems],
    },
  };
}

function buildSlideFromParts(args: {
  slideNumber: number;
  sectionLabel?: string;
  placementComposition?: string;
  layoutItems: PresentationTaskSlideLayoutItem[];
}): PresentationTaskSlidePlan {
  const slide: PresentationTaskSlidePlan = {
    slideNumber: args.slideNumber,
    sectionLabel: args.sectionLabel || "",
    title: "",
    keyMessage: "",
    supportingInfo: [],
    keyVisual: "",
    visualSupportingInfo: [],
    placementComposition: args.placementComposition || "",
    layoutItems: args.layoutItems,
    structuredContent: emptyStructuredSlideContent(),
  };

  syncStructuredSlideContent(slide);
  slide.title = slideDisplayTitle(slide, "");
  slide.keyMessage = slideDisplayMessage(slide);
  slide.keyVisual = slideDisplayVisual(slide);
  syncStructuredSlideContent(slide);
  return slide;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function extractJsonCandidate(lines: string[]) {
  const joined = lines
    .map((line) => cleanBulletPrefix(line))
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
  if (start < 0) return joined;
  return joined.slice(start).trim();
}

export function parsePresentationTaskSlidesFromJsonLines(
  lines: string[]
): PresentationTaskSlidePlan[] {
  if (lines.length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonCandidate(lines));
  } catch {
    return [];
  }

  const root = objectValue(parsed);
  const slideValues = root ? arrayValue(root.slides) : arrayValue(parsed);
  return slideValues
    .map((value, index) => {
      const slideObject = objectValue(value);
      if (!slideObject) return null;
      const slideNumber =
        numberValue(slideObject.slideNumber) ||
        numberValue(slideObject.number) ||
        index + 1;
      const rawParts =
        arrayValue(slideObject.parts).length > 0
          ? arrayValue(slideObject.parts)
          : arrayValue(slideObject.layoutItems);
      const layoutItems = rawParts
        .map((part) => {
          const partObject = objectValue(part);
          if (!partObject) return null;
          const region =
            stringValue(partObject.role) ||
            stringValue(partObject.region) ||
            stringValue(partObject.name);
          const text =
            stringValue(partObject.text) ||
            stringValue(partObject.value) ||
            stringValue(partObject.prompt);
          if (!region && !text) return null;
          return { region, text };
        })
        .filter((part): part is PresentationTaskSlideLayoutItem => !!part);
      return buildSlideFromParts({
        slideNumber,
        sectionLabel: stringValue(slideObject.sectionLabel),
        placementComposition:
          stringValue(slideObject.placementComposition) ||
          stringValue(slideObject.layout) ||
          stringValue(slideObject.composition),
        layoutItems,
      });
    })
    .filter((slide): slide is PresentationTaskSlidePlan => !!slide);
}

function parseLayoutItem(value: string): PresentationTaskSlideLayoutItem {
  const labeled = extractLabelValue(value);
  if (!labeled) {
    return {
      region: "",
      text: cleanDisplayText(value),
    };
  }
  return {
    region: cleanDisplayText(labeled.label),
    text: cleanDisplayText(labeled.value),
  };
}

function parseLayoutItems(value: string) {
  return value
    .split(/\s*／\s*/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap(parseLayoutItemsFromSegment);
}

function parseLayoutItemsFromSegment(value: string) {
  const trimmed = value.trim();
  const markers = Array.from(
    trimmed.matchAll(/(?:^|\s)([^:：\s]{1,18})[:：]\s*/gu)
  );
  if (markers.length <= 1) return [parseLayoutItem(trimmed)];

  return markers
    .map((marker, index) => {
      const region = cleanDisplayText(marker[1]);
      const start = marker.index! + marker[0].length;
      const end =
        index + 1 < markers.length ? markers[index + 1].index! : trimmed.length;
      return {
        region,
        text: cleanDisplayText(trimmed.slice(start, end)),
      };
    })
    .filter((item) => item.text);
}

export function parsePresentationTaskSlidesFromLines(
  slideItems: string[]
): PresentationTaskSlidePlan[] {
  const slides: PresentationTaskSlidePlan[] = [];
  let current: PresentationTaskSlidePlan | null = null;
  let activeList:
    | "supportingInfo"
    | "visualSupportingInfo"
    | "layoutItems"
    | null = null;

  slideItems.forEach((rawLine) => {
    const line = cleanBulletPrefix(rawLine).replace(/^\*\s*/, "").trim();
    if (!line) return;

    const slideMatch =
      line.match(
        /^スライド\s*(\d+)\s*(?:【([^】]+)】)?\s*[「"]?([^」"]*)[」"]?/u
      ) ||
      line.match(/^(\d+)[.．]\s*(?:【([^】]+)】)?\s*[「"]?([^」"]*)[」"]?/u);
    if (slideMatch) {
      current = {
        slideNumber: Number(slideMatch[1]),
        sectionLabel: slideMatch[2]?.trim() || "",
        title: slideMatch[3]?.trim() || slideMatch[2]?.trim() || "",
        keyMessage: "",
        supportingInfo: [],
        keyVisual: "",
        visualSupportingInfo: [],
        placementComposition: "",
        layoutItems: [],
        structuredContent: emptyStructuredSlideContent(),
      };
      syncStructuredSlideContent(current);
      slides.push(current);
      activeList = null;
      return;
    }

    if (!current) return;
    const labeled = extractLabelValue(line);
    if (!labeled) {
      if (activeList === "layoutItems") {
        current.layoutItems.push(...parseLayoutItems(line));
        syncStructuredSlideContent(current);
      } else if (activeList) {
        current[activeList].push(...splitListValue(line));
        syncStructuredSlideContent(current);
      }
      return;
    }
    const label = labeled.label.replace(/\s+/g, "");
    if (
      label.includes("表示文言") ||
      label.includes("配置する文言") ||
      label.includes("配置するパーツ")
    ) {
      if (labeled.value) current.layoutItems.push(...parseLayoutItems(labeled.value));
      syncStructuredSlideContent(current);
      activeList = "layoutItems";
      return;
    }
    if (
      label.includes("配置") ||
      label.includes("構成")
    ) {
      if (
        label.includes("文言") ||
        label.includes("要素") ||
        label.includes("パーツ")
      ) {
        if (labeled.value) current.layoutItems.push(...parseLayoutItems(labeled.value));
        activeList = "layoutItems";
      } else {
        current.placementComposition = labeled.value;
        activeList = null;
      }
      syncStructuredSlideContent(current);
      return;
    }
    if (activeList === "layoutItems") {
      current.layoutItems.push(...parseLayoutItems(line));
      syncStructuredSlideContent(current);
      return;
    }
    if (label === "タイトル") {
      current.title = labeled.value || current.title;
      syncStructuredSlideContent(current);
      activeList = null;
      return;
    }
    if (label.includes("キーメッセージ") || label.includes("伝えること")) {
      current.keyMessage = labeled.value;
      syncStructuredSlideContent(current);
      activeList = null;
      return;
    }
    if (label.includes("補足情報") || label.includes("補足として使う情報")) {
      current.supportingInfo.push(...splitListValue(labeled.value));
      syncStructuredSlideContent(current);
      activeList = labeled.value ? null : "supportingInfo";
      return;
    }
    if (label.includes("ビジュアル補足") || label.includes("キービジュアル補足")) {
      current.visualSupportingInfo.push(...splitListValue(labeled.value));
      syncStructuredSlideContent(current);
      activeList = labeled.value ? null : "visualSupportingInfo";
      return;
    }
    if (label.includes("キービジュアル") || label === "ビジュアル") {
      current.keyVisual = labeled.value;
      syncStructuredSlideContent(current);
      activeList = null;
      return;
    }
  });

  return slides;
}

function normalizeRoleLabel(value: string) {
  return cleanDisplayText(value)
    .replace(/\s+/g, "")
    .toLowerCase();
}

function findLayoutItemText(
  slide: PresentationTaskSlidePlan,
  labels: string[]
) {
  const normalizedLabels = labels.map((label) => normalizeRoleLabel(label));
  return (
    slide.structuredContent.layout.elements.find((item) =>
      normalizedLabels.some((label) =>
        normalizeRoleLabel(item.region).includes(label)
      )
    )?.text || ""
  );
}

function isLayoutItemRole(
  item: PresentationTaskSlideLayoutItem,
  labels: string[]
) {
  const region = normalizeRoleLabel(item.region);
  return labels.some((label) => region.includes(normalizeRoleLabel(label)));
}

export function displayLayoutItems(slide: PresentationTaskSlidePlan) {
  return slide.structuredContent.layout.elements.filter(
    (item) =>
      item.text &&
      !isLayoutItemRole(item, [
        ...SLIDE_PART_ROLES.title,
        ...SLIDE_PART_ROLES.message,
        ...SLIDE_PART_ROLES.visual,
      ])
  );
}

export function layoutItemBullets(slide: PresentationTaskSlidePlan): BulletItem[] {
  return displayLayoutItems(slide).map((item) => ({
    text: item.region ? `${item.region}: ${item.text}` : item.text,
  }));
}

export function slideDisplayTitle(
  slide: PresentationTaskSlidePlan,
  fallback: string
) {
  return findLayoutItemText(slide, [...SLIDE_PART_ROLES.title]) || slide.title || fallback;
}

export function slideDisplayMessage(slide: PresentationTaskSlidePlan) {
  return (
    findLayoutItemText(slide, [...SLIDE_PART_ROLES.message]) ||
    slide.keyMessage
  );
}

export function slideDisplayVisual(slide: PresentationTaskSlidePlan) {
  return (
    findLayoutItemText(slide, [...SLIDE_PART_ROLES.visual]) ||
    slide.keyVisual
  );
}

function normalizedSlideParts(slide: PresentationTaskSlidePlan) {
  if (slide.structuredContent.layout.elements.length > 0) {
    return slide.structuredContent.layout.elements;
  }

  const parts: PresentationTaskSlideLayoutItem[] = [];
  if (slide.title) parts.push({ region: "タイトル", text: slide.title });
  if (slide.keyVisual) {
    parts.push({ region: "キービジュアル", text: slide.keyVisual });
  }
  if (slide.keyMessage) {
    parts.push({ region: "主メッセージ", text: slide.keyMessage });
  }
  slide.supportingInfo.forEach((item, index) => {
    parts.push({ region: `ポイント${index + 1}`, text: item });
  });
  return parts;
}

export function formatPresentationSlidePlanLines(
  slides: PresentationTaskSlidePlan[]
) {
  if (slides.length === 0) return [];

  const lines: string[] = [];
  slides.forEach((slide, index) => {
    if (index > 0) lines.push("");
    lines.push(`スライド${slide.slideNumber}`);
    lines.push(
      `配置‣構成: ${
        slide.structuredContent.layout.instruction || "未設定"
      }`
    );
    lines.push("配置するパーツ:");
    const parts = normalizedSlideParts(slide);
    if (parts.length === 0) {
      lines.push("- 未設定: 表示する文言を指定してください");
      return;
    }
    parts.forEach((part) => {
      const label = part.region || "パーツ";
      lines.push(`- ${label}: ${part.text}`);
    });
  });
  return lines;
}

export function formatPresentationSlideDesignLines(slideItems: string[]) {
  const slides = parsePresentationTaskSlidesFromLines(slideItems);
  if (slides.length === 0) return slideItems;
  return formatPresentationSlidePlanLines(slides);
}
