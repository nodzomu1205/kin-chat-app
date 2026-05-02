import { describe, expect, it } from "vitest";
import {
  resolveFrameSpecVisualAssets,
  stripFrameSpecVisualAssets,
} from "@/lib/server/presentation/imageGeneration";

describe("stripFrameSpecVisualAssets", () => {
  it("removes generated assets without changing visual prompts", () => {
    const spec = {
      slideFrames: [
        {
          blocks: [
            {
              visualRequest: {
                brief: "map",
                prompt: "world map",
                asset: {
                  imageId: "img_1",
                  mimeType: "image/png",
                  base64: "abc",
                },
              },
            },
          ],
        },
      ],
    };

    const stripped = stripFrameSpecVisualAssets(spec);

    expect(stripped.slideFrames[0].blocks[0].visualRequest).toMatchObject({
      brief: "map",
      prompt: "world map",
    });
    expect(stripped.slideFrames[0].blocks[0].visualRequest.asset).toBeUndefined();
    expect(spec.slideFrames[0].blocks[0].visualRequest.asset?.imageId).toBe("img_1");
  });

  it("removes generated assets from deck bookend visuals", () => {
    const spec = {
      deckFrame: {
        openingSlide: {
          enabled: true,
          frameId: "visualTitleCover",
          visualRequest: {
            brief: "cover",
            asset: { imageId: "img_cover", mimeType: "image/png", base64: "abc" },
          },
        },
      },
      slideFrames: [],
    };

    const stripped = stripFrameSpecVisualAssets(spec);

    expect(stripped.deckFrame.openingSlide.visualRequest.asset).toBeUndefined();
  });
});

describe("resolveFrameSpecVisualAssets", () => {
  it("uses a preferred image-library id without calling image generation", async () => {
    const spec = {
      slideFrames: [
        {
          blocks: [
            {
              visualRequest: {
                brief: "cotton harvest",
                preferredImageId: "img_cotton",
              },
            },
          ],
        },
      ],
    };

    const resolved = await resolveFrameSpecVisualAssets(spec, {
      mode: "library",
      libraryImageAssets: [
        {
          imageId: "img_cotton",
          mimeType: "image/png",
          base64: "abc",
          description: "cotton harvest photo",
          widthPx: 1536,
          heightPx: 1024,
          aspectRatio: 1.5,
          orientation: "landscape",
        },
      ],
    });

    expect(resolved.slideFrames[0].blocks[0].visualRequest.asset).toMatchObject({
      imageId: "img_cotton",
      base64: "abc",
      widthPx: 1536,
      heightPx: 1024,
      aspectRatio: 1.5,
      orientation: "landscape",
    });
  });

  it("hydrates deck bookend visual requests from the image library", async () => {
    const spec = {
      deckFrame: {
        openingSlide: {
          enabled: true,
          frameId: "visualTitleCover",
          visualRequest: {
            brief: "cotton cover photo",
            preferredImageId: "img_cover",
          },
        },
      },
      slideFrames: [],
    };

    const resolved = await resolveFrameSpecVisualAssets(spec, {
      mode: "library",
      libraryImageAssets: [
        {
          imageId: "img_cover",
          mimeType: "image/png",
          base64: "cover-base64",
          description: "cotton cover photo",
          widthPx: 1536,
          heightPx: 1024,
          aspectRatio: 1.5,
          orientation: "landscape",
        },
      ],
    });

    expect(resolved.deckFrame.openingSlide.visualRequest.asset).toMatchObject({
      imageId: "img_cover",
      base64: "cover-base64",
      orientation: "landscape",
    });
  });

  it("allows an explicitly preferred image-library id to be reused", async () => {
    const spec = {
      slideFrames: [
        {
          blocks: [
            {
              visualRequest: {
                brief: "main process chart",
                preferredImageId: "img_process",
              },
            },
          ],
        },
        {
          blocks: [
            {
              visualRequest: {
                brief: "same process chart for detail",
                preferredImageId: "img_process",
              },
            },
          ],
        },
      ],
    };

    const resolved = await resolveFrameSpecVisualAssets(spec, {
      mode: "library",
      libraryImageAssets: [
        {
          imageId: "img_process",
          mimeType: "image/png",
          base64: "abc",
          description: "process chart",
        },
      ],
    });

    expect(resolved.slideFrames[0].blocks[0].visualRequest.asset?.imageId).toBe(
      "img_process"
    );
    expect(resolved.slideFrames[1].blocks[0].visualRequest.asset?.imageId).toBe(
      "img_process"
    );
  });

  it("does not silently replace a missing preferred image-library id with another asset", async () => {
    const spec = {
      slideFrames: [
        {
          blocks: [
            {
              visualRequest: {
                brief: "cotton flower photo",
                preferredImageId: "img_missing",
              },
            },
          ],
        },
      ],
    };

    const resolved = await resolveFrameSpecVisualAssets(spec, {
      mode: "library",
      libraryImageAssets: [
        {
          imageId: "img_other",
          mimeType: "image/png",
          base64: "abc",
          description: "cotton flower photo",
        },
      ],
    });

    expect(resolved.slideFrames[0].blocks[0].visualRequest.asset).toBeUndefined();
  });

  it("resolves a preferred id that actually matches the library image title alias", async () => {
    const spec = {
      slideFrames: [
        {
          blocks: [
            {
              visualRequest: {
                brief: "cotton flower photo",
                preferredImageId: "img_f2248aa3-4a19-4053-8df4-36df2797e5c7",
              },
            },
          ],
        },
      ],
    };

    const resolved = await resolveFrameSpecVisualAssets(spec, {
      mode: "library",
      libraryImageAssets: [
        {
          imageId: "img_18cc183c-a3f0-4650-aeac-bf2891738715",
          title: "img_f2248aa3-4a19-4053-8df4-36df2797e5c7",
          mimeType: "image/png",
          base64: "cotton-base64",
          description: "cotton flower photo",
        },
      ],
    });

    expect(resolved.slideFrames[0].blocks[0].visualRequest).toMatchObject({
      preferredImageId: "img_18cc183c-a3f0-4650-aeac-bf2891738715",
      asset: {
        imageId: "img_18cc183c-a3f0-4650-aeac-bf2891738715",
        base64: "cotton-base64",
      },
    });
  });

  it("matches Japanese visual text against Japanese image metadata", async () => {
    const spec = {
      slideFrames: [
        {
          blocks: [
            {
              visualRequest: {
                brief: "綿花畑で収穫する農民の写真",
              },
            },
          ],
        },
      ],
    };

    const resolved = await resolveFrameSpecVisualAssets(spec, {
      mode: "library",
      libraryImageAssets: [
        {
          imageId: "img_field",
          mimeType: "image/png",
          base64: "abc",
          description: "インドの綿花畑で農民が収穫している写真",
        },
      ],
    });

    expect(resolved.slideFrames[0].blocks[0].visualRequest.asset?.imageId).toBe(
      "img_field"
    );
  });
});
