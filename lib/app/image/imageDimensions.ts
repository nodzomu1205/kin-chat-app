import type { GeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";

export type ImageDimensions = Pick<
  GeneratedImageLibraryPayload,
  "widthPx" | "heightPx" | "aspectRatio" | "orientation"
>;

export async function readImageDimensions(args: {
  base64: string;
  mimeType?: string;
}): Promise<ImageDimensions> {
  if (typeof window === "undefined" || !args.base64) {
    return { orientation: "unknown" };
  }
  const dataUrl = `data:${args.mimeType || "image/png"};base64,${args.base64}`;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const widthPx = image.naturalWidth || image.width || 0;
      const heightPx = image.naturalHeight || image.height || 0;
      if (!widthPx || !heightPx) {
        resolve({ orientation: "unknown" });
        return;
      }
      const aspectRatio = widthPx / heightPx;
      const orientation =
        Math.abs(aspectRatio - 1) < 0.08
          ? "square"
          : aspectRatio > 1
            ? "landscape"
            : "portrait";
      resolve({ widthPx, heightPx, aspectRatio, orientation });
    };
    image.onerror = () => resolve({ orientation: "unknown" });
    image.src = dataUrl;
  });
}
