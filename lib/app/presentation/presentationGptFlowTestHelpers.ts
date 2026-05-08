import { vi } from "vitest";
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import {
  buildPresentationTaskPlan,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import type { Message, ReferenceLibraryItem } from "@/types/chat";

export function buildRecentDesign(
  documentId: string,
  options: {
    selectedImageId?: string;
    visualLabel?: string;
    visualSlots?: Array<{
      slotId: string;
      label: string;
      need: string;
      keywords?: string[];
      order?: number;
    }>;
  } = {}
) {
  const plan = {
    ...buildPresentationTaskPlan({
      title: "Recent deck",
      result: {
        taskId: "task",
        type: "PREP_TASK",
        status: "OK",
        summary: "Recent design",
        keyPoints: [],
        detailBlocks: [
          {
            title: "Slide Frame JSON",
            body: [
              JSON.stringify({
                slideFrames: [
                  {
                    slideNumber: 1,
                    title: "Overview",
                    layoutFrameId: "adaptiveTextMain",
                    blocks: [
                      {
                        id: "block1",
                        kind: "textStack",
                        styleId: "textStackTopLeft",
                        heading: "Overview",
                        text: "A concise body.",
                      },
                      {
                        id: "block2",
                        kind: "visual",
                        styleId: "visualContain",
                        visualRequest: {
                          type: "photo",
                          brief: "Study scene",
                          prompt: "A student studying with English exam books.",
                          labels: [options.visualLabel || "Study scene"],
                          visualSlots: options.visualSlots,
                        },
                      },
                    ],
                  },
                ],
              }),
            ],
          },
        ],
        warnings: [],
        missingInfo: [],
        nextSuggestion: [],
      },
      rawText: "",
    }),
    documentId,
  };
  if (options.selectedImageId) {
    const visual = plan.slideFrames[0]?.blocks[1]?.visualRequest;
    if (visual) {
      visual.preferredImageId = options.selectedImageId;
      visual.candidateImageIds = [options.selectedImageId];
    }
  }
  return {
    plan,
    text: formatPresentationTaskPlanText(plan),
  };
}

export function buildPresentationPlanLibraryItem(
  plan: ReturnType<typeof buildRecentDesign>["plan"]
): ReferenceLibraryItem {
  const text = formatPresentationTaskPlanText(plan);
  return {
    id: `item-${plan.documentId}`,
    sourceId: `stored-${plan.documentId}`,
    itemType: "ingested_file",
    artifactType: "presentation_plan",
    title: plan.title,
    subtitle: `Document ID: ${plan.documentId}`,
    summary: plan.sourceSummary || "",
    excerptText: text,
    createdAt: "2026-05-06T00:00:00.000Z",
    updatedAt: "2026-05-06T00:00:00.000Z",
    filename: `${plan.documentId}.txt`,
    structuredPayload: plan,
  };
}

export function buildGeneratedImageLibraryItem(imageId: string): ReferenceLibraryItem {
  return {
    id: `item-${imageId}`,
    sourceId: `stored-${imageId}`,
    itemType: "ingested_file",
    artifactType: "generated_image",
    title: "students",
    subtitle: imageId,
    summary: "Students in an English classroom.",
    excerptText: "Students in an English classroom.",
    createdAt: "2026-05-06T00:00:00.000Z",
    updatedAt: "2026-05-06T00:00:00.000Z",
    filename: `${imageId}.png`,
    structuredPayload: {
      version: "0.1-generated-image",
      imageId,
      title: "students",
      fileName: `${imageId}.png`,
      mimeType: "image/png",
      prompt: "Students learning English in a classroom.",
      presentationMeta: {
        visualBaseType: "photo",
        visibleSubjects: ["students", "classroom"],
        embeddedTextItems: [],
        relationships: [
          {
            type: "activity",
            items: ["students", "english", "classroom"],
            evidence: "Students are learning English in a classroom.",
          },
        ],
        semanticTags: ["student", "english", "classroom", "lesson"],
        composition: "Classroom lesson scene with students.",
      },
    },
  };
}

export function buildFlowArgs(args: {
  messages: Message[];
  recentMessages: Message[];
  recordIngestedDocument: ReturnType<typeof vi.fn>;
  updateStoredDocument?: ReturnType<typeof vi.fn>;
  referenceLibraryItems?: ReferenceLibraryItem[];
  imageLibraryReferenceEnabled?: boolean;
  imageLibraryReferenceCount?: number;
  applyTaskUsage?: ReturnType<typeof vi.fn>;
}) {
  return {
    referenceLibraryItems: args.referenceLibraryItems || [],
    currentTaskId: "task",
    gptStateRef: { current: { recentMessages: args.recentMessages } },
    recordIngestedDocument: args.recordIngestedDocument,
    updateStoredDocument: args.updateStoredDocument || vi.fn(),
    setGptMessages: (updater: (prev: Message[]) => Message[]) => {
      args.messages.splice(0, args.messages.length, ...updater(args.messages));
    },
    setGptInput: vi.fn(),
    setGptLoading: vi.fn(),
    imageLibraryReferenceEnabled: args.imageLibraryReferenceEnabled || false,
    imageLibraryReferenceCount: args.imageLibraryReferenceCount || 0,
    applyImageUsage: vi.fn(),
    applyTaskUsage: args.applyTaskUsage || vi.fn(),
  } as unknown as Parameters<typeof runPresentationGptCommandFlow>[0]["flowArgs"];
}
