import { describe, expect, it, vi } from "vitest";
import {
  collectFrameSpecPreferredImageIds,
  hydratePresentationLibraryImageAssets,
} from "@/lib/app/presentation/presentationRenderImages";

vi.mock("@/lib/app/image/imageAssetStorage", () => ({
  loadGeneratedImageAsset: vi.fn(async (imageId: string) => ({
    imageId,
    mimeType: "image/png",
    base64: "base64-image",
  })),
}));

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

describe("hydratePresentationLibraryImageAssets", () => {
  it("hydrates explicitly selected images even when broad image library reference is off", async () => {
    const assets = await hydratePresentationLibraryImageAssets({
      imageLibraryReferenceEnabled: false,
      imageLibraryReferenceCount: 0,
      referenceLibraryItems: [
        {
          id: "item-img_selected",
          sourceId: "stored-img_selected",
          itemType: "kin_created",
          artifactType: "generated_image",
          title: "Selected visual",
          subtitle: "Image ID: img_selected",
          summary: "Selected visual",
          excerptText: "Selected visual",
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z",
          structuredPayload: {
            version: "0.1-generated-image",
            imageId: "img_selected",
            mimeType: "image/png",
            prompt: "Selected visual",
            createdAt: "2026-05-08T00:00:00.000Z",
          },
        },
      ],
      frameSpec: {
        version: "0.1-frame",
        title: "Deck",
        language: "ja",
        theme: "business-clean",
        density: "standard",
        deckFrame: undefined,
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
                  preferredImageId: "img_selected",
                },
              },
            ],
          },
        ],
      },
      onlyRequiredImageAssets: true,
    });

    expect(assets).toEqual([
      expect.objectContaining({
        imageId: "img_selected",
        base64: "base64-image",
      }),
    ]);
  });
});
