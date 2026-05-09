import type {
  PresentationTaskPlan,
  PresentationTaskGenerationDebug,
  PresentationTaskSlideFrame,
  PresentationTaskSlidePlan,
  TaskResult,
} from "@/types/task";
import type {
  BulletItem,
  PresentationSpec,
} from "@/lib/app/presentation/presentationTypes";
import {
  layoutItemBullets,
  parsePresentationTaskSlidesFromJsonLines,
  parsePresentationTaskSlidesFromLines,
  slideDisplayMessage,
  slideDisplayTitle,
  slideDisplayVisual,
} from "@/lib/app/presentation/slidePartsParser";
import {
  PRESENTATION_BLOCK_STYLES,
  buildPresentationSpecFromSlideFrames,
  hasRenderablePresentationSlideFrames,
  parsePresentationSlideFrameDocumentFromJsonLines,
  sanitizeReadableSlideFrameTitle,
  sanitizeSlideFrameTitle,
} from "@/lib/app/presentation/presentationSlideFrames";
import {
  normalizePresentationVisualMainPolicy,
  syncDeckFrameSlideCount,
} from "@/lib/app/presentation/presentationPlanValidation";
import {
  extractSummaryFromText,
  findBlock,
  findExactBlock,
  findExactSection,
  findSection,
  parseSectionLines,
} from "@/lib/app/presentation/presentationTaskSections";
import {
  createPresentationPlanDocumentId,
  extractPresentationPlanDocumentId,
} from "@/lib/app/presentation/presentationTaskDocuments";
export {
  formatPresentationTaskPlanText,
  hasRenderablePresentationTaskPlan,
} from "@/lib/app/presentation/presentationTaskText";

export {
  buildPresentationTaskConstraints,
  buildPresentationTaskStructuredInput,
  isPresentationTaskInstruction,
  resolvePresentationTaskTitle,
  stripPresentationTaskMarker,
} from "@/lib/app/presentation/presentationTaskInput";
export {
  buildPresentationCommandLink,
  createPresentationPlanDocumentId,
  ensurePresentationPlanDocumentId,
  resolvePresentationPlanDocumentId,
} from "@/lib/app/presentation/presentationTaskDocuments";

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
    "\u30b9\u30e9\u30a4\u30c9\u8a2d\u8a08JSON",
    "slide design json",
    "slides json",
  ]);
  const slideItems = findExactSection(sections, ["\u30b9\u30e9\u30a4\u30c9\u8a2d\u8a08", "slides", "slide"]);
  const slideFrameDocument = parsePresentationSlideFrameDocumentFromJsonLines(slideFrameItems);
  const slideFrames = normalizePresentationVisualMainPolicy(
    slideFrameDocument.slideFrames
  );
  const deckFrame = syncDeckFrameSlideCount(
    slideFrameDocument.deckFrame,
    slideFrames
  );
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
    extractedItems: findSection(sections, ["\u62bd\u51fa\u4e8b\u9805", "raw facts", "facts", "extracted items"]),
    strategyItems: findSection(sections, ["Presentation Strategy", "strategy"]),
    keyMessages: findSection(sections, ["\u30ad\u30fc\u30e1\u30c3\u30bb\u30fc\u30b8", "key message", "key messages"]),
    slideItems,
    deckFrame,
    slideFrames,
    slides,
    missingInfo: findSection(sections, ["\u4e0d\u8db3\u60c5\u5831", "missing info", "missing"]),
    nextSuggestions: findSection(sections, ["\u6b21\u306e\u63d0\u6848", "next suggestions", "next"]),
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
  const slideJsonItems = findBlock(result, [
    "\u30b9\u30e9\u30a4\u30c9\u8a2d\u8a08JSON",
    "slide design json",
    "slides json",
  ]);
  const slideItems = findExactBlock(result, ["\u30b9\u30e9\u30a4\u30c9\u8a2d\u8a08", "slides", "slide"]);
  const slidesFromJson = parsePresentationTaskSlidesFromJsonLines(slideJsonItems);
  const slidesFromText = parsePresentationTaskSlidesFromLines(slideItems);
  const slides = slidesFromJson.length > 0 ? slidesFromJson : slidesFromText;
  const slideFrames: PresentationTaskSlideFrame[] = [];
  return {
    version: "0.1-presentation-task-plan",
    documentId: extractPresentationPlanDocumentId(args.rawText) || createPresentationPlanDocumentId(),
    title: args.title,
    sourceSummary: result?.summary || "",
    extractedItems: findBlock(result, ["\u62bd\u51fa\u4e8b\u9805", "raw facts", "facts", "extracted items"]),
    strategyItems: findBlock(result, ["Presentation Strategy", "strategy"]),
    keyMessages: findBlock(result, ["\u30ad\u30fc\u30e1\u30c3\u30bb\u30fc\u30b8", "key message", "key messages"]),
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
  generationDebug?: PresentationTaskGenerationDebug;
}): PresentationTaskPlan {
  const legacyPlan = buildLegacyPresentationTaskPlan(args);
  const slideFrameItems = findBlock(args.result, [
    "slide frame json",
    "slide frames json",
    "slideframes",
    "slide frames",
  ]);
  const slideFrameDocument = parsePresentationSlideFrameDocumentFromJsonLines(slideFrameItems);
  const slideFrames = normalizePresentationVisualMainPolicy(
    slideFrameDocument.slideFrames
  );
  const deckFrame = syncDeckFrameSlideCount(
    slideFrameDocument.deckFrame,
    slideFrames
  );
  if (slideFrames.length === 0) return legacyPlan;

  return {
    ...legacyPlan,
    deckFrame,
    slideFrames,
    debug: {
      slideSource: "slideFrameJson",
      slideJsonRaw: slideFrameItems,
      slideJsonParsed: true,
      slideCount: slideFrames.length,
      generatedAt: args.updatedAt || new Date().toISOString(),
      ...(args.generationDebug ? { generation: args.generationDebug } : {}),
    },
  };
}

