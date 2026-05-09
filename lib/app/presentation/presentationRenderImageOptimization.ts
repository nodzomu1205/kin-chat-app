import type { PresentationRenderLibraryImageAsset } from "@/lib/app/presentation/presentationRenderImages";

const PPT_RENDER_IMAGE_MAX_BASE64_CHARS = 420_000;
const PPT_RENDER_IMAGE_MAX_EDGE_PX = 1280;

export async function optimizePresentationRenderImageAsset(
  asset: PresentationRenderLibraryImageAsset
): Promise<PresentationRenderLibraryImageAsset> {
  if (
    typeof window === "undefined" ||
    typeof Image === "undefined" ||
    typeof document === "undefined" ||
    asset.base64.length <= PPT_RENDER_IMAGE_MAX_BASE64_CHARS
  ) {
    return asset;
  }

  const image = await loadPresentationRenderImage(asset).catch(() => null);
  if (!image) return asset;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return asset;

  const attempts = [
    { maxEdge: PPT_RENDER_IMAGE_MAX_EDGE_PX, quality: 0.84 },
    { maxEdge: 1120, quality: 0.76 },
    { maxEdge: 960, quality: 0.68 },
    { maxEdge: 820, quality: 0.62 },
  ];
  let best: PresentationRenderLibraryImageAsset | null = null;

  for (const attempt of attempts) {
    const scale = Math.min(1, attempt.maxEdge / Math.max(sourceWidth, sourceHeight));
    const widthPx = Math.max(1, Math.round(sourceWidth * scale));
    const heightPx = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const context = canvas.getContext("2d");
    if (!context) continue;
    context.drawImage(image, 0, 0, widthPx, heightPx);
    const dataUrl = canvas.toDataURL("image/jpeg", attempt.quality);
    const base64 = dataUrl.split(",")[1] || "";
    if (!base64) continue;
    const optimized: PresentationRenderLibraryImageAsset = {
      ...asset,
      mimeType: "image/jpeg",
      base64,
      widthPx,
      heightPx,
      aspectRatio: widthPx / heightPx,
      orientation: resolvePresentationRenderImageOrientation(widthPx, heightPx),
    };
    best = !best || optimized.base64.length < best.base64.length ? optimized : best;
    if (base64.length <= PPT_RENDER_IMAGE_MAX_BASE64_CHARS) return optimized;
  }

  return best && best.base64.length < asset.base64.length ? best : asset;
}

function loadPresentationRenderImage(asset: PresentationRenderLibraryImageAsset) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load presentation render image."));
    image.src = `data:${asset.mimeType || "image/png"};base64,${asset.base64}`;
  });
}

function resolvePresentationRenderImageOrientation(
  widthPx: number,
  heightPx: number
): PresentationRenderLibraryImageAsset["orientation"] {
  const aspectRatio = widthPx / heightPx;
  if (Math.abs(aspectRatio - 1) < 0.08) return "square";
  return aspectRatio > 1 ? "landscape" : "portrait";
}
