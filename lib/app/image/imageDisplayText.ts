import type { GeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import type {
  ImageGenerationOptions,
  ImageGenerationUsage,
} from "@/lib/server/presentation/imageGeneration";
import type { TokenUsage } from "@/hooks/useGptMemory";

export function formatImageOptions(options?: ImageGenerationOptions) {
  if (!options) return "";
  return Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

export function formatImageUsage(usage?: ImageGenerationUsage) {
  if (!usage) return "";
  const parts = [
    usage.total_tokens !== undefined ? `total=${usage.total_tokens}` : "",
    usage.input_tokens !== undefined ? `input=${usage.input_tokens}` : "",
    usage.output_tokens !== undefined ? `output=${usage.output_tokens}` : "",
    usage.input_tokens_details?.text_tokens !== undefined
      ? `text=${usage.input_tokens_details.text_tokens}`
      : "",
    usage.input_tokens_details?.image_tokens !== undefined
      ? `imageInput=${usage.input_tokens_details.image_tokens}`
      : "",
    usage.output_tokens_details?.text_tokens !== undefined
      ? `textOutput=${usage.output_tokens_details.text_tokens}`
      : "",
    usage.output_tokens_details?.image_tokens !== undefined
      ? `imageOutput=${usage.output_tokens_details.image_tokens}`
      : "",
  ].filter(Boolean);
  return parts.join(", ");
}

export function normalizeImageGenerationUsage(
  usage?: ImageGenerationUsage
): TokenUsage | null {
  if (!usage) return null;
  const inputTokens =
    typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
  const outputTokens =
    typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
  const totalTokens =
    typeof usage.total_tokens === "number"
      ? usage.total_tokens
      : inputTokens + outputTokens;
  if (inputTokens === 0 && outputTokens === 0 && totalTokens === 0) return null;
  return { inputTokens, outputTokens, totalTokens };
}

export function formatImageFileSizeKb(bytes?: number) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return "";
  const kb = bytes / 1000;
  const fixed = kb.toFixed(1);
  const [integerPart, decimalPart] = fixed.split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped}.${decimalPart} KB`;
}

export function buildGeneratedImageDisplayText(args: {
  payload: Pick<
    GeneratedImageLibraryPayload,
    | "imageId"
    | "prompt"
    | "originalPrompt"
    | "revisionInstruction"
    | "description"
    | "fileName"
    | "fileSize"
    | "originalMimeType"
    | "widthPx"
    | "heightPx"
    | "aspectRatio"
    | "orientation"
    | "options"
    | "usage"
  >;
  imagePath?: string;
  originalImageId?: string;
  heading?: string;
}) {
  const { payload } = args;
  const optionsText = formatImageOptions(payload.options);
  const usageText = formatImageUsage(payload.usage);
  return [
    args.heading || "",
    args.heading ? "" : "",
    args.originalImageId ? `Original Image ID: ${args.originalImageId}` : "",
    `Image ID: ${payload.imageId}`,
    payload.fileName ? `File: ${payload.fileName}` : "",
    typeof payload.fileSize === "number"
      ? `File size: ${formatImageFileSizeKb(payload.fileSize)}`
      : "",
    payload.widthPx && payload.heightPx
      ? `Dimensions: ${payload.widthPx} x ${payload.heightPx}`
      : "",
    payload.orientation ? `Orientation: ${payload.orientation}` : "",
    typeof payload.aspectRatio === "number"
      ? `Aspect ratio: ${payload.aspectRatio.toFixed(3)}`
      : "",
    payload.originalMimeType ? `Original MIME: ${payload.originalMimeType}` : "",
    args.imagePath ? `![${payload.imageId}](${args.imagePath})` : "",
    args.imagePath ? "" : "",
    optionsText ? `Options: ${optionsText}` : "",
    optionsText ? "" : "",
    usageText ? `Usage: ${usageText}` : "",
    usageText ? "" : "",
    "Prompt:",
    payload.prompt,
    payload.originalPrompt
      ? ["", "Original prompt:", payload.originalPrompt].join("\n")
      : "",
    payload.revisionInstruction
      ? ["", "Revision instruction:", payload.revisionInstruction].join("\n")
      : "",
    payload.description ? ["", "Description:", payload.description].join("\n") : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
