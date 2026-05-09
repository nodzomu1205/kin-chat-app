import type {
  PresentationTaskPlan,
  PresentationTaskBookendSlide,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualMatch,
  PresentationTaskVisualRequest,
  PresentationTaskVisualSlot,
} from "@/types/task";
import type { PresentationImageLibraryCandidate } from "@/lib/app/presentation/presentationImageLibrary";
import {
  buildSelectionMatch,
  candidateLabel,
  findBestCandidateForSlot,
  MIN_SLOT_MATCH_SCORE,
  tokenize,
} from "@/lib/app/presentation/presentationVisualSelectionScoring";
import type {
  CandidateScore,
  PresentationVisualSlotNormalizedTextMap,
} from "@/lib/app/presentation/presentationVisualSelectionScoring";
import {
  hasSelectedVisualImageIds,
  hasUserConfirmedVisualSelection,
  normalizeSlots,
} from "@/lib/app/presentation/presentationVisualSelectionState";

export {
  presentationVisualSlotMatchKey,
} from "@/lib/app/presentation/presentationVisualSelectionScoring";
export type {
  PresentationVisualSlotNormalizedTextMap,
} from "@/lib/app/presentation/presentationVisualSelectionScoring";

export function resolvePresentationVisualSlots(args: {
  plan: PresentationTaskPlan;
  imageCandidates: PresentationImageLibraryCandidate[];
  normalizedSlotTexts?: PresentationVisualSlotNormalizedTextMap;
}): PresentationTaskPlan {
  const candidates = args.imageCandidates.filter((candidate) => candidate.imageId.trim());
  if (candidates.length === 0 || args.plan.slideFrames.length === 0) return args.plan;

  return {
    ...args.plan,
    deckFrame: args.plan.deckFrame
      ? {
          ...args.plan.deckFrame,
          openingSlide: resolveOpeningSlideVisualSlots(
            args.plan.deckFrame.openingSlide,
            candidates,
            args.normalizedSlotTexts
          ),
        }
      : args.plan.deckFrame,
    slideFrames: args.plan.slideFrames.map((frame) =>
      resolveFrameVisualSlots(frame, candidates, args.normalizedSlotTexts)
    ),
  };
}

function resolveOpeningSlideVisualSlots(
  openingSlide: PresentationTaskBookendSlide | undefined,
  candidates: PresentationImageLibraryCandidate[],
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  if (
    !openingSlide?.enabled ||
    openingSlide.frameId !== "visualTitleCover" ||
    !openingSlide.visualRequest
  ) {
    return openingSlide;
  }
  const coverBlock: PresentationTaskSlideBlock = {
    id: "openingVisual",
    kind: "visual",
    styleId: "visualCover",
    visualRequest: openingSlide.visualRequest,
  };
  const coverFrame: PresentationTaskSlideFrame = {
    slideNumber: 0,
    title: openingSlide.title || "Opening slide",
    masterFrameId: "fullBleedVisual",
    layoutFrameId: "adaptiveVisualMain",
    slideRole: "visualMain",
    blocks: [
      coverBlock,
      {
        id: "openingTitle",
        kind: "textStack",
        styleId: "textStackTopLeft",
        heading: openingSlide.title,
        text: [openingSlide.subtitle, openingSlide.message].filter(Boolean).join(" "),
      },
    ],
  };
  return {
    ...openingSlide,
    visualRequest: resolveVisualRequestSlots(
      coverBlock,
      coverFrame,
      candidates,
      normalizedSlotTexts,
      { preserveExistingImageIds: true }
    ),
  };
}

function resolveFrameVisualSlots(
  frame: PresentationTaskSlideFrame,
  candidates: PresentationImageLibraryCandidate[],
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
): PresentationTaskSlideFrame {
  const blocks = frame.blocks.map((block) =>
    block.visualRequest
      ? {
          ...block,
          visualRequest: resolveVisualRequestSlots(
            block,
            frame,
            candidates,
            normalizedSlotTexts
          ),
        }
      : block
  );
  const primaryImageId =
    blocks.find((block) => block.visualRequest?.preferredImageId)?.visualRequest
      ?.preferredImageId || undefined;
  return {
    ...frame,
    layoutIntent: {
      ...frame.layoutIntent,
      primaryImageId,
    },
    blocks,
  };
}

