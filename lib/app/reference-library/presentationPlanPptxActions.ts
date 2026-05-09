import type { ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";
import { hydratePresentationLibraryImageAssets } from "@/lib/app/presentation/presentationRenderImages";
import { collectFrameSpecPreferredImageIds } from "@/lib/app/presentation/presentationRenderImageIds";
import {
  renderPresentationPptx,
} from "@/lib/app/presentation/presentationRenderClient";
import {
  buildFramePresentationSpecFromTaskPlan,
  buildPresentationSpecFromTaskPlan,
  buildPresentationTaskPlanFromText,
  hasRenderablePresentationTaskPlan,
} from "@/lib/app/presentation/presentationTaskPlanning";
import { isPresentationTaskPlan } from "@/lib/app/presentation/presentationPlanPortable";

type PresentationPptxRenderOutput = Awaited<
  ReturnType<typeof renderPresentationPptx>
>;

export type LibraryPresentationPptxResult =
  | { status: "not_presentation_plan" | "not_renderable" }
  | {
      status: "rendered";
      sourceId: string;
      patch: Partial<
        Pick<StoredDocument, "title" | "text" | "summary" | "structuredPayload">
      >;
      messageText: string;
    };

export function resolvePresentationPlanFromLibraryItem(
  item: ReferenceLibraryItem
) {
  if (item.artifactType !== "presentation_plan") return null;
  const parsedPlan = buildPresentationTaskPlanFromText({
    title: item.title,
    text: item.excerptText,
  });
  const storedPlan = isPresentationTaskPlan(item.structuredPayload)
    ? item.structuredPayload
    : null;
  if (!storedPlan) return parsedPlan;
  if (!parsedPlan.slideFrames.length && !parsedPlan.slides.length) return storedPlan;

  const storedImageCount = countSelectedPresentationImageIds(storedPlan);
  const parsedImageCount = countSelectedPresentationImageIds(parsedPlan);
  if (parsedImageCount > storedImageCount) {
    return {
      ...parsedPlan,
      latestPptx: storedPlan.latestPptx || parsedPlan.latestPptx,
    };
  }

  return storedPlan.slideFrames.length ? storedPlan : parsedPlan;
}

function countSelectedPresentationImageIds(plan: PresentationTaskPlan) {
  const frameSpec = buildFramePresentationSpecFromTaskPlan(plan);
  return collectFrameSpecPreferredImageIds(frameSpec).size;
}

export async function renderLibraryPresentationPlanPptx(args: {
  item: ReferenceLibraryItem;
  libraryItems: ReferenceLibraryItem[];
  renderPptx?: typeof renderPresentationPptx;
  now?: () => string;
}): Promise<LibraryPresentationPptxResult> {
  const plan = resolvePresentationPlanFromLibraryItem(args.item);
  if (!plan) return { status: "not_presentation_plan" };
  if (!hasRenderablePresentationTaskPlan(plan)) {
    return { status: "not_renderable" };
  }

  const frameSpec = buildFramePresentationSpecFromTaskPlan(plan);
  const spec = frameSpec ? null : buildPresentationSpecFromTaskPlan(plan);
  const selectedImageIds = frameSpec
    ? collectFrameSpecPreferredImageIds(frameSpec)
    : new Set<string>();
  const renderPptx = args.renderPptx || renderPresentationPptx;
  const output = await renderPptx({
    documentId: args.item.sourceId.replace(/[^A-Za-z0-9_-]+/g, "_"),
    ...(frameSpec ? { frameSpec } : { spec }),
    generateImages: selectedImageIds.size > 0,
    imageMode: selectedImageIds.size > 0 ? "library" : undefined,
    libraryImageAssets: frameSpec
      ? await hydratePresentationLibraryImageAssets({
          referenceLibraryItems: args.libraryItems,
          imageLibraryReferenceEnabled: selectedImageIds.size > 0,
          imageLibraryReferenceCount: 0,
          frameSpec,
          onlyRequiredImageAssets: true,
        })
      : undefined,
  });

  return buildRenderedPresentationPlanResult({
    item: args.item,
    plan,
    output,
    title: frameSpec?.title || spec?.title || args.item.title,
    slideCount:
      output.slideCount ||
      frameSpec?.slideFrames.length ||
      spec?.slides.length ||
      0,
    now: args.now,
  });
}

function buildRenderedPresentationPlanResult(args: {
  item: ReferenceLibraryItem;
  plan: PresentationTaskPlan;
  output: PresentationPptxRenderOutput;
  title: string;
  slideCount: number;
  now?: () => string;
}): LibraryPresentationPptxResult {
  const filename = args.output.filename || `${args.title}.pptx`;
  const updatedAt = args.now ? args.now() : new Date().toISOString();
  const nextPlan: PresentationTaskPlan = {
    ...args.plan,
    latestPptx: {
      filename,
      path: args.output.path,
      createdAt: args.output.createdAt || updatedAt,
      slideCount: args.output.slideCount || args.slideCount,
    },
    updatedAt,
  };

  return {
    status: "rendered",
    sourceId: args.item.sourceId,
    patch: {
      structuredPayload: nextPlan,
      summary: args.item.summary,
    },
    messageText: [
      "Presentation PPTX created from design plan.",
      "",
      `Title: ${args.title}`,
      `Slides: ${args.slideCount}`,
      args.output.path
        ? `PPTX: [${filename}](${args.output.path})`
        : `File: ${filename}`,
    ].join("\n"),
  };
}
