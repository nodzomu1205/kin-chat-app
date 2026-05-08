import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import {
  buildFlowArgs,
  buildGeneratedImageLibraryItem,
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

describe("runPresentationGptCommandFlow", () => {
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

  it("does not overwrite a saved renderable plan with a display-only parsed preview", async () => {
    const savedDesign = buildRecentDesign("ppt_existing_preview_save", {
      visualLabel: "Saved complete label",
    });
    const recordIngestedDocument = vi.fn(() => ({ id: "should-not-create" }));
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];

    const handled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_existing_preview_save\nSave",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [
          {
            id: "g1",
            role: "gpt",
            text: [
              "【PPT設計書】",
              "Document ID: ppt_existing_preview_save",
              "",
              "■ スライド設計",
              "- 未生成: スライド設計JSONがありません。PPTX出力前に設計書を更新してください。",
            ].join("\n"),
          },
        ],
        recordIngestedDocument,
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(savedDesign.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(updateStoredDocument).not.toHaveBeenCalled();
    expect(messages.at(-1)?.text).toContain("Presentation design is saved in the library.");
  });

  it("does not overwrite selected image IDs from a text-parsed legacy slide preview", async () => {
    const savedDesign = buildRecentDesign("ppt_existing_legacy_preview_save", {
      selectedImageId: "img_saved_selected",
      visualLabel: "Saved complete label",
    });
    const recordIngestedDocument = vi.fn(() => ({ id: "should-not-create" }));
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];

    const handled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_existing_legacy_preview_save\nSave",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [
          {
            id: "g1",
            role: "gpt",
            text: [
              "【PPT設計書】",
              "Document ID: ppt_existing_legacy_preview_save",
              "",
              "■ スライド設計",
              "- Slide 1: Preview title",
              "- Key message: Preview message",
              "- Visual: Preview visual text",
            ].join("\n"),
          },
        ],
        recordIngestedDocument,
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(savedDesign.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(updateStoredDocument).not.toHaveBeenCalled();
    expect(messages.at(-1)?.text).toContain("Presentation design is saved in the library.");
  });

  it("keeps the original visual slot prompt and label when applying visual selections", async () => {
    const design = buildRecentDesign("ppt_resolve_label", {
      visualLabel: "Original broad label",
      visualSlots: [
        {
          slotId: "classroom",
          label: "Automatic classroom label",
          need: "student english classroom lesson",
          keywords: ["student", "english", "classroom"],
          order: 1,
        },
      ],
    });
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];
    vi.mocked(fetch).mockClear();

    const handled = await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_resolve_label",
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
          buildGeneratedImageLibraryItem("img_students"),
        ],
        imageLibraryReferenceEnabled: true,
        imageLibraryReferenceCount: 10,
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(updateStoredDocument).toHaveBeenCalledWith(
      "stored-ppt_resolve_label",
      expect.objectContaining({
        text: expect.stringContaining(
          "ビジュアル内表示ラベル: Automatic classroom label"
        ),
        structuredPayload: expect.objectContaining({
          documentId: "ppt_resolve_label",
        }),
      })
    );
    const patch = updateStoredDocument.mock.calls[0]?.[1] as {
      structuredPayload: ReturnType<typeof buildRecentDesign>["plan"];
      text: string;
    };
    expect(patch.text).toContain("ビジュアルプロンプト: student english classroom lesson");
    expect(
      patch.structuredPayload.slideFrames[0].blocks[1].visualRequest?.labels
    ).toEqual(["Automatic classroom label"]);
    expect(
      patch.structuredPayload.slideFrames[0].blocks[1].visualRequest?.prompt
    ).toBe("A student studying with English exam books.");
    expect(
      patch.structuredPayload.slideFrames[0].blocks[1].visualRequest
        ?.preferredImageId
    ).toBe("img_students");
    expect(fetch).not.toHaveBeenCalled();
    expect(messages.at(-1)?.text).toContain(
      "ビジュアル内表示ラベル: Automatic classroom label"
    );
  });
  it("shows current selected images instead of automatic matches when reopening Resolve visual blocks", async () => {
    const design = buildRecentDesign("ppt_current_selection", {
      selectedImageId: "img_current",
      visualLabel: "Current selected label",
      visualSlots: [
        {
          slotId: "classroom",
          label: "Automatic classroom label",
          need: "student english classroom lesson",
          keywords: ["student", "english", "classroom"],
          order: 1,
        },
      ],
    });
    const openingVisual = design.plan.deckFrame?.openingSlide?.visualRequest;
    if (openingVisual) {
      openingVisual.preferredImageId = "img_cover_current";
      openingVisual.candidateImageIds = ["img_cover_current"];
      openingVisual.selectionMatches = [
        {
          slotId: "openingCover",
          label: "表紙イメージ",
          need: openingVisual.prompt || openingVisual.brief || "cover",
          status: "selected",
          imageId: "img_cover_current",
          score: 1,
          threshold: 1,
        },
      ];
    }
    const messages: Message[] = [];
    const applyTaskUsage = vi.fn();

    const handled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_current_selection\nResolve visual blocks",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [],
        recordIngestedDocument: vi.fn(),
        referenceLibraryItems: [
          buildPresentationPlanLibraryItem(design.plan),
          buildGeneratedImageLibraryItem("img_auto"),
        ],
        imageLibraryReferenceEnabled: true,
        imageLibraryReferenceCount: 10,
        applyTaskUsage,
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(messages.at(-1)?.text).toContain("現在選択中の画像:");
    expect(messages.at(-1)?.text).toContain("- img_current");
    expect(messages.at(-1)?.text).toContain("Opening slide / visual / slot 1:");
    expect(messages.at(-1)?.text).toContain("表紙イメージ");
    expect(messages.at(-1)?.text).not.toContain("Opening slide / visual: img_auto");
    expect(applyTaskUsage).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("removes all block images when the legacy block-level Resolve visuals line uses off", async () => {
    const design = buildRecentDesign("ppt_block_off", {
      selectedImageId: "img_selected",
      visualSlots: [
        {
          slotId: "first",
          label: "First slot",
          need: "first image",
          order: 1,
        },
      ],
    });
    const openingVisual = design.plan.deckFrame?.openingSlide?.visualRequest;
    if (openingVisual) {
      openingVisual.preferredImageId = "img_cover_current";
      openingVisual.candidateImageIds = ["img_cover_current"];
      openingVisual.selectionMatches = [
        {
          slotId: "openingCover",
          label: "表紙イメージ",
          need: openingVisual.prompt || openingVisual.brief || "cover",
          status: "selected",
          imageId: "img_cover_current",
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
        "Document ID: ppt_block_off",
        "Resolve visuals",
        "Slide 1 / block 2: off",
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
    expect(updatedVisual?.preferredImageId).toBeUndefined();
    expect(updatedVisual?.candidateImageIds).toBeUndefined();
    expect(updatedVisual?.selectionMatches).toBeUndefined();
    expect(patch.text).not.toContain("img_selected");
  });

  it("updates a saved library PPT design from /ppt Document ID comments after chat reset", async () => {
    const savedDesign = buildRecentDesign("ppt_library_update", {
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
                          labels: ["Updated visual label"],
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
        "Document ID: ppt_library_update",
        "3枚目の表現をより実務向けにしてください",
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
    expect(runAutoUpdatePresentationTaskMock).toHaveBeenCalledWith(
      expect.stringContaining("現在のPPT設計書:"),
      "ppt-library-update"
    );
    expect(updateStoredDocument).toHaveBeenCalledWith(
      "stored-ppt_library_update",
      expect.objectContaining({
        text: expect.stringContaining("Updated body text."),
        structuredPayload: expect.objectContaining({
          documentId: "ppt_library_update",
        }),
      })
    );
    const patch = updateStoredDocument.mock.calls[0]?.[1] as {
      structuredPayload: ReturnType<typeof buildRecentDesign>["plan"];
    };
    expect(
      patch.structuredPayload.slideFrames[0].blocks[1].visualRequest
        ?.preferredImageId
    ).toBe("img_saved");
    expect(messages.at(-1)?.text).toContain(
      "Presentation design updated and saved in the library."
    );
  });

});
