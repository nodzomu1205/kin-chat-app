import { describe, expect, it, vi } from "vitest";
import {
  collectFrameSpecPreferredImageIds,
  runPresentationGptCommandFlow,
} from "@/lib/app/presentation/presentationGptFlow";
import {
  buildPresentationTaskPlan,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import type { Message, ReferenceLibraryItem } from "@/types/chat";

describe("collectFrameSpecPreferredImageIds", () => {
  it("includes opening cover visual image IDs so visualTitleCover can hydrate library assets", () => {
    const ids = collectFrameSpecPreferredImageIds({
      version: "0.1-frame",
      title: "Cotton",
      language: "ja",
      theme: "business-clean",
      density: "standard",
      deckFrame: {
        slideCount: 1,
        masterFrameId: "titleLineFooter",
        openingSlide: {
          enabled: true,
          frameId: "visualTitleCover",
          visualRequest: {
            type: "photo",
            brief: "Cover",
            preferredImageId: "img_cover",
            candidateImageIds: ["img_cover_alt"],
          },
        },
      },
      slideFrames: [
        {
          slideNumber: 1,
          title: "Body",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "adaptiveTextMain",
          blocks: [
            {
              id: "visual",
              kind: "visual",
              styleId: "visualContain",
              visualRequest: {
                type: "photo",
                brief: "Body",
                preferredImageId: "img_body",
              },
            },
          ],
        },
      ],
    });

    expect(Array.from(ids)).toEqual(["img_cover", "img_cover_alt", "img_body"]);
  });
});

describe("runPresentationGptCommandFlow", () => {
  it("saves a recent unsaved PPT design by Document ID", async () => {
    const design = buildRecentDesign("ppt_recent_save");
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-save" }));
    const messages: Message[] = [];

    const handled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_recent_save\nSave",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [
          { id: "g1", role: "gpt", text: design.text, meta: { presentationPlan: design.plan } },
        ],
        recordIngestedDocument,
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: "presentation_plan",
        filename: "ppt_recent_save.txt",
        text: expect.stringContaining("Document ID: ppt_recent_save"),
        structuredPayload: expect.objectContaining({
          documentId: "ppt_recent_save",
        }),
      })
    );
    expect(messages.at(-1)?.text).toContain("Presentation design is saved in the library.");
  });

  it("updates an existing library card when saving a PPT design again", async () => {
    const oldDesign = buildRecentDesign("ppt_existing_save", {
      visualLabel: "Old label",
    });
    const newDesign = buildRecentDesign("ppt_existing_save", {
      visualLabel: "New label",
    });
    const recordIngestedDocument = vi.fn(() => ({ id: "should-not-create" }));
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];

    const handled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_existing_save\nSave",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [
          {
            id: "g1",
            role: "gpt",
            text: newDesign.text,
            meta: { presentationPlan: newDesign.plan },
          },
        ],
        recordIngestedDocument,
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(oldDesign.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(updateStoredDocument).toHaveBeenCalledWith(
      "stored-ppt_existing_save",
      expect.objectContaining({
        text: expect.stringContaining("New label"),
        structuredPayload: expect.objectContaining({
          documentId: "ppt_existing_save",
        }),
      })
    );
    expect(messages.at(-1)?.text).toContain("Presentation design is saved in the library.");
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

  it("saves a recent unsaved PPT design before creating PPTX", async () => {
    const design = buildRecentDesign("ppt_recent_render", {
      selectedImageId: "img_selected",
    });
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-render" }));
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          output: {
            id: "pptx-1",
            format: "pptx",
            filename: "ppt_recent_render.pptx",
            path: "/generated-presentations/ppt_recent_render.pptx",
            slideCount: 1,
          },
        }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const handled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_recent_render\nSave and create PPT",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [
          { id: "g1", role: "gpt", text: design.text, meta: { presentationPlan: design.plan } },
        ],
        recordIngestedDocument,
        updateStoredDocument,
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "ppt_recent_render.txt" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/presentation-render",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("ppt_recent_render"),
      })
    );
    const [, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const requestBody = JSON.parse(requestInit.body as string);
    expect(requestBody).toMatchObject({
      generateImages: true,
      imageMode: "library",
    });
    expect(requestBody.frameSpec.slideFrames[0].blocks[1].visualRequest).toMatchObject({
      preferredImageId: "img_selected",
      candidateImageIds: ["img_selected"],
    });
    expect(updateStoredDocument).toHaveBeenCalledWith(
      "stored-render",
      expect.objectContaining({
        structuredPayload: expect.objectContaining({
          latestPptx: expect.objectContaining({
            filename: "ppt_recent_render.pptx",
          }),
        }),
      })
    );

    vi.unstubAllGlobals();
  });

  it("preserves the resolved visual label when applying manual visual selections", async () => {
    const design = buildRecentDesign("ppt_resolve_label", {
      visualLabel: "Original broad label",
      visualSlots: [
        {
          slotId: "classroom",
          label: "Resolved classroom label",
          need: "student english classroom lesson",
          keywords: ["student", "english", "classroom"],
          order: 1,
        },
      ],
    });
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];

    const handled = await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_resolve_label",
        "Resolve visuals",
        "Slide 1 / block 2: img_students",
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
          "ビジュアル内表示ラベル: Resolved classroom label"
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
    expect(patch.text).not.toContain("ビジュアル内表示ラベル: Original broad label");
    expect(
      patch.structuredPayload.slideFrames[0].blocks[1].visualRequest?.labels
    ).toEqual(["Resolved classroom label"]);
    expect(
      patch.structuredPayload.slideFrames[0].blocks[1].visualRequest
        ?.preferredImageId
    ).toBe("img_students");
    expect(messages.at(-1)?.text).toContain(
      "ビジュアル内表示ラベル: Resolved classroom label"
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
    const messages: Message[] = [];

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
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(messages.at(-1)?.text).toContain("現在選択中の画像:");
    expect(messages.at(-1)?.text).toContain("- img_current");
    expect(messages.at(-1)?.text).toContain("Opening slide / visual:");
    expect(messages.at(-1)?.text).toContain("img_auto");
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
    expect(messages.at(-1)?.text).toContain("Opening slide / visual:");
    expect(messages.at(-1)?.text).toContain("img_cover");

    const updateStoredDocument = vi.fn();
    const applyHandled = await runPresentationGptCommandFlow({
      rawText: [
        "/ppt",
        "Document ID: ppt_cover_visual",
        "Resolve visuals",
        "Opening slide / visual: img_cover",
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
        "Slide 1 / block 2: img_students",
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
      patch.structuredPayload.slideFrames[0].blocks[1].visualRequest
        ?.preferredImageId
    ).toBe("img_students");
    expect(patch.text).toContain("img_cover");
    expect(patch.text).toContain("img_students");
  });
});

function buildRecentDesign(
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

function buildPresentationPlanLibraryItem(
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

function buildGeneratedImageLibraryItem(imageId: string): ReferenceLibraryItem {
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

function buildFlowArgs(args: {
  messages: Message[];
  recentMessages: Message[];
  recordIngestedDocument: ReturnType<typeof vi.fn>;
  updateStoredDocument?: ReturnType<typeof vi.fn>;
  referenceLibraryItems?: ReferenceLibraryItem[];
  imageLibraryReferenceEnabled?: boolean;
  imageLibraryReferenceCount?: number;
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
  } as unknown as Parameters<typeof runPresentationGptCommandFlow>[0]["flowArgs"];
}