export function hasPresentationTaskPlanSlideFrames(
  plan: PresentationTaskPlan | null | undefined
): plan is PresentationTaskPlan {
  return !!plan && plan.slideFrames.length > 0;
}

function bulletsFromSlide(slide: PresentationTaskSlidePlan): BulletItem[] {
  const items = slide.supportingInfo.filter(Boolean);
  return items.length > 0
    ? items.map((text) => ({ text }))
    : [{ text: slide.keyMessage || "\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044" }];
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
  if (/(?:中央|中心|大きく|全面|フル|地図|マップ|工程図|フロー|タイムライン|hero|center|full|flow|map)/iu.test(hint)) {
    return "visualHero";
  }
  if (/(?:左に(?:写真|画像|イラスト|図|図解|地図|マップ|ビジュアル)|ビジュアル左|写真左|図左|左側に(?:写真|画像|イラスト|図|図解)|visual left|left visual)/iu.test(hint)) {
    return "visualLeftTextRight";
  }
  if (/(?:右に(?:写真|画像|イラスト|図|図解|地図|マップ|ビジュアル)|ビジュアル右|写真右|図右|右側に(?:写真|画像|イラスト|図|図解)|visual right|right visual)/iu.test(hint)) {
    return "textLeftVisualRight";
  }
  if (/(?:左右|2分割|二分割|2カラム|二列|two column|split)/iu.test(hint)) {
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
      heading: "Message",
      body: message || undefined,
      bullets:
        layoutBullets.length > 0
          ? layoutBullets
          : supportingBullets.length > 0
            ? supportingBullets
            : undefined,
    },
    right: {
      heading: visual ? "\u30ad\u30fc\u30d3\u30b8\u30e5\u30a2\u30eb\u6848" : "\u914d\u7f6e\u30fb\u69cb\u6210",
      body:
        visual ||
        slide.structuredContent.layout.instruction ||
        "Confirm the visual direction.",
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
      "\u30b9\u30e9\u30a4\u30c9\u8a2d\u8a08JSON\u304c\u3042\u308a\u307e\u305b\u3093\u3002PPTX\u51fa\u529b\u524d\u306b\u8a2d\u8a08\u66f8\u3092\u66f4\u65b0\u3057\u3066\u304f\u3060\u3055\u3044\u3002"
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
  const slideFrames = normalizePresentationVisualMainPolicy(plan.slideFrames).map((frame) => {
    const expandedFrame = expandMultiVisualCandidateFrame(frame);
    const title = sanitizeReadableSlideFrameTitle(
      sanitizeSlideFrameTitle(expandedFrame.title)
    );
    const effectiveMasterFrameId =
      expandedFrame.masterFrameId ||
      plan.deckFrame?.masterFrameId ||
      "titleLineFooter";
    return {
      ...expandedFrame,
      title,
      blocks: expandedFrame.blocks.map((block) =>
        applyTitleLineFooterHeadingPolicy({
          block: applyBlockStylePreset(block),
          slideTitle: title,
          masterFrameId: effectiveMasterFrameId,
        })
      ),
    };
  });
  const deckFrame = syncDeckFrameSlideCount(plan.deckFrame, slideFrames);
  return {
    version: "0.1-frame" as const,
    title: plan.title || "Presentation",
    language: "ja" as const,
    theme: "business-clean" as const,
    density: "standard" as const,
    deckFrame,
    slideFrames,
  };
}

function expandMultiVisualCandidateFrame(
  frame: PresentationTaskSlideFrame
): PresentationTaskSlideFrame {
  const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
  const visualBlocks = frame.blocks.filter((block) => !!block.visualRequest);
  if (visualBlocks.length === 0) return frame;
  const expandedVisuals = visualBlocks.flatMap((block) => expandVisualCandidateBlock(block));
  if (frame.layoutFrameId === "adaptiveVisualMain") {
    return {
      ...frame,
      blocks: [...expandedVisuals, ...textBlocks.slice(0, 1)].slice(0, 7),
    };
  }
  if (frame.layoutFrameId !== "adaptiveTextMain") return frame;
  return {
    ...frame,
    blocks: [...textBlocks.slice(0, 1), ...expandedVisuals].slice(0, 7),
  };
}

function expandVisualCandidateBlock(
  block: PresentationTaskSlideFrame["blocks"][number]
): PresentationTaskSlideFrame["blocks"] {
  const visual = block.visualRequest;
  if (!visual) return [block];
  const wantsMultiple =
    visual.usagePolicy === "useOneOrMore" || visual.usagePolicy === "useAsGrid";
  const defaultMaxVisualItems = wantsMultiple
    ? Math.max(1, visual.candidateImageIds?.length || visual.selectionMatches?.filter((match) => match.status === "selected").length || 3)
    : 1;
  const maxVisualItems = Math.max(
    1,
    Math.min(6, visual.maxVisualItems || defaultMaxVisualItems)
  );
  const imageIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  ).slice(0, maxVisualItems) as string[];
  const matchLabelsByImageId = new Map(
    (visual.selectionMatches || [])
      .filter((match) => match.status === "selected" && match.imageId)
      .map((match) => [match.imageId as string, match.label])
  );
  const labels =
    visual.labels && visual.labels.length === imageIds.length
      ? visual.labels
      : imageIds.map((imageId) => matchLabelsByImageId.get(imageId) || "").filter(Boolean)
          .length === imageIds.length
      ? imageIds.map((imageId) => matchLabelsByImageId.get(imageId) || "")
      : undefined;
  if (visual.usagePolicy === "useOneBest" || maxVisualItems <= 1 || imageIds.length <= 1) {
    const label = imageIds[0] ? labels?.[0] || matchLabelsByImageId.get(imageIds[0]) : undefined;
    return [
      {
        ...block,
        visualRequest: {
          ...visual,
          brief: label || visual.brief,
          renderStyle: {
            ...visual.renderStyle,
            showBrief: label ? visual.renderStyle?.showBrief : false,
          },
        },
      },
    ];
  }
  return imageIds.map((imageId, index) => ({
    ...block,
    id: index === 0 ? block.id : `${block.id}_${index + 1}`,
    visualRequest: {
      ...visual,
      brief: labels?.[index] || visual.brief,
      preferredImageId: imageId,
      candidateImageIds: imageIds,
      renderStyle: {
        ...visual.renderStyle,
        showBrief: labels?.[index] ? visual.renderStyle?.showBrief : false,
      },
    },
  }));
}

