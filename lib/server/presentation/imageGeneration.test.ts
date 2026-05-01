import { describe, expect, it } from "vitest";
import { stripFrameSpecVisualAssets } from "@/lib/server/presentation/imageGeneration";

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
