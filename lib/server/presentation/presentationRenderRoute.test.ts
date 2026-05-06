import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/presentation-render/route";

const onePixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw9kngAAAABJRU5ErkJggg==";

describe("presentation render route", () => {
  it("renders library image assets without echoing image payloads in the response", async () => {
    const response = await POST(
      new Request("http://localhost/api/presentation-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: "ppt_payload_route",
          generateImages: true,
          imageMode: "library",
          libraryImageAssets: [
            {
              imageId: "img_selected",
              mimeType: "image/png",
              base64: onePixelPng,
              description: "Selected payload image",
              widthPx: 1,
              heightPx: 1,
              aspectRatio: 1,
              orientation: "square",
            },
          ],
          frameSpec: {
            version: "0.1-frame",
            title: "Payload route deck",
            language: "en",
            theme: "business-clean",
            density: "standard",
            deckFrame: {
              slideCount: 1,
              masterFrameId: "titleLineFooter",
              openingSlide: {
                enabled: true,
                frameId: "visualTitleCover",
                title: "Payload route deck",
                visualRequest: {
                  type: "photo",
                  brief: "Selected payload cover image",
                  preferredImageId: "img_selected",
                },
              },
            },
            slideFrames: [
              {
                slideNumber: 1,
                title: "Payload slide",
                masterFrameId: "titleLineFooter",
                layoutFrameId: "adaptiveTextMain",
                slideRole: "textMain",
                blocks: [
                  {
                    id: "text",
                    kind: "list",
                    styleId: "listCompact",
                    items: ["Point"],
                  },
                  {
                    id: "visual",
                    kind: "visual",
                    styleId: "visualContain",
                    visualRequest: {
                      type: "photo",
                      brief: "Selected payload image",
                      preferredImageId: "img_selected",
                    },
                  },
                ],
              },
            ],
          },
        }),
      })
    );

    const data = (await response.json()) as {
      output?: {
        contentBase64?: string;
        generatedImages?: Array<{ contentBase64?: unknown }>;
        frameSpec?: unknown;
      };
      error?: string;
    };

    expect(response.status).toBe(200);
    expect(data.error).toBeUndefined();
    expect(data.output?.contentBase64).toEqual(expect.any(String));
    expect(data.output?.generatedImages).toHaveLength(2);
    expect(data.output?.generatedImages?.[0]?.contentBase64).toBeUndefined();
    expect(data.output?.frameSpec).toBeUndefined();
  });
});
