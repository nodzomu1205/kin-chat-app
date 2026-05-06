import type { ImageGenerationUsage } from "@/lib/server/presentation/imageGeneration";

export type FrameSpecVisualRequestForImageCollection = {
  brief?: string;
  prompt?: string;
  asset?: {
    imageId?: string;
    mimeType?: string;
    base64?: string;
    usage?: ImageGenerationUsage;
  };
};

export type FrameSpecForImageCollection = {
  deckFrame?: {
    openingSlide?: {
      visualRequest?: FrameSpecVisualRequestForImageCollection;
    };
    closingSlide?: {
      visualRequest?: FrameSpecVisualRequestForImageCollection;
    };
  };
  slideFrames: Array<{
    slideNumber?: number;
    title?: string;
    blocks?: Array<{
      id?: string;
      visualRequest?: FrameSpecVisualRequestForImageCollection;
    }>;
  }>;
};

export function collectFrameSpecGeneratedImages(frameSpec: FrameSpecForImageCollection) {
  return [
    ...collectVisualAssetForResponse({
      visual: frameSpec.deckFrame?.openingSlide?.visualRequest,
      slideNumber: 1,
      blockId: "openingSlide",
      fallbackTitle: "Opening slide",
    }),
    ...frameSpec.slideFrames.flatMap((slide) =>
      (slide.blocks || []).flatMap((block) =>
        collectVisualAssetForResponse({
          visual: block.visualRequest,
          slideNumber: slide.slideNumber || 0,
          blockId: block.id || "",
          fallbackTitle: slide.title || "",
        })
      )
    ),
    ...collectVisualAssetForResponse({
      visual: frameSpec.deckFrame?.closingSlide?.visualRequest,
      slideNumber: frameSpec.slideFrames.length + 2,
      blockId: "closingSlide",
      fallbackTitle: "Closing slide",
    }),
  ];
}

function collectVisualAssetForResponse(args: {
  visual?: FrameSpecVisualRequestForImageCollection;
  slideNumber: number;
  blockId: string;
  fallbackTitle: string;
}) {
  const asset = args.visual?.asset;
  if (!asset?.base64) return [];
  return [
    {
      imageId: asset.imageId || "",
      slideNumber: args.slideNumber,
      blockId: args.blockId,
      title: args.visual?.brief || args.fallbackTitle,
      prompt: args.visual?.prompt || "",
      mimeType: asset.mimeType || "image/png",
      contentBase64: asset.base64,
      usage: asset.usage,
    },
  ];
}
