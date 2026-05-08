import { describe, expect, it, vi } from "vitest";
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import {
  buildFlowArgs,
  buildPresentationPlanLibraryItem,
  buildRecentDesign,
} from "@/lib/app/presentation/presentationGptFlowTestHelpers";
import type { Message } from "@/types/chat";

describe("runPresentationGptCommandFlow Resolve visuals save commands", () => {
  it("saves selected image IDs from the Resolve visuals result message", async () => {
    const savedDesign = buildRecentDesign("ppt_resolve_then_save", {
      visualLabel: "Saved label",
    });
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];

    await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_resolve_then_save",
        "Resolve visuals",
        "Slide 1 / block 2: img_selected_after_resolve",
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

    expect(messages.at(-1)?.meta?.presentationPlan?.slideFrames[0].blocks[1].visualRequest).toMatchObject({
      preferredImageId: "img_selected_after_resolve",
      candidateImageIds: ["img_selected_after_resolve"],
    });

    await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_resolve_then_save\nSave",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: messages,
        recordIngestedDocument: vi.fn(),
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(savedDesign.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    const savePatch = updateStoredDocument.mock.calls.at(-1)?.[1] as {
      structuredPayload: ReturnType<typeof buildRecentDesign>["plan"];
      text: string;
    };
    expect(savePatch.structuredPayload.slideFrames[0].blocks[1].visualRequest).toMatchObject({
      preferredImageId: "img_selected_after_resolve",
      candidateImageIds: ["img_selected_after_resolve"],
    });
    expect(savePatch.text).toContain("img_selected_after_resolve");
  });

  it("saves opening and body images immediately after Resolve visuals even before library props refresh", async () => {
    const design = buildRecentDesign("ppt_resolve_immediate_save", {
      visualLabel: "Body visual",
    });
    design.plan.deckFrame = {
      slideCount: 1,
      masterFrameId: "titleLineFooter",
      openingSlide: {
        enabled: true,
        frameId: "visualTitleCover",
        title: "Recent deck",
        visualRequest: {
          type: "photo",
          brief: "Opening classroom cover",
          prompt: "Wide cover photo of students learning English in a classroom.",
          labels: ["Opening classroom cover"],
        },
      },
    };
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];
    const flowArgs = buildFlowArgs({
      messages,
      recentMessages: [
        {
          id: "g1",
          role: "gpt",
          text: design.text,
          meta: { presentationPlan: design.plan },
        },
      ],
      recordIngestedDocument: vi.fn(),
      updateStoredDocument,
      referenceLibraryItems: [buildPresentationPlanLibraryItem(design.plan)],
    });

    await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_resolve_immediate_save",
        "Resolve visuals",
        "Opening slide / visual: img_cover_selected",
        "Slide 1 / block 2: img_body_selected",
      ].join("\n"),
      flowArgs,
      assistantRequestArgs: {} as never,
    });

    expect(
      flowArgs.gptStateRef.current.recentMessages?.at(-1)?.meta?.presentationPlan
        ?.deckFrame?.openingSlide?.visualRequest?.preferredImageId
    ).toBe("img_cover_selected");
    expect(
      flowArgs.gptStateRef.current.recentMessages?.at(-1)?.meta?.presentationPlan
        ?.slideFrames[0].blocks[1].visualRequest?.preferredImageId
    ).toBe("img_body_selected");

    await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_resolve_immediate_save\nSave",
      flowArgs,
      assistantRequestArgs: {} as never,
    });

    const savePatch = updateStoredDocument.mock.calls.at(-1)?.[1] as {
      structuredPayload: ReturnType<typeof buildRecentDesign>["plan"];
      text: string;
    };
    expect(
      savePatch.structuredPayload.deckFrame?.openingSlide?.visualRequest
        ?.preferredImageId
    ).toBe("img_cover_selected");
    expect(
      savePatch.structuredPayload.slideFrames[0].blocks[1].visualRequest
        ?.preferredImageId
    ).toBe("img_body_selected");
    expect(savePatch.text).toContain("img_cover_selected");
    expect(savePatch.text).toContain("img_body_selected");
  });
});
