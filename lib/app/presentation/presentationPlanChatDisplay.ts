import { loadGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import { formatPresentationTaskPlanText } from "@/lib/app/presentation/presentationTaskPlanning";
import type { PresentationTaskPlan, PresentationTaskSlideFrame } from "@/types/task";

export async function buildPresentationTaskPlanTextWithImagePreviews(
  plan: PresentationTaskPlan
) {
  const text = formatPresentationTaskPlanText(plan);
  const lines: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    lines.push(line);
    if (!isSelectedImageLine(line)) continue;
    const imageIds = extractImageIdsFromSelectedImageLine(line);
    for (const imageId of imageIds) {
      const imagePath = await createPresentationImagePreviewUrl(imageId);
      if (imagePath) lines.push(`![${imageId}](${imagePath})`);
    }
  }
  return lines.join("\n");
}

export function collectSelectedVisualImageIds(
  visual: PresentationTaskSlideFrame["blocks"][number]["visualRequest"] | undefined
) {
  return Array.from(
    new Set([visual?.preferredImageId, ...(visual?.candidateImageIds || [])].filter(Boolean))
  ) as string[];
}

async function createPresentationImagePreviewUrl(imageId: string) {
  const asset = await loadGeneratedImageAsset(imageId);
  if (!asset?.base64 || typeof window === "undefined") return "";
  const binary = window.atob(asset.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(
    new Blob([bytes], {
      type: asset.mimeType || "image/png",
    })
  );
}

function isSelectedImageLine(line: string) {
  return line.includes("選択済み画像:") || line.includes("Image ID:");
}

function extractImageIdsFromSelectedImageLine(line: string) {
  return Array.from(new Set(line.match(/\bimg_[A-Za-z0-9_.:-]+/g) || []));
}
