import { buildPresentationTaskPlanFromText } from "@/lib/app/presentation/presentationTaskPlanning";
import type { ReferenceLibraryItem } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";

export function isPresentationTaskPlan(value: unknown): value is PresentationTaskPlan {
  return (
    !!value &&
    typeof value === "object" &&
    (value as PresentationTaskPlan).version === "0.1-presentation-task-plan"
  );
}

export function findPresentationPlanByDocumentId(args: {
  documentId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
}): { plan: PresentationTaskPlan; item: ReferenceLibraryItem; sourceId: string } | null {
  const requested = args.documentId.trim();
  if (!requested) return null;

  for (const item of args.referenceLibraryItems) {
    if (item.artifactType !== "presentation_plan") continue;
    const parsedPlan = buildPresentationTaskPlanFromText({
      title: item.title,
      text: item.excerptText,
    });
    const storedPlan = isPresentationTaskPlan(item.structuredPayload)
      ? item.structuredPayload
      : null;
    const plan =
      parsedPlan.slideFrames.length > 0 || parsedPlan.slides.length > 0
        ? {
            ...parsedPlan,
            latestPptx: storedPlan?.latestPptx || null,
          }
        : storedPlan || parsedPlan;
    if (item.sourceId !== requested && item.id !== requested && plan.documentId !== requested) {
      continue;
    }
    return {
      plan,
      item,
      sourceId: item.sourceId,
    };
  }

  return null;
}
