import { describe, expect, it, vi } from "vitest";
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import {
  buildFlowArgs,
  buildPresentationPlanLibraryItem,
  buildRecentDesign,
} from "@/lib/app/presentation/presentationGptFlowTestHelpers";
import type { Message } from "@/types/chat";

describe("runPresentationGptCommandFlow render commands", () => {
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

  it("renders the latest resolved visual selections before library props refresh", async () => {
    const savedDesign = buildRecentDesign("ppt_resolve_then_render");
    const selectedDesign = buildRecentDesign("ppt_resolve_then_render", {
      selectedImageId: "img_selected_after_resolve",
    });
    const updateStoredDocument = vi.fn();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          output: {
            id: "pptx-1",
            format: "pptx",
            filename: "ppt_resolve_then_render.pptx",
            path: "/generated-presentations/ppt_resolve_then_render.pptx",
            slideCount: 1,
          },
        }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const handled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_resolve_then_render\nSave and create PPT",
      flowArgs: buildFlowArgs({
        messages: [],
        recentMessages: [
          {
            id: "g1",
            role: "gpt",
            text: selectedDesign.text,
            meta: { presentationPlan: selectedDesign.plan },
          },
        ],
        recordIngestedDocument: vi.fn(),
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(savedDesign.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    const [, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const requestBody = JSON.parse(requestInit.body as string);
    expect(requestBody.frameSpec.slideFrames[0].blocks[1].visualRequest).toMatchObject({
      preferredImageId: "img_selected_after_resolve",
      candidateImageIds: ["img_selected_after_resolve"],
    });
    expect(updateStoredDocument).toHaveBeenCalledWith(
      "stored-ppt_resolve_then_render",
      expect.objectContaining({
        structuredPayload: expect.objectContaining({
          slideFrames: expect.arrayContaining([
            expect.objectContaining({
              blocks: expect.arrayContaining([
                expect.objectContaining({
                  visualRequest: expect.objectContaining({
                    preferredImageId: "img_selected_after_resolve",
                  }),
                }),
              ]),
            }),
          ]),
        }),
      })
    );

    vi.unstubAllGlobals();
  });
});
