import { createHash } from "node:crypto";

type VisualRequestWithAsset = {
  type?: string;
  brief?: string;
  prompt?: string;
  promptNote?: string;
  preferredImageId?: string;
  asset?: {
    imageId?: string;
    mimeType: string;
    base64: string;
    alt?: string;
    sourcePromptHash?: string;
    usage?: ImageGenerationUsage;
    widthPx?: number;
    heightPx?: number;
    aspectRatio?: number;
    orientation?: "landscape" | "portrait" | "square" | "unknown";
  };
};

type FrameBlockWithVisual = {
  visualRequest?: VisualRequestWithAsset;
};

type FrameSpecWithVisuals = {
  slideFrames?: Array<{
    blocks?: FrameBlockWithVisual[];
  }>;
};

export type PresentationImageMode = "off" | "library" | "api" | "hybrid";

export type PresentationLibraryImageAsset = {
  imageId: string;
  title?: string;
  fileName?: string;
  mimeType: string;
  base64: string;
  description?: string;
  prompt?: string;
  originalPrompt?: string;
  widthPx?: number;
  heightPx?: number;
  aspectRatio?: number;
  orientation?: "landscape" | "portrait" | "square" | "unknown";
};

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_IMAGE_MODEL = "gpt-image-1";

export type GeneratedImageAsset = {
  imageId: string;
  mimeType: string;
  base64: string;
  prompt: string;
  alt?: string;
  sourcePromptHash: string;
  options?: ImageGenerationOptions;
  usage?: ImageGenerationUsage;
};

export type ImageGenerationUsage = {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: {
    text_tokens?: number;
    image_tokens?: number;
  };
  output_tokens_details?: {
    text_tokens?: number;
    image_tokens?: number;
  };
};

export type ImageGenerationOptions = {
  model?: "gpt-image-1" | "gpt-image-1-mini" | "gpt-image-1.5" | "dall-e-3" | "dall-e-2";
  size?:
    | "auto"
    | "1024x1024"
    | "1536x1024"
    | "1024x1536"
    | "1792x1024"
    | "1024x1792"
    | "512x512"
    | "256x256";
  quality?: "auto" | "low" | "medium" | "high" | "hd" | "standard";
  background?: "auto" | "transparent" | "opaque";
  outputFormat?: "png" | "jpeg" | "webp";
  outputCompression?: number;
  moderation?: "auto" | "low";
  style?: "vivid" | "natural";
};

export async function hydrateFrameSpecVisualAssets<T>(
  frameSpec: T,
  options: { enabled?: boolean } = {}
): Promise<T> {
  if (!options.enabled) return frameSpec;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const next = JSON.parse(JSON.stringify(frameSpec)) as T & FrameSpecWithVisuals;
  for (const slide of next.slideFrames || []) {
    for (const block of slide.blocks || []) {
      const visual = block.visualRequest;
      if (!shouldGenerateVisual(visual)) continue;
      const prompt = buildImagePrompt(visual);
      const sourcePromptHash = hashPrompt(prompt);
      const imageId = `img_${sourcePromptHash}`;
      if (visual.asset?.sourcePromptHash === sourcePromptHash && visual.asset.base64) {
        continue;
      }
      const generated = await generateOpenAIImage({ apiKey, prompt });
      visual.asset = {
        imageId,
        mimeType: generated.mimeType,
        base64: generated.base64,
        alt: visual.brief || "Generated presentation visual",
        sourcePromptHash,
        usage: generated.usage,
      };
    }
  }
  return next as T;
}

export async function resolveFrameSpecVisualAssets<T>(
  frameSpec: T,
  options: {
    mode?: PresentationImageMode;
    libraryImageAssets?: PresentationLibraryImageAsset[];
  } = {}
): Promise<T> {
  const mode = options.mode || "off";
  if (mode === "off") return stripFrameSpecVisualAssets(frameSpec);

  const next = JSON.parse(JSON.stringify(frameSpec)) as T & FrameSpecWithVisuals;
  const usedImageIds = new Set<string>();
  for (const slide of next.slideFrames || []) {
    for (const block of slide.blocks || []) {
      const visual = block.visualRequest;
      if (!shouldGenerateVisual(visual)) continue;
      if (mode === "library" || mode === "hybrid") {
        const matched = findBestLibraryImageAsset({
          visual,
          assets: options.libraryImageAssets || [],
          usedImageIds,
        });
        if (matched) {
          usedImageIds.add(matched.imageId);
          visual.asset = {
            imageId: matched.imageId,
            mimeType: matched.mimeType || "image/png",
            base64: matched.base64,
            alt: matched.description || matched.title || visual.brief,
            sourcePromptHash: matched.imageId,
            widthPx: matched.widthPx,
            heightPx: matched.heightPx,
            aspectRatio: matched.aspectRatio,
            orientation: matched.orientation,
          };
          continue;
        }
      }
      if (mode === "api" || mode === "hybrid") {
        const prompt = buildImagePrompt(visual);
        const sourcePromptHash = hashPrompt(prompt);
        const imageId = `img_${sourcePromptHash}`;
        if (visual.asset?.sourcePromptHash === sourcePromptHash && visual.asset.base64) {
          continue;
        }
        const apiKey = process.env.OPENAI_API_KEY?.trim();
        if (!apiKey) {
          throw new Error("OPENAI_API_KEY is not set.");
        }
        const generated = await generateOpenAIImage({ apiKey, prompt });
        visual.asset = {
          imageId,
          mimeType: generated.mimeType,
          base64: generated.base64,
          alt: visual.brief || "Generated presentation visual",
          sourcePromptHash,
          usage: generated.usage,
        };
      }
    }
  }
  return next as T;
}

