import type {
  PresentationTaskPlan,
  PresentationTaskSlideFrame,
  PresentationTaskSlidePlan,
  TaskResult,
} from "@/types/task";
import type {
  BulletItem,
  PresentationSpec,
} from "@/lib/app/presentation/presentationTypes";
import {
  cleanBulletPrefix,
  formatPresentationSlidePlanLines,
  formatPresentationSlideDesignLines,
  layoutItemBullets,
  parsePresentationTaskSlidesFromJsonLines,
  parsePresentationTaskSlidesFromLines,
  slideDisplayMessage,
  slideDisplayTitle,
  slideDisplayVisual,
} from "@/lib/app/presentation/slidePartsParser";
import {
  buildPresentationSpecFromSlideFrames,
  formatPresentationSlideFramePlanLines,
  hasRenderablePresentationSlideFrames,
  parsePresentationSlideFrameDocumentFromJsonLines,
  sanitizeSlideFrameTitle,
} from "@/lib/app/presentation/presentationSlideFrames";

const PPT_MARKER = /(?:^|\s)\/ppt(?:\s|$)/i;
const DOCUMENT_ID_LINE = /^Document ID\s*:\s*(.+)$/im;

export function isPresentationTaskInstruction(text: string) {
  return PPT_MARKER.test(text);
}

