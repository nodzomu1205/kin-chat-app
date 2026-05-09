import type { PresentationTaskPlan } from "@/types/task";
import {
  formatPresentationSlidePlanLines,
  parsePresentationTaskSlidesFromLines,
} from "@/lib/app/presentation/slidePartsParser";
import { formatPresentationSlideFramePlanLines } from "@/lib/app/presentation/presentationSlideFrames";
import {
  buildPresentationCommandLink,
  resolvePresentationPlanDocumentId,
} from "@/lib/app/presentation/presentationTaskDocuments";

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

export function formatPresentationTaskPlanText(plan: PresentationTaskPlan) {
  const lines: string[] = [];
  const documentId = resolvePresentationPlanDocumentId(plan);
  lines.push("\u3010PPT\u8a2d\u8a08\u66f8\u3011");
  lines.push(`Document ID: ${documentId}`);
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

  lines.push("", "\u25a0 PPT\u30e1\u30cb\u30e5\u30fc");
  lines.push(
    `- ${buildPresentationCommandLink("Save", ["/ppt", `Document ID: ${documentId}`, "Save"], "run")}`
  );
  lines.push(
    `- ${buildPresentationCommandLink("Save and create PPT", ["/ppt", `Document ID: ${documentId}`, "Save and create PPT"], "run")}`
  );
  lines.push(
    `- ${buildPresentationCommandLink("Resolve visual blocks", ["/ppt", `Document ID: ${documentId}`, "Resolve visual blocks"], "run")}`
  );

  return lines.join("\n");
}