export function stripFrameSpecVisualAssets<T>(frameSpec: T): T {
  const next = JSON.parse(JSON.stringify(frameSpec)) as T & FrameSpecWithVisuals;
  for (const slide of next.slideFrames || []) {
    for (const block of slide.blocks || []) {
      if (block.visualRequest?.asset) {
        delete block.visualRequest.asset;
      }
    }
  }
  return next as T;
}

export async function generateImageAsset(args: {
  prompt: string;
  instruction?: string;
  imageIdSeed?: string;
  alt?: string;
  options?: ImageGenerationOptions;
}): Promise<GeneratedImageAsset> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const prompt = buildStandaloneImagePrompt(args.prompt, args.instruction);
  const sourcePromptHash = hashPrompt(
    [args.imageIdSeed || "", prompt].filter(Boolean).join("\n")
  );
  const generated = await generateOpenAIImage({
    apiKey,
    prompt,
    options: args.options,
  });
  return {
    imageId: `img_${sourcePromptHash}`,
    mimeType: generated.mimeType,
    base64: generated.base64,
    prompt,
    alt: args.alt || "Generated image",
    sourcePromptHash,
    options: normalizeImageGenerationOptions(args.options),
    usage: generated.usage,
  };
}

function shouldGenerateVisual(
  visual: VisualRequestWithAsset | undefined
): visual is VisualRequestWithAsset {
  if (!visual?.prompt?.trim() && !visual?.promptNote?.trim() && !visual?.brief?.trim()) return false;
  if (visual.type === "none" || visual.type === "table") return false;
  return true;
}

function findBestLibraryImageAsset(args: {
  visual: VisualRequestWithAsset;
  assets: PresentationLibraryImageAsset[];
  usedImageIds: Set<string>;
}) {
  const preferredImageId = args.visual.preferredImageId?.trim();
  if (preferredImageId && !args.usedImageIds.has(preferredImageId)) {
    const exact = args.assets.find(
      (asset) => asset.base64 && asset.imageId === preferredImageId
    );
    if (exact) return exact;
  }

  const visualText = normalizeMatchText([
    args.visual.brief,
    args.visual.prompt,
    args.visual.promptNote,
    args.visual.type,
    args.visual.preferredImageId,
  ]);
  if (!visualText) return null;
  const scored = args.assets
    .filter((asset) => asset.base64 && !args.usedImageIds.has(asset.imageId))
    .map((asset) => ({
      asset,
      score: scoreLibraryImageMatch(visualText, asset),
    }))
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.asset || null;
}

function scoreLibraryImageMatch(
  visualText: string,
  asset: PresentationLibraryImageAsset
) {
  const assetText = normalizeMatchText([
    asset.title,
    asset.fileName,
    asset.description,
    asset.prompt,
    asset.originalPrompt,
  ]);
  if (!assetText) return 0;
  const visualTerms = new Set(
    visualText.split(/\s+/).filter((term) => term.length >= 2)
  );
  let score = 0;
  for (const term of visualTerms) {
    if (assetText.includes(term)) score += term.length >= 4 ? 2 : 1;
  }
  const visualCjk = cjkCharacters(visualText);
  const assetCjk = cjkCharacters(assetText);
  if (visualCjk.length >= 4 && assetCjk.length >= 4) {
    const assetSet = new Set(assetCjk);
    const overlap = new Set(visualCjk.filter((char) => assetSet.has(char))).size;
    score += Math.floor(overlap / 2);
  }
  return score;
}

function cjkCharacters(value: string) {
  return Array.from(value).filter((char) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char));
}

