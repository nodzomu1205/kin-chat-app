import type {
  PresentationTaskPlan,
  PresentationTaskGenerationDebug,
  TaskResult,
} from "@/types/task";
import {
  parsePresentationTaskSlidesFromJsonLines,
  parsePresentationTaskSlidesFromLines,
} from "@/lib/app/presentation/slidePartsParser";
import {
  parsePresentationSlideFrameDocumentFromJsonLines,
} from "@/lib/app/presentation/presentationSlideFrames";
import {
  normalizePresentationVisualMainPolicy,
  syncDeckFrameSlideCount,
} from "@/lib/app/presentation/presentationPlanValidation";
import {
  extractSummaryFromText,
  findBlock,
  findExactSection,
  findSection,
  parseSectionLines,
} from "@/lib/app/presentation/presentationTaskSections";
import {
  createPresentationPlanDocumentId,
  extractPresentationPlanDocumentId,
} from "@/lib/app/presentation/presentationTaskDocuments";
import { buildLegacyPresentationTaskPlan } from "@/lib/app/presentation/presentationTaskLegacyPlan";
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

export { buildPresentationSpecFromTaskPlan } from "@/lib/app/presentation/presentationTaskLegacySpec";

export { buildFramePresentationSpecFromTaskPlan } from "@/lib/app/presentation/presentationTaskFrameSpec";
