import type { PresentationRenderLibraryImageAsset } from "@/lib/app/presentation/presentationRenderImages";
import type { PresentationTaskSlideFrame } from "@/types/task";

export type PresentationRenderImageMode = "off" | "library" | "api" | "hybrid";

export async function renderPresentationPptx(args: {
  documentId: string;
  spec?: unknown;
  frameSpec?: unknown;
  generateImages?: boolean;
  imageMode?: PresentationRenderImageMode;
  libraryImageAssets?: PresentationRenderLibraryImageAsset[];
}) {
  const requestBody = JSON.stringify(args);
  const res = await fetch("/api/presentation-render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: requestBody,
  });
  const responseText = await res.text().catch(() => "");
  const data = safeParsePresentationRenderResponse(responseText) as {
    output?: {
      id?: string;
      format?: "pptx";
      filename?: string;
      path?: string;
      contentBase64?: string;
      mimeType?: string;
      createdAt?: string;
      slideCount?: number;
      generatedImages?: Array<{
        imageId?: string;
        title?: string;
        prompt?: string;
        mimeType?: string;
        contentBase64?: string;
        usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
      }>;
      frameSpec?: {
        slideFrames?: PresentationTaskSlideFrame[];
      };
    };
    error?: unknown;
  };

  if (!res.ok || !data.output) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : buildPresentationRenderFailureDetail({
            status: res.status,
            statusText: res.statusText,
            responseText,
          })
    );
  }

  return {
    id: data.output.id || `pptx_${Date.now()}`,
    format: "pptx" as const,
    filename: data.output.filename || `${args.documentId}.pptx`,
    path:
      data.output.path ||
      createPresentationBlobUrl({
        contentBase64: data.output.contentBase64,
        mimeType: data.output.mimeType,
      }) ||
      "",
    createdAt: data.output.createdAt || new Date().toISOString(),
    slideCount: data.output.slideCount || 0,
    generatedImages: (data.output.generatedImages || []).map((image) => ({
      imageId: image.imageId || "",
      title: image.title || "",
      prompt: image.prompt || "",
      path:
        createPresentationBlobUrl({
          contentBase64: image.contentBase64,
          mimeType: image.mimeType,
        }) || "",
      usage: image.usage,
    })),
    frameSpec: data.output.frameSpec,
  };
}

export function createPresentationBlobUrl(args: {
  contentBase64?: string;
  mimeType?: string;
}) {
  if (!args.contentBase64 || typeof window === "undefined") return undefined;

  const binary = window.atob(args.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(
    new Blob([bytes], {
      type:
        args.mimeType ||
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
  );
}

function safeParsePresentationRenderResponse(value: string) {
  if (!value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function buildPresentationRenderFailureDetail(args: {
  status: number;
  statusText: string;
  responseText: string;
}) {
  const preview = args.responseText.trim().slice(0, 260);
  return [
    `Presentation render failed. HTTP ${args.status}${
      args.statusText ? ` ${args.statusText}` : ""
    }.`,
    preview ? `Response preview: ${preview}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
