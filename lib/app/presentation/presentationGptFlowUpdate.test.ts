import { describe, expect, it, vi } from "vitest";
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import { buildFramePresentationSpecFromTaskPlan } from "@/lib/app/presentation/presentationTaskPlanning";
import {
  buildFlowArgs,
  buildPresentationPlanLibraryItem,
  buildRecentDesign,
} from "@/lib/app/presentation/presentationGptFlowTestHelpers";
import type { Message } from "@/types/chat";

const { runAutoUpdatePresentationTaskMock } = vi.hoisted(() => ({
  runAutoUpdatePresentationTaskMock: vi.fn(),
}));

vi.mock("@/lib/app/gpt-task/gptTaskClient", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/app/gpt-task/gptTaskClient")>();
  return {
    ...actual,
    runAutoUpdatePresentationTask: runAutoUpdatePresentationTaskMock,
  };
});

describe("runPresentationGptCommandFlow update commands", () => {
  it("preserves selected image IDs but updates visual labels from saved PPT design edits", async () => {
    const savedDesign = buildRecentDesign("ppt_library_update_label", {
      selectedImageId: "img_saved",
      visualLabel: "Old visual label",
      visualSlots: [
        {
          slotId: "scene",
          label: "Old visual label",
          need: "old visual need",
          order: 1,
        },
      ],
    });
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];
    runAutoUpdatePresentationTaskMock.mockResolvedValueOnce({
      raw: "",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      parsed: {
        taskId: "task",
        type: "PREP_TASK",
        status: "OK",
        summary: "Updated design",
        keyPoints: [],
        detailBlocks: [
          {
            title: "Slide Frame JSON",
            body: [
              JSON.stringify({
                slideFrames: [
                  {
                    slideNumber: 1,
                    title: "Updated overview",
                    layoutFrameId: "adaptiveTextMain",
                    blocks: [
                      {
                        id: "block1",
                        kind: "textStack",
                        styleId: "textStackTopLeft",
                        heading: "Updated overview",
                        text: "Updated body text.",
                      },
                      {
                        id: "block2",
                        kind: "visual",
                        styleId: "visualContain",
                        visualRequest: {
                          type: "photo",
                          brief: "Updated scene",
                          prompt: "Updated visual prompt.",
                          labels: ["New visual label"],
                          visualSlots: [
                            {
                              slotId: "scene",
                              label: "New visual label",
                              need: "updated visual need",
                              order: 1,
                            },
                          ],
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
    });

    const handled = await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_library_update_label",
        "Update the visual label.",
      ].join("\n"),
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [],
        recordIngestedDocument: vi.fn(),
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(savedDesign.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    const patch = updateStoredDocument.mock.calls[0]?.[1] as {
      structuredPayload: ReturnType<typeof buildRecentDesign>["plan"];
    };
    const updatedVisual = patch.structuredPayload.slideFrames[0].blocks[1].visualRequest;
    expect(updatedVisual?.preferredImageId).toBe("img_saved");
    expect(updatedVisual?.labels).toEqual(["New visual label"]);
    expect(updatedVisual?.selectionMatches?.[0]).toMatchObject({
      imageId: "img_saved",
      label: "New visual label",
      need: "updated visual need",
    });
    const frameSpec = buildFramePresentationSpecFromTaskPlan(patch.structuredPayload);
    expect(frameSpec?.slideFrames[0].blocks[1].visualRequest?.brief).toBe(
      "New visual label"
    );
  });

  it("does not overwrite a saved PPT design when an update result lacks slideFrames", async () => {
    const savedDesign = buildRecentDesign("ppt_library_update_empty", {
      selectedImageId: "img_saved",
      visualLabel: "Saved visual label",
    });
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];
    runAutoUpdatePresentationTaskMock.mockResolvedValueOnce({
      raw: "",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      parsed: {
        taskId: "task",
        type: "PREP_TASK",
        status: "OK",
        summary: "Incomplete update",
        keyPoints: [],
        detailBlocks: [],
        warnings: [],
        missingInfo: [],
        nextSuggestion: [],
      },
    });

    const handled = await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_library_update_empty",
        "Slide 3 visual should be Kichijoji station.",
      ].join("\n"),
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [],
        recordIngestedDocument: vi.fn(),
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(savedDesign.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(updateStoredDocument).not.toHaveBeenCalled();
    expect(messages.at(-1)?.text).toContain(
      "Presentation design update could not be applied."
    );
    expect(messages.at(-1)?.text).toContain(
      "The update result did not include slideFrames"
    );
    expect(messages.at(-1)?.meta?.presentationPlan?.slideFrames).toHaveLength(1);
  });
});
