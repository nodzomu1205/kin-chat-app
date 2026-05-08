import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import {
  buildFlowArgs,
  buildGeneratedImageLibraryItem,
  buildPresentationPlanLibraryItem,
  buildRecentDesign,
} from "@/lib/app/presentation/presentationGptFlowTestHelpers";
import type { Message } from "@/types/chat";

describe("runPresentationGptCommandFlow Resolve visuals cover commands", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body || "{}")) as {
          slots?: Array<{ key: string; label?: string; need?: string; keywords?: string[]; context?: string }>;
        };
        return {
          ok: true,
          json: async () => ({
            normalized: Object.fromEntries(
              (body.slots || []).map((slot) => [
                slot.key,
                [slot.label, slot.need, ...(slot.keywords || []), slot.context]
                  .filter(Boolean)
                  .join(" "),
              ])
            ),
            usage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 },
          }),
        };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets Resolve visuals select a visualTitleCover opening image", async () => {
    const design = buildRecentDesign("ppt_cover_visual");
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
          visualSlots: [
            {
              slotId: "cover",
              label: "Opening cover",
              need: "students english classroom wide cover",
              keywords: ["students", "english", "classroom"],
              order: 1,
            },
          ],
        },
      },
    };
    const messages: Message[] = [];

    const previewHandled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_cover_visual\nResolve visual blocks",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [],
        recordIngestedDocument: vi.fn(),
        referenceLibraryItems: [
          buildPresentationPlanLibraryItem(design.plan),
          buildGeneratedImageLibraryItem("img_cover"),
        ],
        imageLibraryReferenceEnabled: true,
        imageLibraryReferenceCount: 10,
      }),
      assistantRequestArgs: {} as never,
    });

    expect(previewHandled).toBe(true);
    expect(messages.at(-1)?.text).toContain("Opening slide / visual / slot 1:");
    expect(messages.at(-1)?.text).toContain("img_cover");

    const updateStoredDocument = vi.fn();
    const applyHandled = await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_cover_visual",
        "Resolve visuals",
        "Opening slide / visual / slot 1: img_cover",
      ].join("\n"),
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [],
        recordIngestedDocument: vi.fn(),
        updateStoredDocument,
        referenceLibraryItems: [
          buildPresentationPlanLibraryItem(design.plan),
          buildGeneratedImageLibraryItem("img_cover"),
        ],
        imageLibraryReferenceEnabled: true,
        imageLibraryReferenceCount: 10,
      }),
      assistantRequestArgs: {} as never,
    });

    expect(applyHandled).toBe(true);
    const patch = updateStoredDocument.mock.calls[0]?.[1] as {
      structuredPayload: ReturnType<typeof buildRecentDesign>["plan"];
      text: string;
    };
    expect(
      patch.structuredPayload.deckFrame?.openingSlide?.visualRequest
        ?.preferredImageId
    ).toBe("img_cover");
    expect(patch.text).toContain("Opening slide: visualTitleCover / Recent deck");
    expect(patch.text).toContain("img_cover");
  });

  it("keeps an opening slide image when later resolving a body visual block", async () => {
    const design = buildRecentDesign("ppt_cover_then_block");
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
          visualSlots: [
            {
              slotId: "cover",
              label: "Opening cover",
              need: "students english classroom wide cover",
              keywords: ["students", "english", "classroom"],
              order: 1,
            },
          ],
          preferredImageId: "img_cover",
          candidateImageIds: ["img_cover"],
          usagePolicy: "useOneBest",
          maxVisualItems: 1,
        },
      },
    };
    const messages: Message[] = [];
    const updateStoredDocument = vi.fn();

    const handled = await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_cover_then_block",
        "Resolve visuals",
        "Slide 1 / block 2 / slot 1: img_students",
      ].join("\n"),
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [],
        recordIngestedDocument: vi.fn(),
        updateStoredDocument,
        referenceLibraryItems: [
          buildPresentationPlanLibraryItem(design.plan),
          buildGeneratedImageLibraryItem("img_cover"),
          buildGeneratedImageLibraryItem("img_students"),
        ],
        imageLibraryReferenceEnabled: true,
        imageLibraryReferenceCount: 10,
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    const patch = updateStoredDocument.mock.calls[0]?.[1] as {
      structuredPayload: ReturnType<typeof buildRecentDesign>["plan"];
      text: string;
    };
    expect(
      patch.structuredPayload.deckFrame?.openingSlide?.visualRequest
        ?.preferredImageId
    ).toBe("img_cover");
    expect(
      patch.structuredPayload.slideFrames[0].blocks[1].visualRequest?.prompt
    ).toBe("A student studying with English exam books.");
    expect(
      patch.structuredPayload.slideFrames[0].blocks[1].visualRequest
        ?.preferredImageId
    ).toBe("img_students");
    expect(patch.text).toContain("img_cover");
    expect(patch.text).toContain("img_students");
  });
});