function normalizeMatchText(parts: Array<string | undefined>) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildImagePrompt(visual: VisualRequestWithAsset) {
  return [
    "Create a clean, business presentation visual.",
    "Use a polished editorial style suitable for a PowerPoint slide.",
    "Keep the entire composition fully inside the image boundaries with generous margins. Do not crop any important object, icon, arrow, or label.",
    "Avoid embedded text whenever possible. If labels are absolutely necessary, use very few large readable labels only.",
    "Do not create dense microtext, pseudo-letters, cramped captions, or small unreadable text.",
    "Design for later placement inside a PowerPoint content frame; keep a clean central composition with breathing room on all sides.",
    visual.brief ? `Visual brief: ${visual.brief}` : "",
    `Prompt: ${visual.prompt || visual.promptNote || visual.brief}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildStandaloneImagePrompt(prompt: string, instruction?: string) {
  return [
    "Create a high-quality image based on the user's request.",
    "Keep the full subject and important details inside the image boundaries with comfortable margins.",
    "Avoid small unreadable text, pseudo-letters, and cramped labels unless the user explicitly requests readable typography.",
    instruction?.trim() ? `Revision instruction: ${instruction.trim()}` : "",
    `User request: ${prompt.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function hashPrompt(prompt: string) {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 24);
}

async function generateOpenAIImage(args: {
  apiKey: string;
  prompt: string;
  options?: ImageGenerationOptions;
}): Promise<{ mimeType: string; base64: string; usage?: ImageGenerationUsage }> {
  const options = normalizeImageGenerationOptions(args.options);
  const requestBody = buildImageRequestBody({
    prompt: args.prompt,
    options,
  });
  const response = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = (await response.json().catch(() => ({}))) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    usage?: ImageGenerationUsage;
    error?: { message?: string } | string;
  };
  if (!response.ok) {
    const error =
      typeof data.error === "string" ? data.error : data.error?.message || response.statusText;
    throw new Error(error || "OpenAI image generation failed.");
  }

  const firstImage = data.data?.[0];
  const base64 = firstImage?.b64_json;
  if (base64) {
    return {
      mimeType: "image/png",
      base64,
      usage: data.usage,
    };
  }
  if (firstImage?.url) {
    return {
      ...(await fetchImageUrlAsBase64(firstImage.url)),
      usage: data.usage,
    };
  }
  throw new Error("OpenAI image generation did not return an image.");
}

function normalizeImageGenerationOptions(
  value?: ImageGenerationOptions
): ImageGenerationOptions {
  const model = value?.model || (process.env.OPENAI_IMAGE_MODEL?.trim() as ImageGenerationOptions["model"]) || DEFAULT_IMAGE_MODEL;
  return {
    ...value,
    model,
    size: value?.size || "auto",
    quality: value?.quality || "auto",
    outputFormat: value?.outputFormat || "png",
  };
}

function buildImageRequestBody(args: {
  prompt: string;
  options: ImageGenerationOptions;
}) {
  const model = args.options.model || DEFAULT_IMAGE_MODEL;
  const body: Record<string, unknown> = {
    model,
    prompt: args.prompt,
  };
  addSupportedImageOption(body, "size", supportedSize(model, args.options.size));
  addSupportedImageOption(body, "quality", supportedQuality(model, args.options.quality));

  if (isGptImageModel(model)) {
    addSupportedImageOption(body, "background", args.options.background);
    addSupportedImageOption(body, "output_format", args.options.outputFormat);
    addSupportedImageOption(body, "output_compression", args.options.outputCompression);
    addSupportedImageOption(body, "moderation", args.options.moderation);
    return body;
  }

  if (model === "dall-e-3") {
    addSupportedImageOption(body, "style", args.options.style);
    body.response_format = "b64_json";
    return body;
  }

  if (model === "dall-e-2") {
    body.response_format = "b64_json";
  }
  return body;
}

function addSupportedImageOption(
  body: Record<string, unknown>,
  key: string,
  value: unknown
) {
  if (value !== undefined && value !== null && value !== "") body[key] = value;
}

function isGptImageModel(model: string) {
  return model === "gpt-image-1" || model === "gpt-image-1-mini" || model === "gpt-image-1.5";
}

function supportedSize(model: string, size?: ImageGenerationOptions["size"]) {
  if (!size) return undefined;
  if (isGptImageModel(model)) {
    return ["auto", "1024x1024", "1536x1024", "1024x1536"].includes(size)
      ? size
      : "auto";
  }
  if (model === "dall-e-3") {
    return ["1024x1024", "1792x1024", "1024x1792"].includes(size)
      ? size
      : "1024x1024";
  }
  if (model === "dall-e-2") {
    return ["256x256", "512x512", "1024x1024"].includes(size)
      ? size
      : "1024x1024";
  }
  return size;
}

function supportedQuality(model: string, quality?: ImageGenerationOptions["quality"]) {
  if (!quality) return undefined;
  if (isGptImageModel(model)) {
    return ["auto", "low", "medium", "high"].includes(quality) ? quality : "auto";
  }
  if (model === "dall-e-3") {
    return quality === "hd" || quality === "standard" ? quality : "standard";
  }
  if (model === "dall-e-2") return "standard";
  return quality;
}

async function fetchImageUrlAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Generated image download failed (${response.status})`);
  }
  const mimeType = response.headers.get("content-type") || "image/png";
  const arrayBuffer = await response.arrayBuffer();
  return {
    mimeType,
    base64: Buffer.from(arrayBuffer).toString("base64"),
  };
}
