import { describe, expect, it, vi } from "vitest";
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import {
  buildFlowArgs,
  buildPresentationPlanLibraryItem,
  buildRecentDesign,
} from "@/lib/app/presentation/presentationGptFlowTestHelpers";
import type { Message } from "@/types/chat";

describe("runPresentationGptCommandFlow Resolve visuals slot commands", () => {
  it("removes only the targeted slot image when Resolve visuals uses off", async () => {
    const design = buildRecentDesign("ppt_slot_off", {
      visualSlots: [
        {
          slotId: "first",
          label: "First slot",
          need: "first image",
          order: 1,
        },
        {
          slotId: "second",
          label: "Second slot",
          need: "second image",
          order: 2,
        },
      ],
    });
    const visual = design.plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.preferredImageId = "img_first";
      visual.candidateImageIds = ["img_first", "img_second"];
      visual.selectionMatches = [
        {
          slotId: "first",
          label: "First slot",
          need: "first image",
          status: "selected",
          imageId: "img_first",
          score: 1,
          threshold: 1,
        },
        {
          slotId: "second",
          label: "Second slot",
          need: "second image",
          status: "selected",
          imageId: "img_second",
          score: 1,
          threshold: 1,
        },
      ];
    }
    const messages: Message[] = [];
    const updateStoredDocument = vi.fn();

    const handled = await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_slot_off",
        "Resolve visuals",
        "Slide 1 / block 2 / slot 1: off",
      ].join("\n"),
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [],
        recordIngestedDocument: vi.fn(),
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(design.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    const patch = updateStoredDocument.mock.calls[0]?.[1] as {
      structuredPayload: ReturnType<typeof buildRecentDesign>["plan"];
      text: string;
    };
    const updatedVisual = patch.structuredPayload.slideFrames[0].blocks[1].visualRequest;
    expect(updatedVisual?.preferredImageId).toBe("img_second");
    expect(updatedVisual?.candidateImageIds).toEqual(["img_second"]);
    expect(updatedVisual?.selectionMatches).toEqual([
      expect.objectContaining({
        slotId: "second",
        imageId: "img_second",
        status: "selected",
      }),
    ]);
    expect(patch.text).not.toContain("img_first");
    expect(patch.text).toContain("img_second");
  });

  it("keeps only explicitly selected slot images when a block has multiple slots", async () => {
    const design = buildRecentDesign("ppt_one_slot_selected", {
      visualSlots: [
        {
          slotId: "first",
          label: "First slot",
          need: "first image",
          order: 1,
        },
        {
          slotId: "second",
          label: "Second slot",
          need: "second image",
          order: 2,
        },
      ],
    });
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];

    const handled = await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_one_slot_selected",
        "Resolve visuals",
        "Slide 1 / block 2 / slot 1: img_first",
      ].join("\n"),
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [],
        recordIngestedDocument: vi.fn(),
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(design.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    const patch = updateStoredDocument.mock.calls[0]?.[1] as {
      structuredPayload: ReturnType<typeof buildRecentDesign>["plan"];
      text: string;
    };
    const updatedVisual = patch.structuredPayload.slideFrames[0].blocks[1].visualRequest;
    expect(updatedVisual?.preferredImageId).toBe("img_first");
    expect(updatedVisual?.candidateImageIds).toEqual(["img_first"]);
    expect(updatedVisual?.selectionMatches).toEqual([
      expect.objectContaining({
        slotId: "first",
        imageId: "img_first",
        status: "selected",
      }),
    ]);
    expect(patch.text).toContain("img_first");
    expect(patch.text).not.toContain("img_second");
  });
});
