import type { PresentationTaskPlan, PresentationTaskSlideFrame } from "@/types/task";
import { PRESENTATION_BLOCK_STYLES } from "@/lib/app/presentation/presentationSlideFrames";
import {
  hasRenderablePresentationSlideFrames,
  sanitizeReadableSlideFrameTitle,
  sanitizeSlideFrameTitle,
} from "@/lib/app/presentation/presentationSlideFrames";
import {
  normalizePresentationVisualMainPolicy,
  syncDeckFrameSlideCount,
} from "@/lib/app/presentation/presentationPlanValidation";

export function buildFramePresentationSpecFromTaskPlan(plan: PresentationTaskPlan) {
  if (!hasRenderablePresentationSlideFrames(plan.slideFrames)) {
    return null;
  }
  const slideFrames = normalizePresentationVisualMainPolicy(plan.slideFrames).map((frame) => {
    const expandedFrame = expandMultiVisualCandidateFrame(frame);
    const title = sanitizeReadableSlideFrameTitle(
      sanitizeSlideFrameTitle(expandedFrame.title)
    );
    const effectiveMasterFrameId =
      expandedFrame.masterFrameId ||
      plan.deckFrame?.masterFrameId ||
      "titleLineFooter";
    return {
      ...expandedFrame,
      title,
      blocks: expandedFrame.blocks.map((block) =>
        applyTitleLineFooterHeadingPolicy({
          block: applyBlockStylePreset(block),
          slideTitle: title,
          masterFrameId: effectiveMasterFrameId,
        })
      ),
    };
  });
  const deckFrame = syncDeckFrameSlideCount(plan.deckFrame, slideFrames);
  return {
    version: "0.1-frame" as const,
    title: plan.title || "Presentation",
    language: "ja" as const,
    theme: "business-clean" as const,
    density: "standard" as const,
    deckFrame,
    slideFrames,
  };
}

function expandMultiVisualCandidateFrame(
  frame: PresentationTaskSlideFrame
): PresentationTaskSlideFrame {
  const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
  const visualBlocks = frame.blocks.filter((block) => !!block.visualRequest);
  if (visualBlocks.length === 0) return frame;
  const expandedVisuals = visualBlocks.flatMap((block) => expandVisualCandidateBlock(block));
  if (frame.layoutFrameId === "adaptiveVisualMain") {
    return {
      ...frame,
      blocks: [...expandedVisuals, ...textBlocks.slice(0, 1)].slice(0, 7),
    };
  }
  if (frame.layoutFrameId !== "adaptiveTextMain") return frame;
  return {
    ...frame,
    blocks: [...textBlocks.slice(0, 1), ...expandedVisuals].slice(0, 7),
  };
}

function expandVisualCandidateBlock(
  block: PresentationTaskSlideFrame["blocks"][number]
): PresentationTaskSlideFrame["blocks"] {
  const visual = block.visualRequest;
  if (!visual) return [block];
  const wantsMultiple =
    visual.usagePolicy === "useOneOrMore" || visual.usagePolicy === "useAsGrid";
  const defaultMaxVisualItems = wantsMultiple
    ? Math.max(1, visual.candidateImageIds?.length || visual.selectionMatches?.filter((match) => match.status === "selected").length || 3)
    : 1;
  const maxVisualItems = Math.max(
    1,
    Math.min(6, visual.maxVisualItems || defaultMaxVisualItems)
  );
  const imageIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  ).slice(0, maxVisualItems) as string[];
  const matchLabelsByImageId = new Map(
    (visual.selectionMatches || [])
      .filter((match) => match.status === "selected" && match.imageId)
      .map((match) => [match.imageId as string, match.label])
  );
  const labels =
    visual.labels && visual.labels.length === imageIds.length
      ? visual.labels
      : imageIds.map((imageId) => matchLabelsByImageId.get(imageId) || "").filter(Boolean)
          .length === imageIds.length
      ? imageIds.map((imageId) => matchLabelsByImageId.get(imageId) || "")
      : undefined;
  if (visual.usagePolicy === "useOneBest" || maxVisualItems <= 1 || imageIds.length <= 1) {
    const label = imageIds[0] ? labels?.[0] || matchLabelsByImageId.get(imageIds[0]) : undefined;
    return [
      {
        ...block,
        visualRequest: {
          ...visual,
          brief: label || visual.brief,
          renderStyle: {
            ...visual.renderStyle,
            showBrief: label ? visual.renderStyle?.showBrief : false,
          },
        },
      },
    ];
  }
  return imageIds.map((imageId, index) => ({
    ...block,
    id: index === 0 ? block.id : `${block.id}_${index + 1}`,
    visualRequest: {
      ...visual,
      brief: labels?.[index] || visual.brief,
      preferredImageId: imageId,
      candidateImageIds: imageIds,
      renderStyle: {
        ...visual.renderStyle,
        showBrief: labels?.[index] ? visual.renderStyle?.showBrief : false,
      },
    },
  }));
}

function applyBlockStylePreset(block: PresentationTaskSlideFrame["blocks"][number]) {
  const preset = PRESENTATION_BLOCK_STYLES.find(
    (style) => style.id === block.styleId
  )?.textStyle;
  if (!preset) return block;
  return {
    ...block,
    renderStyle: {
      ...block.renderStyle,
      textStyle: {
        ...preset,
        ...(block.renderStyle?.textStyle || {}),
      },
    },
  };
}

function applyTitleLineFooterHeadingPolicy(args: {
  block: PresentationTaskSlideFrame["blocks"][number];
  slideTitle: string;
  masterFrameId?: string;
}) {
  if (args.masterFrameId !== "titleLineFooter") return args.block;
  if (!args.block.heading || args.block.visualRequest) return args.block;
  if (!isRedundantSlideHeading(args.slideTitle, args.block.heading)) {
    return args.block;
  }
  return {
    ...args.block,
    renderStyle: {
      ...args.block.renderStyle,
      showHeading: false,
    },
  };
}

function normalizeComparableText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function textBigrams(value: string) {
  const chars = Array.from(value);
  if (chars.length <= 1) return chars;
  const bigrams: string[] = [];
  for (let index = 0; index < chars.length - 1; index += 1) {
    bigrams.push(`${chars[index]}${chars[index + 1]}`);
  }
  return bigrams;
}

function isRedundantSlideHeading(slideTitle: string, heading: string) {
  const title = normalizeComparableText(slideTitle);
  const normalizedHeading = normalizeComparableText(heading);
  if (!title || !normalizedHeading) return false;
  if (title === normalizedHeading) return true;
  if (
    Math.min(title.length, normalizedHeading.length) >= 6 &&
    (title.includes(normalizedHeading) || normalizedHeading.includes(title))
  ) {
    return true;
  }

  const titleBigrams = new Set(textBigrams(title));
  const headingBigrams = textBigrams(normalizedHeading);
  if (titleBigrams.size === 0 || headingBigrams.length === 0) return false;
  const overlap = headingBigrams.filter((bigram) => titleBigrams.has(bigram))
    .length;
  return overlap / Math.min(titleBigrams.size, headingBigrams.length) >= 0.68;
}