export function stripPresentationTaskMarker(text: string) {
  return text
    .replace(PPT_MARKER, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export function buildPresentationTaskStructuredInput(args: {
  title?: string;
  userInstruction?: string;
  body?: string;
  material?: string;
  currentPlanText?: string;
  imageLibraryContext?: string;
}) {
  return [
    `プレゼンタイトル: ${args.title?.trim() || "未設定"}`,
    `ユーザー指示: ${args.userInstruction?.trim() || "なし"}`,
    args.currentPlanText?.trim()
      ? `現在のPPT設計書:\n${args.currentPlanText.trim()}`
      : "",
    args.body?.trim() ? `入力本文:\n${args.body.trim()}` : "",
    args.material?.trim() ? `取込素材:\n${args.material.trim()}` : "",
  ]
    .concat(
      args.imageLibraryContext?.trim()
        ? [`Image library reference candidates:\n${args.imageLibraryContext.trim()}`]
        : []
    )
    .filter(Boolean)
    .join("\n\n");
}

export function resolvePresentationTaskTitle(args: {
  presentationMode: boolean;
  explicitTitle?: string;
  currentTitle?: string;
  currentTaskName?: string;
  generatedTitle?: string;
  fallbackTitle: string;
  preserveExistingTitle: boolean;
}) {
  if (!args.presentationMode) {
    return args.generatedTitle || args.fallbackTitle;
  }

  const explicitTitle = args.explicitTitle?.trim();
  if (explicitTitle) return explicitTitle;

  if (args.preserveExistingTitle) {
    const existingTitle =
      args.currentTitle?.trim() || args.currentTaskName?.trim();
    if (existingTitle) return existingTitle;
  }

  return args.generatedTitle || args.fallbackTitle;
}

export function buildPresentationTaskConstraints(mode: "create" | "update") {
  return [
    "This is a PPT design task inside task formation, not a normal task.",
    "Create or revise a Japanese PPT design document that the user can review in chat before PPTX output.",
    "Preserve source breadth first; the user will reduce density later through revision instructions.",
    "Keep extractedItems as atomic facts: one process step, country group, risk, or initiative per bullet. Do not collapse distinct facts into one generic summary.",
    "The canonical slide design source is deckFrame + slideFrames JSON. Natural-language slide design text is only a projection from that JSON.",
    "deckFrame holds deck-wide settings such as page count, common master, background/wallpaper, page number, and logo. Do not repeat common settings on every slide.",
    "In slideFrames, omit masterFrameId unless a slide intentionally overrides deckFrame.masterFrameId.",
    "Do not create slideDesign.slides[].parts as the preferred path. Do not rely on natural-language slide text and a parser to recover JSON.",
    "Use the fixed frame package: one-block layouts need 1 block, two-column layouts need 2, heroTopDetailsBottom and threeColumns need 3, twoByTwoGrid needs 4.",
    "Block styles define fields: listCompact = heading + items; textStackTopLeft = heading + text; visualContain/visualCover = visualRequest only; headlineCenter/callout = one emphasized text.",
    "Choose slide count from the material and strategy. If the source naturally implies 5-7 slides, create 5-7 slideFrames.",
    "The visible chat text must show the actual messages that will appear in PPTX. Do not replace display text or items with counts such as '+ 6 items'.",
    "For visual blocks, include the full visual prompt in visualRequest.prompt. If the visual is too complex to prompt yet, leave prompt empty and explain why in visualRequest.promptNote.",
    "If an image-library candidate semantically fits a visual block, set visualRequest.preferredImageId to its Image ID and still keep a brief/prompt explaining why it fits.",
    "Image-library selection is a two-step decision: first choose whether a candidate is semantically relevant; only after selecting it, use Orientation, Size, and Aspect ratio to choose layoutFrameId, block order, and visual role. Do not reject a semantically fitting image because of aspect ratio alone.",
    "For layout after image selection, landscape images should go in wide/hero visual areas, portrait images should go in vertical/narrow visual areas, and square images should go in balanced visual areas. Avoid defaulting to 50/50 left-right layouts when the selected asset shape would make the image feel cramped or distorted.",
    "If the user gives a revision instruction, preserve reusable frame choices where valid and update the affected slideFrame fields.",
    "Do not invent facts missing from the material. Put missing material in MISSING_INFO.",
    mode === "create"
      ? "For initial creation, use generic frames but keep the deck broad enough that it can be reduced later."
      : "For updates, prioritize the user instruction and modify only the relevant slideFrames while preserving valid existing design.",
  ];
}

function findBlock(result: TaskResult | null, names: string[]) {
  if (!result) return [];
  const normalizedNames = names.map((name) => name.toLowerCase());
  return (
    result.detailBlocks.find((block) =>
      normalizedNames.some((name) => block.title.toLowerCase().includes(name))
    )?.body || []
  );
}

function findExactBlock(result: TaskResult | null, names: string[]) {
  if (!result) return [];
  const normalizedNames = names.map((name) => name.toLowerCase());
  return (
    result.detailBlocks.find((block) =>
      normalizedNames.some((name) => block.title.toLowerCase() === name)
    )?.body || []
  );
}

function parseSectionLines(text: string) {
  const sections: Record<string, string[]> = {};
  let current = "";
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const sectionMatch = line.match(/^■\s*(.+)$/u);
    if (sectionMatch) {
      current = sectionMatch[1].trim();
      sections[current] = sections[current] || [];
      return;
    }
    if (current && line.startsWith("-")) {
      sections[current].push(cleanBulletPrefix(line));
    }
  });
  return sections;
}

function findSection(sections: Record<string, string[]>, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const entry = Object.entries(sections).find(([title]) =>
    normalizedNames.some((name) => title.toLowerCase().includes(name))
  );
  return entry?.[1] || [];
}

function findExactSection(sections: Record<string, string[]>, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const entry = Object.entries(sections).find(([title]) => {
    const normalizedTitle = title.toLowerCase();
    return normalizedNames.some((name) => normalizedTitle === name);
  });
  return entry?.[1] || [];
}

function extractSummaryFromText(text: string) {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("概要:"))
      ?.replace(/^概要:\s*/, "")
      .trim() || ""
  );
}