function applyBlockStylePreset(block: PresentationTaskSlideFrame["blocks"][number]) {
  const preset = PRESENTATION_BLOCK_STYLES.find(
    (style) => style.id === block.styleId
  )?.textStyle;
  if (!preset) return block;
  return {
    ...block,
    renderStyle: {
      ...block.renderStyle,
      textStyle: {
        ...preset,
        ...(block.renderStyle?.textStyle || {}),
      },
    },
  };
}

function findStrategyValue(items: string[], key: string) {
  const matched = items.find((item) =>
    item.toLowerCase().startsWith(`${key.toLowerCase()}:`)
  );
  return matched?.replace(new RegExp(`^${key}\\s*:\\s*`, "i"), "").trim() || undefined;
}

function applyTitleLineFooterHeadingPolicy(args: {
  block: PresentationTaskSlideFrame["blocks"][number];
  slideTitle: string;
  masterFrameId?: string;
}) {
  if (args.masterFrameId !== "titleLineFooter") return args.block;
  if (!args.block.heading || args.block.visualRequest) return args.block;
  if (!isRedundantSlideHeading(args.slideTitle, args.block.heading)) {
    return args.block;
  }
  return {
    ...args.block,
    renderStyle: {
      ...args.block.renderStyle,
      showHeading: false,
    },
  };
}

function normalizeComparableText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function textBigrams(value: string) {
  const chars = Array.from(value);
  if (chars.length <= 1) return chars;
  const bigrams: string[] = [];
  for (let index = 0; index < chars.length - 1; index += 1) {
    bigrams.push(`${chars[index]}${chars[index + 1]}`);
  }
  return bigrams;
}

function isRedundantSlideHeading(slideTitle: string, heading: string) {
  const title = normalizeComparableText(slideTitle);
  const normalizedHeading = normalizeComparableText(heading);
  if (!title || !normalizedHeading) return false;
  if (title === normalizedHeading) return true;
  if (
    Math.min(title.length, normalizedHeading.length) >= 6 &&
    (title.includes(normalizedHeading) || normalizedHeading.includes(title))
  ) {
    return true;
  }

  const titleBigrams = new Set(textBigrams(title));
  const headingBigrams = textBigrams(normalizedHeading);
  if (titleBigrams.size === 0 || headingBigrams.length === 0) return false;
  const overlap = headingBigrams.filter((bigram) => titleBigrams.has(bigram))
    .length;
  return overlap / Math.min(titleBigrams.size, headingBigrams.length) >= 0.68;
}

