export function sanitizeFrameSpecInputForParse<T>(frameSpec: T): T {
  const next = JSON.parse(JSON.stringify(frameSpec)) as T & {
    slideFrames?: Array<{
      blocks?: Array<{
        visualRequest?: {
          preferredImageId?: string;
          asset?: {
            imageId?: string;
            base64?: unknown;
          };
        };
      }>;
    }>;
  };
  for (const slide of next.slideFrames || []) {
    for (const block of slide.blocks || []) {
      const visual = block.visualRequest;
      const asset = visual?.asset;
      if (!asset || typeof asset.base64 === "string") continue;
      if (!visual.preferredImageId && typeof asset.imageId === "string") {
        visual.preferredImageId = asset.imageId;
      }
      delete visual.asset;
    }
  }
  return next as T;
}