export function buildPresentationTaskPlanFromText(args: {
  title: string;
  text: string;
  updatedAt?: string;
}): PresentationTaskPlan {
  const sections = parseSectionLines(args.text);
  const slideFrameItems = findSection(sections, [
    "slide frame json",
    "slide frames json",
    "slideframes",
    "slide frames",
  ]);
  const slideJsonItems = findSection(sections, [
    "Debug: スライド設計JSON",
    "スライド設計JSON",
    "slide design json",
  ]);
  const slideItems = findExactSection(sections, ["スライド設計", "slides", "slide"]);
  const slideFrameDocument = parsePresentationSlideFrameDocumentFromJsonLines(slideFrameItems);
  const slideFrames = slideFrameDocument.slideFrames;
  const slidesFromJson = parsePresentationTaskSlidesFromJsonLines(slideJsonItems);
  const slidesFromText = parsePresentationTaskSlidesFromLines(slideItems);
  const slides = slidesFromJson.length > 0 ? slidesFromJson : slidesFromText;
  const slideSource =
    slideFrames.length > 0
      ? "slideFrameJson"
      : slidesFromJson.length > 0
        ? "slideDesignJson"
        : slidesFromText.length > 0
          ? "legacySlideText"
          : "none";
  return {
    version: "0.1-presentation-task-plan",
    documentId: extractPresentationPlanDocumentId(args.text) || createPresentationPlanDocumentId(),
    title: args.title,
    sourceSummary: extractSummaryFromText(args.text),
    extractedItems: findSection(sections, ["抽出事項", "raw facts", "facts"]),
    strategyItems: findSection(sections, ["Presentation Strategy", "strategy"]),
    keyMessages: findSection(sections, ["キーメッセージ", "key message"]),
    slideItems,
    deckFrame: slideFrameDocument.deckFrame,
    slideFrames,
    slides,
    missingInfo: findSection(sections, ["不足情報", "missing"]),
    nextSuggestions: findSection(sections, ["次の提案", "next"]),
    latestPptx: null,
    debug: {
      slideSource,
      slideJsonRaw: slideFrameItems.length > 0 ? slideFrameItems : slideJsonItems,
      slideJsonParsed: slideFrames.length > 0 || slidesFromJson.length > 0,
      slideCount: slideFrames.length || slides.length,
      generatedAt: args.updatedAt || new Date().toISOString(),
    },
    updatedAt: args.updatedAt || new Date().toISOString(),
  };
}

function buildLegacyPresentationTaskPlan(args: {
  title: string;
  result: TaskResult | null;
  rawText: string;
  updatedAt?: string;
}): PresentationTaskPlan {
  const result = args.result;
  const slideFrameItems = findBlock(result, [
    "slide frame json",
    "slide frames json",
    "slideframes",
    "slide frames",
  ]);
  const slideJsonItems = findBlock(result, [
    "スライド設計JSON",
    "slide design json",
    "slides json",
  ]);
  const slideItems = findExactBlock(result, ["スライド設計", "slides", "slide"]);
  const slidesFromJson = parsePresentationTaskSlidesFromJsonLines(slideJsonItems);
  const slidesFromText = parsePresentationTaskSlidesFromLines(slideItems);
  const slides = slidesFromJson.length > 0 ? slidesFromJson : slidesFromText;
  const slideFrames: PresentationTaskSlideFrame[] = [];
  return {
    version: "0.1-presentation-task-plan",
    documentId: extractPresentationPlanDocumentId(args.rawText) || createPresentationPlanDocumentId(),
    title: args.title,
    sourceSummary: result?.summary || "",
    extractedItems: findBlock(result, ["抽出事項", "raw facts", "facts"]),
    strategyItems: findBlock(result, ["Presentation Strategy", "strategy"]),
    keyMessages: findBlock(result, ["キーメッセージ", "key message"]),
    slideItems,
    deckFrame: undefined,
    slideFrames,
    slides,
    missingInfo: result?.missingInfo || [],
    nextSuggestions: result?.nextSuggestion || [],
    latestPptx: null,
    debug: {
      slideSource:
        slidesFromJson.length > 0
          ? "slideDesignJson"
          : slidesFromText.length > 0
            ? "legacySlideText"
            : "none",
      slideJsonRaw: slideJsonItems,
      slideJsonParsed: slidesFromJson.length > 0,
      slideCount: slides.length,
      generatedAt: args.updatedAt || new Date().toISOString(),
    },
    updatedAt: args.updatedAt || new Date().toISOString(),
  };
}

