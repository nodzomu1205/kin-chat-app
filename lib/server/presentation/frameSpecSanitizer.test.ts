import { describe, expect, it } from "vitest";
import { sanitizeFrameSpecInputForParse } from "@/lib/server/presentation/frameSpecSanitizer";

describe("sanitizeFrameSpecInputForParse", () => {
  it("removes incomplete visual assets before renderer schema parsing", () => {
    const frameSpec = {
      version: "0.1-frame",
      title: "Deck",
      slideFrames: [
        {
          slideNumber: 1,
          title: "Slide",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "singleCenter",
          blocks: [
            {
              id: "block1",
              kind: "visual",
              styleId: "visualContain",
              visualRequest: {
                type: "diagram",
                asset: {
                  imageId: "img_saved_without_base64",
                  mimeType: "image/png",
                },
              },
            },
          ],
        },
      ],
    };

    const sanitized = sanitizeFrameSpecInputForParse(frameSpec);
    const visual =
      sanitized.slideFrames[0].blocks[0].visualRequest as {
        preferredImageId?: string;
        asset?: unknown;
      };

    expect(visual.asset).toBeUndefined();
    expect(visual.preferredImageId).toBe("img_saved_without_base64");
  });

  it("keeps complete visual assets that include base64", () => {
    const frameSpec = {
      slideFrames: [
        {
          blocks: [
            {
              visualRequest: {
                asset: {
                  imageId: "img_ready",
                  mimeType: "image/png",
                  base64: "abc",
                },
              },
            },
          ],
        },
      ],
    };

    const sanitized = sanitizeFrameSpecInputForParse(frameSpec);

    expect(sanitized.slideFrames[0].blocks[0].visualRequest.asset).toMatchObject({
      imageId: "img_ready",
      base64: "abc",
    });
  });
});
