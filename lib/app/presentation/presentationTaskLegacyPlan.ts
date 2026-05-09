import type {
  PresentationTaskPlan,
  PresentationTaskSlideFrame,
  TaskResult,
} from "@/types/task";
import {
  parsePresentationTaskSlidesFromJsonLines,
  parsePresentationTaskSlidesFromLines,
} from "@/lib/app/presentation/slidePartsParser";
import {
  findBlock,
  findExactBlock,
} from "@/lib/app/presentation/presentationTaskSections";
import {
  createPresentationPlanDocumentId,
  extractPresentationPlanDocumentId,
} from "@/lib/app/presentation/presentationTaskDocuments";

export function buildLegacyPresentationTaskPlan(args: {
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