export function buildPresentationTaskPlan(args: {
  title: string;
  result: TaskResult | null;
  rawText: string;
  updatedAt?: string;
}): PresentationTaskPlan {
  const legacyPlan = buildLegacyPresentationTaskPlan(args);
  const slideFrameItems = findBlock(args.result, [
    "slide frame json",
    "slide frames json",
    "slideframes",
    "slide frames",
  ]);
  const slideFrameDocument = parsePresentationSlideFrameDocumentFromJsonLines(slideFrameItems);
  const slideFrames = slideFrameDocument.slideFrames;
  if (slideFrames.length === 0) return legacyPlan;

  return {
    ...legacyPlan,
    deckFrame: slideFrameDocument.deckFrame,
    slideFrames,
    debug: {
      slideSource: "slideFrameJson",
      slideJsonRaw: slideFrameItems,
      slideJsonParsed: true,
      slideCount: slideFrames.length,
      generatedAt: args.updatedAt || new Date().toISOString(),
    },
  };
}

function bulletsFromSlide(slide: PresentationTaskSlidePlan): BulletItem[] {
  const items = slide.supportingInfo.filter(Boolean);
  return items.length > 0
    ? items.map((text) => ({ text }))
    : [{ text: slide.keyMessage || "内容を確認してください" }];
}

function bulletItems(values: string[]) {
  return values.filter(Boolean).map((text) => ({ text }));
}

function shouldUseVisualLayout(slide: PresentationTaskSlidePlan) {
  if (slideDisplayVisual(slide) || slide.visualSupportingInfo.length > 0) return true;
  return false;
}

function normalizedChars(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, "")
        .split("")
    )
  );
}

function relevanceScore(fact: string, query: string) {
  const queryChars = normalizedChars(query);
  if (queryChars.length === 0) return 0;
  const factText = fact.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return queryChars.reduce(
    (score, char) => score + (factText.includes(char) ? 1 : 0),
    0
  );
}

function relatedExtractedItemsForSlide(
  slide: PresentationTaskSlidePlan,
  extractedItems: string[]
) {
  const query = [slide.title, slide.keyMessage, slide.keyVisual].join(" ");
  return extractedItems
    .map((item) => ({
      item,
      score: relevanceScore(item, query),
    }))
    .filter(({ score }) => score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ item }) => item);
}

function supportingInfoForSlide(
  slide: PresentationTaskSlidePlan,
  extractedItems: string[]
) {
  return slide.supportingInfo.length > 0
    ? slide.supportingInfo
    : relatedExtractedItemsForSlide(slide, extractedItems);
}

function inferLayoutVariant(
  slide: PresentationTaskSlidePlan,
  slideIndex: number
): Extract<
  PresentationSpec["slides"][number],
  { type: "twoColumn" }
>["layoutVariant"] {
  const hint = `${slide.placementComposition} ${slideDisplayVisual(slide)}`;
  if (/中央|中心|大きく|全面|フル|地図|マップ|工程図|フロー|タイムライン/u.test(hint)) {
    return "visualHero";
  }
  if (/左に(?:写真|画像|イラスト|図|図解|地図|マップ|ビジュアル)|ビジュアル左|写真左|図左|左側に(?:写真|画像|イラスト|図|図解)/u.test(hint)) {
    return "visualLeftTextRight";
  }
  if (/右に(?:写真|画像|イラスト|図|図解|地図|マップ|ビジュアル)|ビジュアル右|写真右|図右|右側に(?:写真|画像|イラスト|図|図解)/u.test(hint)) {
    return "textLeftVisualRight";
  }
  if (/交互|リズム|左右|2分割|二分割|2カラム|二列/u.test(hint)) {
    return slideIndex % 2 === 0
      ? "textLeftVisualRight"
      : "visualLeftTextRight";
  }
  return "textLeftVisualRight";
}

