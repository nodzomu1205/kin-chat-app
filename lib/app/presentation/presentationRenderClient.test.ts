import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPresentationPptx } from "@/lib/app/presentation/presentationRenderClient";

describe("renderPresentationPptx", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the render payload without changing image settings", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () =>
        JSON.stringify({
          output: {
            id: "pptx-1",
            filename: "deck.pptx",
            path: "/generated-presentations/deck.pptx",
            slideCount: 1,
          },
        }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const output = await renderPresentationPptx({
      documentId: "ppt_render_client",
      frameSpec: { slideFrames: [{ title: "Slide 1" }] },
      generateImages: true,
      imageMode: "library",
      libraryImageAssets: [
        {
          imageId: "img_selected",
          title: "Selected image",
          mimeType: "image/png",
          base64: "aW1hZ2U=",
        },
      ],
    });

    expect(output).toMatchObject({
      id: "pptx-1",
      filename: "deck.pptx",
      path: "/generated-presentations/deck.pptx",
      slideCount: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/presentation-render",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(String(init.body))).toMatchObject({
      documentId: "ppt_render_client",
      generateImages: true,
      imageMode: "library",
      libraryImageAssets: [
        {
          imageId: "img_selected",
          title: "Selected image",
          mimeType: "image/png",
          base64: "aW1hZ2U=",
        },
      ],
    });
  });

  it("keeps the existing failure detail shape for non-json responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "renderer exploded",
      }))
    );

    await expect(
      renderPresentationPptx({ documentId: "ppt_render_error" })
    ).rejects.toThrow(
      "Presentation render failed. HTTP 500 Internal Server Error.\nResponse preview: renderer exploded"
    );
  });
});
