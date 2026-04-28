import type { PresentationSpec } from "./schema.js";
import { renderPresentationToFile } from "./renderer.js";

export type RenderRequest = {
  spec: PresentationSpec;
  output: {
    format: "pptx";
    path: string;
  };
};

export type RenderResult = {
  title: string;
  slideCount: number;
  theme: string;
  format: "pptx";
  outputPath: string;
  mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  createdAt: string;
};

export async function renderPresentationRequest(
  request: RenderRequest
): Promise<RenderResult> {
  await renderPresentationToFile(request.spec, request.output.path);

  return {
    title: request.spec.title,
    slideCount: request.spec.slides.length,
    theme: request.spec.theme || "business-clean",
    format: request.output.format,
    outputPath: request.output.path,
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    createdAt: new Date().toISOString(),
  };
}