function buildVisualLayoutSlide(
  slide: PresentationTaskSlidePlan,
  title: string,
  extractedItems: string[],
  slideIndex: number
): PresentationSpec["slides"][number] {
  const layoutBullets = layoutItemBullets(slide);
  const message = slideDisplayMessage(slide);
  const visual = slideDisplayVisual(slide);
  const visualBullets = bulletItems(
    layoutBullets.length > 0
      ? []
      : slide.structuredContent.visual.supportingFacts
  );
  const supportingBullets = bulletItems(
    layoutBullets.length > 0
      ? []
      : supportingInfoForSlide(slide, extractedItems)
  );

  return {
    type: "twoColumn",
    title,
    layoutVariant: inferLayoutVariant(slide, slideIndex),
    left: {
      heading: "配置するパーツ",
      body: message || undefined,
      bullets:
        layoutBullets.length > 0
          ? layoutBullets
          : supportingBullets.length > 0
            ? supportingBullets
            : undefined,
    },
    right: {
      heading: visual ? "キービジュアル案" : "配置‣構成",
      body:
        visual ||
        slide.structuredContent.layout.instruction ||
        "ビジュアル案を確認してください",
      bullets: visualBullets.length > 0 ? visualBullets : undefined,
    },
    notes: slide.keyMessage || undefined,
  };
}

export function buildPresentationSpecFromTaskPlan(
  plan: PresentationTaskPlan
): PresentationSpec {
  if (hasRenderablePresentationSlideFrames(plan.slideFrames)) {
    return buildPresentationSpecFromSlideFrames({
      title: plan.title,
      frames: plan.slideFrames,
      strategyItems: plan.strategyItems,
    });
  }
  const plannedSlides = plan.slides.length > 0 ? plan.slides : [];
  if (plannedSlides.length === 0) {
    throw new Error(
      "PPTX出力に必要なスライド設計JSONがありません。設計書を更新してからPPTX出力してください。"
    );
  }
  const slides: PresentationSpec["slides"] =
    plannedSlides.map((slide, index) => {
      const title = slideDisplayTitle(slide, `Slide ${index + 1}`);
      if (index === 0) {
        const aimPart = slideDisplayMessage(slide);
        const visualPart = slideDisplayVisual(slide);
        return {
          type: "title",
          title,
          subtitle: aimPart || slide.keyMessage || undefined,
          keyVisual: visualPart || undefined,
          notes: slide.keyMessage || undefined,
        };
      }
      if (shouldUseVisualLayout(slide)) {
        return buildVisualLayoutSlide(slide, title, plan.extractedItems, index);
      }
      const supportingInfo = supportingInfoForSlide(slide, plan.extractedItems);
      const layoutBullets = layoutItemBullets(slide);
      return {
        type: "bullets",
        title,
        lead: slideDisplayMessage(slide) || undefined,
        bullets:
          layoutBullets.length > 0
            ? layoutBullets
            : supportingInfo.length > 0
              ? bulletItems(supportingInfo)
              : bulletsFromSlide(slide),
        notes: slide.keyMessage || undefined,
      };
    });

  return {
    version: "0.1",
    title: plan.title || "Presentation",
    language: "ja",
    audience: findStrategyValue(plan.strategyItems, "audience"),
    purpose: findStrategyValue(plan.strategyItems, "purpose"),
    theme: "business-clean",
    density: "standard",
    slides,
  };
}

export function buildFramePresentationSpecFromTaskPlan(plan: PresentationTaskPlan) {
  if (!hasRenderablePresentationSlideFrames(plan.slideFrames)) {
    return null;
  }
  const slideFrames = plan.slideFrames.map((frame) => ({
    ...frame,
    title: sanitizeSlideFrameTitle(frame.title),
  }));
  return {
    version: "0.1-frame" as const,
    title: plan.title || "Presentation",
    language: "ja" as const,
    theme: "business-clean" as const,
    density: "standard" as const,
    deckFrame: plan.deckFrame,
    slideFrames,
  };
}

export function hasRenderablePresentationTaskPlan(value: unknown) {
  return (
    !!value &&
    typeof value === "object" &&
    ((Array.isArray((value as { slideFrames?: unknown }).slideFrames) &&
      ((value as { slideFrames: unknown[] }).slideFrames.length > 0)) ||
      (Array.isArray((value as { slides?: unknown }).slides) &&
        ((value as { slides: unknown[] }).slides.length > 0)))
  );
}