function resolveVisualRequestSlots(
  block: PresentationTaskSlideBlock,
  frame: PresentationTaskSlideFrame,
  candidates: PresentationImageLibraryCandidate[],
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined,
  options: { preserveExistingImageIds?: boolean } = {}
): PresentationTaskVisualRequest {
  const visual = block.visualRequest as PresentationTaskVisualRequest;
  if (
    hasUserConfirmedVisualSelection(visual) ||
    (options.preserveExistingImageIds && hasSelectedVisualImageIds(visual))
  ) {
    return visual;
  }
  const slots = normalizeSlots(visual.visualSlots);
  const effectiveSlots =
    slots.length > 0 ? slots : deriveVisualSlotsFromFrame(block, frame);
  const visualBase = {
    ...visual,
    visualSlots: effectiveSlots.length > 0 ? effectiveSlots : visual.visualSlots,
    preferredImageId: undefined,
    candidateImageIds: undefined,
    labels: undefined,
  };
  if (effectiveSlots.length === 0) return visualBase;

  const selected: Array<{ slot: PresentationTaskVisualSlot; match: CandidateScore }> = [];
  const selectionMatches: PresentationTaskVisualMatch[] = [];
  const usedImageIds = new Set<string>();
  for (const slot of effectiveSlots) {
    const bestOverall = findBestCandidateForSlot(
      slot,
      candidates,
      normalizedSlotTexts,
      undefined,
      0
    );
    const match =
      findBestCandidateForSlot(
        slot,
        candidates,
        normalizedSlotTexts,
        usedImageIds,
        MIN_SLOT_MATCH_SCORE
      ) ||
      findBestCandidateForSlot(
        slot,
        candidates,
        normalizedSlotTexts,
        undefined,
        MIN_SLOT_MATCH_SCORE
      );
    if (match) {
      selected.push({ slot, match });
      usedImageIds.add(match.candidate.imageId);
      selectionMatches.push(buildSelectionMatch(slot, match, "selected"));
    } else {
      selectionMatches.push(buildSelectionMatch(slot, bestOverall, "unresolved"));
    }
  }
  if (selected.length === 0) {
    return {
      ...visualBase,
      selectionMatches,
      promptNote: visual.promptNote || "No matching image-library asset selected for visualSlots.",
    };
  }

  const selectedIds = selected.map((item) => item.match.candidate.imageId);
  return {
    ...visualBase,
    preferredImageId: selectedIds[0],
    candidateImageIds: selectedIds,
    usagePolicy: selectedIds.length > 1 ? "useOneOrMore" : "useOneBest",
    maxVisualItems: selectedIds.length,
    labels: selected.map((item) => item.slot.label || candidateLabel(item.match.candidate)),
    selectionMatches,
    renderStyle: {
      ...visual.renderStyle,
      showBrief: true,
    },
  };
}

function deriveVisualSlotsFromFrame(
  block: PresentationTaskSlideBlock,
  frame: PresentationTaskSlideFrame
): PresentationTaskVisualSlot[] {
  const visual = block.visualRequest;
  if (!visual) return [];
  const visualSegments = splitVisualNeedSegments([visual.brief, visual.prompt].filter(Boolean).join(" "));
  const textItems = frame.blocks
    .filter((item) => item !== block && !item.visualRequest)
    .flatMap((item) => [item.heading, item.text, ...(item.items || [])])
    .filter((item): item is string => !!item?.trim());
  const itemLabels = frame.blocks
    .filter((item) => item !== block && !item.visualRequest)
    .flatMap((item) => item.items || [])
    .map(extractItemLabel)
    .filter(Boolean);
  const sourceCount = Math.max(visualSegments.length, itemLabels.length);
  const count = Math.min(3, sourceCount);
  if (count <= 1) return [];

  return Array.from({ length: count }, (_, index) => {
    const label = itemLabels[index] || shortSlotLabel(visualSegments[index]) || `Visual ${index + 1}`;
    const need = [
      label,
      textItems[index],
      visualSegments[index],
    ]
      .filter(Boolean)
      .join(" ");
    return {
      slotId: `derived${index + 1}`,
      label,
      need,
      keywords: tokenize(need).slice(0, 8),
      order: index + 1,
    };
  });
}
function splitVisualNeedSegments(value: string) {
  return value
    .replace(/^photos?\s+(depicting|showing)\s+/i, "")
    .replace(/^photo collage\s+(depicting|showing)\s+/i, "")
    .split(/\s*(?:,|、|;|；|・|\band\b)\s*/iu)
    .map((item) => item.replace(/^(and|or)\s+/i, "").trim())
    .filter((item) => item.length >= 3 && !/^(photo|photos|diagram|image|visual)$/i.test(item));
}

function extractItemLabel(value: string) {
  return value.split(/[：:]/)[0]?.trim().slice(0, 18) || "";
}

function shortSlotLabel(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/\b(photo|photos|depicting|showing|industrial|inside|with)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
}

