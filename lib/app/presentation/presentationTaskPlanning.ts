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
  PRESENTATION_BLOCK_STYLES,
  buildPresentationSpecFromSlideFrames,
  formatPresentationSlideFramePlanLines,
  hasRenderablePresentationSlideFrames,
  parsePresentationSlideFrameDocumentFromJsonLines,
  sanitizeReadableSlideFrameTitle,
  sanitizeSlideFrameTitle,
} from "@/lib/app/presentation/presentationSlideFrames";
import {
  normalizePresentationVisualMainPolicy,
  syncDeckFrameSlideCount,
} from "@/lib/app/presentation/presentationPlanValidation";

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
  libraryReferenceContext?: string;
  imageLibraryContext?: string;
}) {
  return [
    `\u30d7\u30ec\u30bc\u30f3\u30bf\u30a4\u30c8\u30eb: ${args.title?.trim() || "\u672a\u8a2d\u5b9a"}`,
    `\u30e6\u30fc\u30b6\u30fc\u6307\u793a: ${args.userInstruction?.trim() || "\u306a\u3057"}`,
    args.currentPlanText?.trim()
      ? `\u73fe\u5728\u306ePPT\u8a2d\u8a08\u66f8:\n${args.currentPlanText.trim()}`
      : "",
    args.body?.trim() ? `\u5165\u529b\u672c\u6587:\n${args.body.trim()}` : "",
    args.material?.trim() ? `\u53d6\u8fbc\u7d20\u6750:\n${args.material.trim()}` : "",
  ].concat(
    args.libraryReferenceContext?.trim()
      ? [`Library reference context:\n${args.libraryReferenceContext.trim()}`]
      : []
  )
    .concat(
    args.imageLibraryContext?.trim()
      ? [`Image library reference candidates:\n${args.imageLibraryContext.trim()}`]
      : []
    )
    .concat(
      args.imageLibraryContext?.trim()
        ? [
            [
              "Image library selection policy:",
              "- Treat the Image IDs above as a closed allowlist for library-image use.",
              "- Use only exact listed Image IDs in preferredImageId and candidateImageIds.",
              "- Do not invent Image IDs from filenames, titles, descriptions, or prompts.",
              "- For textMain slides, list relevant candidates in candidateImageIds; renderer decides how many fit.",
              "- visualRequest.labels must match candidateImageIds one-to-one in the same order, and each label must be derived from that exact candidate's Caption seed, Title, Visible subjects, or Embedded text items.",
              "- Do not assign a planned process name to a photo unless that exact photo visibly contains that process. Omit labels rather than guessing.",
            ].join("\n"),
          ]
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
    "deckFrame holds deck-wide settings such as body slide count, common master, background/wallpaper, page number, logo, openingSlide, and closingSlide. Do not repeat common settings on every slide.",
    "Use deckFrame.openingSlide and deckFrame.closingSlide for title-cover and END/summary slides. Do not include those bookend slides in slideFrames; slideFrames are the body slides only.",
    "For summaryClosing, summarize across all body slideFrames. Do not reuse only the final body slide as the summary source.",
    "If the last body slideFrame is already a summary, recap, conclusion, or future-outlook slide, do not use summaryClosing for deckFrame.closingSlide. Use a simple endSlide closing instead.",
    "If page numbers are enabled and bookend slides exist, prefer pageNumber.scope: \"bodyOnly\" so the cover and ending slide stay unnumbered unless the user asks for all-slide numbering.",
    "In slideFrames, omit masterFrameId unless a slide intentionally overrides deckFrame.masterFrameId.",
    "Do not create slideDesign.slides[].parts as the preferred path. Do not rely on natural-language slide text and a parser to recover JSON.",
    "Use the fixed frame package plus adaptive layouts: one-block layouts need 1 block, two-column layouts need 2, heroTopDetailsBottom and threeColumns need 3, twoByTwoGrid needs 4, adaptiveVisualMain needs a primary visual plus optional concise annotation, and adaptiveTextMain needs primary text plus optional supporting visuals.",
    "For every slideFrame, decide slideRole from the slide key message first. Image-library presentationMeta is planning material only: compare the key message with visibleSubjects, embeddedTextItems, relationships, and semanticTags before deciding visualMain or textMain.",
    "Use visualMain only when the selected visual and the slide key message strongly match, so the visual can carry the main slide meaning with only concise annotation. Otherwise use textMain and treat visuals as supporting material.",
    "Do not classify a normal photo as visualMain merely because its library description, prompt, or visible subject list is detailed. Detailed scene metadata is still usually supporting material unless it directly matches the slide key message.",
    "When slideRole is visualMain, prefer layoutFrameId adaptiveVisualMain. Put the main visual in the first visual block, set layoutIntent.primaryImageId when an existing image is selected, and use later text/callout blocks only for concise annotation, conclusion, source note, or guidance.",
    "When slideRole is textMain, prefer layoutFrameId adaptiveTextMain. Put the main text/list block first, then add one or more related visual blocks that can occupy the remaining right, bottom, or right-grid space.",
    "For adaptiveVisualMain, the renderer will place the visual at the top-left, preserve aspect ratio, maximize it in the content area, and use remaining right or bottom-right space for annotation only when useful.",
    "For adaptiveTextMain, the renderer will place text at the top-left, choose a text box shape that leaves the most useful remaining space, and place related images in that remaining area.",
    "Block styles define fields: listCompact = heading + items; textStackTopLeft = heading + text; visualContain/visualCover = visualRequest only; headlineCenter/callout = one emphasized text.",
    "Choose slide count from the material and strategy. If the source naturally implies 5-7 slides, create 5-7 slideFrames.",
    "The visible chat text must show the actual messages that will appear in PPTX. Do not replace display text or items with counts such as '+ 6 items'.",
    "For visual blocks, include the full visual prompt in visualRequest.prompt. If the visual is too complex to prompt yet, leave prompt empty and explain why in visualRequest.promptNote.",
    "If image-library candidates are provided, their Image IDs are a closed allowlist. visualRequest.preferredImageId and candidateImageIds must use only exact Image IDs from that list; never invent, rename, abbreviate, or derive an Image ID from a filename.",
    "If an image-library candidate semantically fits a visual block, set visualRequest.preferredImageId to its exact Image ID and still keep a brief/prompt explaining the match to the slide key message.",
    "For textMain slides with supporting image-library assets, include candidateImageIds with all semantically relevant image IDs in relevance order, usagePolicy useOneOrMore or useAsGrid when multiple images may help, and leave final image count to the renderer. Do not prematurely narrow to one image when several can support the message.",
    "When a visual block may expand into multiple candidate images, provide per-image labels in visualRequest.labels matching candidateImageIds exactly: same count, same order, one label per image ID. Do not repeat one generic caption for all images.",
    "Each per-image label must be derived from the selected image candidate's Caption seed, Title, Visible subjects, or Embedded text items. Never assign a planned process step or desired narrative label to an image unless that exact image visibly contains it. If uncertain, omit labels.",
    "Keep visualRequest.prompt consistent with candidateImageIds. If three image IDs are listed, describe those three images, not four or more.",
    "For textMain supporting visuals, maxVisualItems should usually be omitted or set to 3. Set it to 1 only when exactly one semantically fitting image exists or the slide message explicitly requires a single image.",
    "When image-library candidates exist but none fit a needed visual, do not invent an Image ID or a prompt-only placeholder as if it were available. Add the gap to missingInfo or warnings.",
    "Image-library selection is a two-step decision: first match candidates to the slide key message using visibleSubjects, embeddedTextItems, relationships, and semanticTags; only after selecting them, use Orientation, Size, and Aspect ratio to choose layoutFrameId, block order, and visual role. Do not reject a semantically fitting image because of aspect ratio alone.",
    "For layout after image selection, landscape images should go in wide/hero visual areas, portrait images should go in vertical/narrow visual areas, and square images should go in balanced visual areas. Avoid defaulting to 50/50 left-right layouts when the selected asset shape would make the image feel cramped or distorted.",
    "When an image-library asset is selected as visualMain after key-message matching, do not duplicate the same information as a large neighboring text list. Use a second block only for short annotation, conclusion, source note, or guidance that is not already visible in the image.",
    "For ordinary scene photos, product photos, factory photos, farm photos, and store photos, prefer adaptiveTextMain unless the slide key message directly asks the viewer to inspect that specific photo or the image's embedded labels/relationships are central to the message.",
    "If a selected image leaves natural empty space after aspect-preserving placement, use that space for concise annotation only; do not fill it with repeated transcription of the image contents.",
    "Use layoutIntent.textPlacement right or bottomRight for visualMain annotations when the remaining space is predictable. Use layoutIntent.visualPlacement right, bottom, or rightGrid for textMain supporting visuals.",
    "Keep text sizes visually consistent across slideFrames. Use renderStyle.textStyle only when a touched block needs explicit sizing; otherwise let the renderer fit text within deck typography limits.",
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
    const sectionMatch = line.match(/^\u25a0\s*(.+)$/u);
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
      .find((line) => line.startsWith("讎りｦ・"))
      ?.replace(/^讎りｦ・\s*/, "")
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
    },
  };
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
    const expandedFrame = expandAdaptiveTextMainVisualCandidates(frame);
    return {
      ...expandedFrame,
      title: sanitizeReadableSlideFrameTitle(sanitizeSlideFrameTitle(expandedFrame.title)),
      blocks: expandedFrame.blocks.map(applyBlockStylePreset),
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

function expandAdaptiveTextMainVisualCandidates(
  frame: PresentationTaskSlideFrame
): PresentationTaskSlideFrame {
  if (frame.layoutFrameId !== "adaptiveTextMain") return frame;
  const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
  const visualBlocks = frame.blocks.filter((block) => !!block.visualRequest);
  if (visualBlocks.length === 0) return frame;
  const expandedVisuals = visualBlocks.flatMap((block) => expandVisualCandidateBlock(block));
  return {
    ...frame,
    blocks: [...textBlocks.slice(0, 1), ...expandedVisuals].slice(0, 4),
  };
}

function expandVisualCandidateBlock(
  block: PresentationTaskSlideFrame["blocks"][number]
): PresentationTaskSlideFrame["blocks"] {
  const visual = block.visualRequest;
  if (!visual) return [block];
  const wantsMultiple =
    visual.usagePolicy === "useOneOrMore" || visual.usagePolicy === "useAsGrid";
  const defaultMaxVisualItems = wantsMultiple ? 3 : 1;
  const maxVisualItems = Math.max(
    1,
    Math.min(3, visual.maxVisualItems || defaultMaxVisualItems)
  );
  if (visual.usagePolicy === "useOneBest" || maxVisualItems <= 1) return [block];
  const imageIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  ).slice(0, maxVisualItems) as string[];
  if (imageIds.length <= 1) return [block];
  const labels =
    visual.labels && visual.labels.length === imageIds.length ? visual.labels : undefined;
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
  if (!result) return raw?.trim() || "PPT\u8a2d\u8a08\u66f8\u306e\u89e3\u6790\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002";

  const lines: string[] = [];
  lines.push("\u3010PPT\u8a2d\u8a08\u66f8\u3011");
  if (result.summary) lines.push(`\u6982\u8981: ${result.summary}`);
  result.detailBlocks.forEach((block) => {
    if (block.title.toLowerCase().includes("json")) return;
    lines.push("", `\u25a0 ${block.title}`);
    if (block.title.toLowerCase().includes("slide") || block.title.includes("\u30b9\u30e9\u30a4\u30c9")) {
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
    lines.push("", "\u25a0 \u4e0d\u8db3\u60c5\u5831");
    result.missingInfo.forEach((item) => lines.push(`- ${item}`));
  }
  if (result.nextSuggestion.length > 0) {
    lines.push("", "\u25a0 \u6b21\u306e\u63d0\u6848");
    result.nextSuggestion.forEach((item) => lines.push(`- ${item}`));
  }
  return lines.join("\n");
}

export function formatPresentationTaskPlanText(plan: PresentationTaskPlan) {
  const lines: string[] = [];
  lines.push("\u3010PPT\u8a2d\u8a08\u66f8\u3011");
  lines.push(`Document ID: ${resolvePresentationPlanDocumentId(plan)}`);
  if (plan.sourceSummary) lines.push(`\u6982\u8981: ${plan.sourceSummary}`);

  if (plan.extractedItems.length > 0) {
    lines.push("", "\u25a0 \u62bd\u51fa\u4e8b\u9805");
    plan.extractedItems.forEach((item) => lines.push(`- ${item}`));
  }

  if (plan.strategyItems.length > 0) {
    lines.push("", "\u25a0 Presentation Strategy");
    plan.strategyItems.forEach((item) => lines.push(`- ${item}`));
  }

  if (plan.keyMessages.length > 0) {
    lines.push("", "\u25a0 \u30ad\u30fc\u30e1\u30c3\u30bb\u30fc\u30b8");
    plan.keyMessages.forEach((item) => lines.push(`- ${item}`));
  }

  const slides =
    Array.isArray(plan.slides) && plan.slides.length > 0
      ? plan.slides
      : parsePresentationTaskSlidesFromLines(plan.slideItems || []);

  lines.push("", "\u25a0 \u30b9\u30e9\u30a4\u30c9\u8a2d\u8a08");
  const slideLines =
    plan.slideFrames?.length > 0
      ? formatPresentationSlideFramePlanLines(plan.slideFrames, plan.deckFrame)
      : slides.length > 0
        ? formatPresentationSlidePlanLines(slides)
        : [
            "\u672a\u751f\u6210: \u30b9\u30e9\u30a4\u30c9\u8a2d\u8a08JSON\u304c\u3042\u308a\u307e\u305b\u3093\u3002PPTX\u51fa\u529b\u524d\u306b\u8a2d\u8a08\u66f8\u3092\u66f4\u65b0\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
          ];
  slideLines.forEach((line) => {
    if (!line) {
      lines.push("");
    } else {
      lines.push(`- ${line}`);
    }
  });

  if (plan.missingInfo.length > 0) {
    lines.push("", "\u25a0 \u4e0d\u8db3\u60c5\u5831");
    plan.missingInfo.forEach((item) => lines.push(`- ${item}`));
  }

  if (plan.nextSuggestions.length > 0) {
    lines.push("", "\u25a0 \u6b21\u306e\u63d0\u6848");
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




