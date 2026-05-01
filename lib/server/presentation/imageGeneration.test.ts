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
