import { describe, expect, it } from "vitest";
import { collectFrameSpecPreferredImageIds } from "@/lib/app/presentation/presentationGptFlow";

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
