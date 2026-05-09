import { loadGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import { getPresentationImageLibraryCandidates } from "@/lib/app/presentation/presentationImageLibrary";
import { findPresentationPlanByDocumentId } from "@/lib/app/presentation/presentationPlanLibrary";
import { createPresentationBlobUrl } from "@/lib/app/presentation/presentationRenderClient";
import { buildPresentationCommandLink } from "@/lib/app/presentation/presentationTaskPlanning";
import { resolvePresentationVisualSlots } from "@/lib/app/presentation/presentationVisualSelection";
import { visualResolutionSlots } from "@/lib/app/presentation/presentationVisualSelectionCommands";
import { mergeVisualSelectionProposal } from "@/lib/app/presentation/presentationVisualSelectionMerge";
import { requestPresentationVisualSlotNormalizationResult } from "@/lib/app/presentation/presentationVisualNormalization";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { PresentationTaskPlan, PresentationTaskSlideFrame } from "@/types/task";

export async function buildPresentationVisualResolutionMessage(args: {
  documentId?: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.documentId) return "Document ID is required to resolve PPT visuals.";
  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (!foundPlan) {
    return `Presentation plan document not found: ${args.documentId}`;
  }

  const imageCandidates = getPresentationImageLibraryCandidates({
    enabled: args.flowArgs.imageLibraryReferenceEnabled,
    count: args.flowArgs.imageLibraryReferenceCount,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  const shouldResolveUnselectedSlots =
    imageCandidates.length > 0 && hasUnresolvedPresentationVisualSlots(foundPlan.plan);
  const normalizationResult =
    shouldResolveUnselectedSlots
      ? await requestPresentationVisualSlotNormalizationResult(foundPlan.plan)
      : { normalized: {} };
  if (normalizationResult.usage) {
    args.flowArgs.applyTaskUsage?.(normalizationResult.usage);
  }
  const proposedPlan = shouldResolveUnselectedSlots
    ? resolvePresentationVisualSlots({
        plan: foundPlan.plan,
        imageCandidates,
        normalizedSlotTexts: normalizationResult.normalized,
      })
    : foundPlan.plan;
  const lines = [
    "Resolve visual blocks.",
    "",
    `Document ID: ${args.documentId}`,
  ];

  const proposedOpening = proposedPlan.deckFrame?.openingSlide;
  const currentOpening = foundPlan.plan.deckFrame?.openingSlide;
  if (
    proposedOpening?.enabled &&
    proposedOpening.frameId === "visualTitleCover" &&
    proposedOpening.visualRequest
  ) {
    const visual = mergeVisualSelectionProposal(
      currentOpening?.visualRequest,
      proposedOpening.visualRequest
    );
    await appendVisualSlotResolutionLines(lines, {
      address: "Opening slide / visual",
      documentId: args.documentId,
      visual,
    });
  }

  for (const frame of proposedPlan.slideFrames) {
    for (const [index, block] of frame.blocks.entries()) {
      const currentFrame = foundPlan.plan.slideFrames.find(
        (item) => item.slideNumber === frame.slideNumber
      );
      const currentBlock = currentFrame?.blocks[index];
      if (!block.visualRequest) continue;
      const visual = mergeVisualSelectionProposal(
        currentBlock?.visualRequest,
        block.visualRequest
      );
      await appendVisualSlotResolutionLines(lines, {
        address: `Slide ${frame.slideNumber} / block ${index + 1}`,
        documentId: args.documentId,
        visual,
      });
    }
  }

  return lines.join("\n");
}

async function appendVisualSlotResolutionLines(
  lines: string[],
  args: {
    address: string;
    documentId: string;
    visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
  }
) {
  const slots = visualResolutionSlots(args.visual);
  for (const [index, slot] of slots.entries()) {
    const slotNumber = index + 1;
    const address = `${args.address} / slot ${slotNumber}`;
    const match = visualMatchForSlot(args.visual, slot, index);
    lines.push(
      "",
      `${address}:`,
      `Visual prompt: ${slot.need || args.visual.prompt || args.visual.brief}`,
      `Visual display label: ${slot.label || args.visual.labels?.[0] || args.visual.brief || "Unspecified"}`
    );
    const isCurrentSelection =
      match?.status === "selected" && match.score === 1 && match.threshold === 1;
    lines.push(isCurrentSelection ? "現在選択中の画像:" : "自動マッチ画像を選択:");
    const target = match?.imageId
      ? `${match.imageId}${match.imageTitle ? ` (${match.imageTitle})` : ""}`
      : "No candidate";
    lines.push(`- ${target} / score ${match?.score || 0} / threshold ${match?.threshold || 5}`);
    const imagePath = match?.imageId
      ? await createPresentationImagePreviewUrl(match.imageId)
      : "";
    if (imagePath) {
      lines.push(`![${match?.imageId}](${imagePath})`);
    }
    if (match?.imageId) {
      lines.push(
        buildPresentationCommandLink("Use this candidate", [
          "/ppt",
          `Document ID: ${args.documentId}`,
          "Resolve visuals",
          `${address}: ${match.imageId}`,
        ])
      );
    }
    lines.push(
      buildPresentationCommandLink("Choose from library", [
        "/ppt",
        `Document ID: ${args.documentId}`,
        "Resolve visuals",
        `${address}: `,
      ])
    );
  }
}

function visualMatchForSlot(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>,
  slot: ReturnType<typeof visualResolutionSlots>[number],
  slotIndex: number
) {
  const match = (visual.selectionMatches || []).find((item) => item.slotId === slot.slotId);
  if (match) return match;
  const selectedIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  );
  const fallbackImageId = selectedIds[slotIndex] || (slotIndex === 0 ? selectedIds[0] : "");
  if (fallbackImageId) {
    return {
      slotId: slot.slotId,
      label: slot.label || visual.labels?.[slotIndex] || visual.brief || "Visual",
      need: slot.need || visual.prompt || visual.brief || "Visual",
      status: "selected" as const,
      imageId: fallbackImageId,
      score: 1,
      threshold: 1,
    };
  }
  return null;
}

function hasUnresolvedPresentationVisualSlots(plan: PresentationTaskPlan) {
  const openingVisual = plan.deckFrame?.openingSlide?.visualRequest;
  if (openingVisual && !isPresentationVisualFullySelected(openingVisual)) {
    return true;
  }
  for (const frame of plan.slideFrames) {
    for (const block of frame.blocks) {
      if (block.visualRequest && !isPresentationVisualFullySelected(block.visualRequest)) {
        return true;
      }
    }
  }
  return false;
}

function isPresentationVisualFullySelected(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>
) {
  return visualResolutionSlots(visual).every((slot, index) => {
    const match = visualMatchForSlot(visual, slot, index);
    return match?.status === "selected" && !!match.imageId;
  });
}

async function createPresentationImagePreviewUrl(imageId: string) {
  const asset = await loadGeneratedImageAsset(imageId);
  if (!asset?.base64) return "";
  return createPresentationBlobUrl({
    contentBase64: asset.base64,
    mimeType: asset.mimeType,
  }) || "";
}
