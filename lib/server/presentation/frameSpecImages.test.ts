import { describe, expect, it } from "vitest";
import { collectFrameSpecGeneratedImages } from "@/lib/server/presentation/frameSpecImages";

describe("collectFrameSpecGeneratedImages", () => {
  it("includes opening, body, and closing visual assets in render responses", () => {
    const images = collectFrameSpecGeneratedImages({
      deckFrame: {
        openingSlide: {
          visualRequest: {
            brief: "Cover",
            asset: {
              imageId: "img_cover",
              mimeType: "image/png",
              base64: "cover",
            },
          },
        },
        closingSlide: {
          visualRequest: {
            brief: "Closing",
            asset: {
              imageId: "img_close",
              mimeType: "image/png",
              base64: "close",
            },
          },
        },
      },
      slideFrames: [
        {
          slideNumber: 1,
          title: "Body",
          blocks: [
            {
              id: "block1",
              visualRequest: {
                brief: "Body image",
                asset: {
                  imageId: "img_body",
                  mimeType: "image/png",
                  base64: "body",
                },
              },
            },
          ],
        },
      ],
    });

    expect(images.map((image) => image.imageId)).toEqual([
      "img_cover",
      "img_body",
      "img_close",
    ]);
    expect(images.map((image) => image.blockId)).toEqual([
      "openingSlide",
      "block1",
      "closingSlide",
    ]);
  });
});