function findStrategyValue(items: string[], key: string) {
  const matched = items.find((item) =>
    item.toLowerCase().startsWith(`${key.toLowerCase()}:`)
  );
  return matched?.replace(new RegExp(`^${key}\\s*:\\s*`, "i"), "").trim() || undefined;
}

export function formatPresentationTaskResultText(
  result: TaskResult | null,
  raw: string
) {
  if (!result) return raw?.trim() || "PPT設計書の解析に失敗しました。";

  const lines: string[] = [];
  lines.push("【PPT設計書】");
  if (result.summary) lines.push(`概要: ${result.summary}`);
  result.detailBlocks.forEach((block) => {
    if (block.title.toLowerCase().includes("json")) return;
    lines.push("", `■ ${block.title}`);
    if (block.title.toLowerCase().includes("スライド")) {
      formatPresentationSlideDesignLines(block.body).forEach((line) => {
        if (!line) {
          lines.push("");
        } else if (line.startsWith("- ")) {
          lines.push(`- ${line}`);
        } else {
          lines.push(`- ${line}`);
        }
      });
      return;
    }
    block.body.forEach((line) => lines.push(`- ${line}`));
  });
  if (result.missingInfo.length > 0) {
    lines.push("", "■ 不足情報");
    result.missingInfo.forEach((item) => lines.push(`- ${item}`));
  }
  if (result.nextSuggestion.length > 0) {
    lines.push("", "■ 次の提案");
    result.nextSuggestion.forEach((item) => lines.push(`- ${item}`));
  }
  return lines.join("\n");
}

export function formatPresentationTaskPlanText(plan: PresentationTaskPlan) {
  const lines: string[] = [];
  lines.push("【PPT設計書】");
  lines.push(`Document ID: ${resolvePresentationPlanDocumentId(plan)}`);
  if (plan.sourceSummary) lines.push(`概要: ${plan.sourceSummary}`);

  if (plan.extractedItems.length > 0) {
    lines.push("", "■ 抽出事項");
    plan.extractedItems.forEach((item) => lines.push(`- ${item}`));
  }

  if (plan.strategyItems.length > 0) {
    lines.push("", "■ Presentation Strategy");
    plan.strategyItems.forEach((item) => lines.push(`- ${item}`));
  }

  if (plan.keyMessages.length > 0) {
    lines.push("", "■ キーメッセージ");
    plan.keyMessages.forEach((item) => lines.push(`- ${item}`));
  }

  const slides =
    Array.isArray(plan.slides) && plan.slides.length > 0
      ? plan.slides
      : parsePresentationTaskSlidesFromLines(plan.slideItems || []);

  lines.push("", "■ スライド設計");
  const slideLines =
    plan.slideFrames?.length > 0
      ? formatPresentationSlideFramePlanLines(plan.slideFrames, plan.deckFrame)
      : slides.length > 0
        ? formatPresentationSlidePlanLines(slides)
        : [
          "未生成: スライド設計JSONがありません。PPTX出力前に設計書を更新してください。",
        ];
  slideLines.forEach((line) => {
    if (!line) {
      lines.push("");
    } else {
      lines.push(`- ${line}`);
    }
  });

  if (plan.missingInfo.length > 0) {
    lines.push("", "■ 不足情報");
    plan.missingInfo.forEach((item) => lines.push(`- ${item}`));
  }

  if (plan.nextSuggestions.length > 0) {
    lines.push("", "■ 次の提案");
    plan.nextSuggestions.forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}

export function ensurePresentationPlanDocumentId(
  plan: PresentationTaskPlan
): PresentationTaskPlan {
  return plan.documentId ? plan : { ...plan, documentId: createPresentationPlanDocumentId() };
}

export function resolvePresentationPlanDocumentId(plan: PresentationTaskPlan) {
  return plan.documentId || createPresentationPlanDocumentId();
}

function extractPresentationPlanDocumentId(text: string) {
  return text.match(DOCUMENT_ID_LINE)?.[1]?.trim() || "";
}

function createPresentationPlanDocumentId() {
  return `ppt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
