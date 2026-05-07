import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPresentationTaskPlanTextWithImagePreviews } from "@/lib/app/presentation/presentationPlanChatDisplay";
import { buildPresentationTaskPlan } from "@/lib/app/presentation/presentationTaskPlanning";

const { loadGeneratedImageAssetMock } = vi.hoisted(() => ({
  loadGeneratedImageAssetMock: vi.fn(),
}));

vi.mock("@/lib/app/image/imageAssetStorage", () => ({
  loadGeneratedImageAsset: loadGeneratedImageAssetMock,
}));

describe("presentationPlanChatDisplay", () => {
  beforeEach(() => {
    let urlIndex = 0;
    vi.stubGlobal("window", {
      atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => {
        urlIndex += 1;
        return `blob:preview-${urlIndex}`;
      }),
    });
    loadGeneratedImageAssetMock.mockResolvedValue({
      base64: Buffer.from("image").toString("base64"),
      mimeType: "image/png",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("places each selected slot image preview directly under its own selected-image line", async () => {
    const plan = buildPresentationTaskPlan({
      title: "Slot preview",
      rawText: "",
      result: {
        taskId: "task",
        type: "PREP_TASK",
        status: "OK",
        summary: "Slot preview",
        keyPoints: [],
        detailBlocks: [
          {
            title: "Slide Frame JSON",
            body: [
              JSON.stringify({
                slideFrames: [
                  {
                    slideNumber: 1,
                    title: "Two visuals",
                    layoutFrameId: "adaptiveTextMain",
                    blocks: [
                      {
                        id: "block1",
                        kind: "visual",
                        styleId: "visualContain",
                        visualRequest: {
                          type: "photo",
                          brief: "Two visuals",
                          visualSlots: [
                            { slotId: "first", label: "First", need: "first image", order: 1 },
                            { slotId: "second", label: "Second", need: "second image", order: 2 },
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
    const visual = plan.slideFrames[0].blocks[0].visualRequest;
    if (visual) {
      visual.selectionMatches = [
        {
          slotId: "first",
          label: "First",
          need: "first image",
          status: "selected",
          imageId: "img_first",
          score: 1,
          threshold: 1,
        },
        {
          slotId: "second",
          label: "Second",
          need: "second image",
          status: "selected",
          imageId: "img_second",
          score: 1,
          threshold: 1,
        },
      ];
      visual.preferredImageId = "img_first";
      visual.candidateImageIds = ["img_first", "img_second"];
    }

    const text = await buildPresentationTaskPlanTextWithImagePreviews(plan);
    const lines = text.split(/\r?\n/);
    const firstLine = lines.findIndex(
      (line) => line.includes("img_first") && !line.startsWith("!")
    );
    const secondLine = lines.findIndex(
      (line) => line.includes("img_second") && !line.startsWith("!")
    );

    expect(firstLine).toBeGreaterThan(-1);
    expect(secondLine).toBeGreaterThan(-1);
    expect(lines[firstLine + 1]).toContain("![img_first](blob:preview-1)");
    expect(lines[firstLine + 1]).not.toContain("img_second");
    expect(lines[secondLine + 1]).toContain("![img_second](blob:preview-2)");
  });
});
