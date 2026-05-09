import { hydratePresentationLibraryImageAssets } from "@/lib/app/presentation/presentationRenderImages";
import { collectFrameSpecPreferredImageIds } from "@/lib/app/presentation/presentationRenderImageIds";
import { renderPresentationPptx } from "@/lib/app/presentation/presentationRenderClient";
import { normalizeImageGenerationUsage } from "@/lib/app/image/imageDisplayText";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { buildFramePresentationSpecFromTaskPlan } from "@/lib/app/presentation/presentationTaskPlanning";

type FramePresentationSpec = NonNullable<
  ReturnType<typeof buildFramePresentationSpecFromTaskPlan>
>;

export async function renderFramePresentationPptx(args: {
  documentId: string;
  frameSpec: FramePresentationSpec;
  flowArgs: SendToGptFlowStepArgs;
}) {
  const selectedImageIds = collectFrameSpecPreferredImageIds(args.frameSpec);
  const shouldHydrateLibraryImages = selectedImageIds.size > 0;
  const output = await renderPresentationPptx({
    documentId: args.documentId,
    frameSpec: args.frameSpec,
    generateImages: shouldHydrateLibraryImages,
    imageMode: selectedImageIds.size > 0 ? "library" : undefined,
    libraryImageAssets: await hydratePresentationLibraryImageAssets({
      flowArgs: args.flowArgs,
      frameSpec: args.frameSpec,
      onlyRequiredImageAssets: true,
    }),
  });
  applyGeneratedImageUsage(output.generatedImages, args.flowArgs.applyImageUsage);
  return output;
}

function applyGeneratedImageUsage(
  generatedImages: Array<{
    usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
  }> | undefined,
  applyImageUsage?: SendToGptFlowStepArgs["applyImageUsage"]
) {
  for (const image of generatedImages || []) {
    const usage = normalizeImageGenerationUsage(image.usage);
    if (usage) applyImageUsage?.(usage);
  }
}
