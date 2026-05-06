import type {
  PresentationTaskDeckFrame,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualRequest,
} from "@/types/task";

const TITLE_MAX_CHARS = 28;

export function normalizePresentationVisualMainPolicy(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  const dedupedFrames = mergeConsecutiveDuplicateVisualOnlyFrames(frames);
  const primaryVisualIds = new Set(
    dedupedFrames.flatMap((frame) => {
      if (frame.layoutFrameId !== "singleCenter" || frame.blocks.length !== 1) {
        return [];
      }
      const imageId = resolveVisualImageId(frame.blocks[0]);
      return imageId ? [imageId] : [];
    })
  );

  const visualNormalized: PresentationTaskSlideFrame[] =
    primaryVisualIds.size === 0
      ? dedupedFrames
      : dedupedFrames.map((frame) => {
          const repeatedMainVisual = frame.blocks.find((block) => {
            const imageId = resolveVisualImageId(block);
            return imageId ? primaryVisualIds.has(imageId) : false;
          });
          if (!repeatedMainVisual) return frame;
          if (frame.layoutFrameId === "singleCenter" && frame.blocks.length === 1) {
            return frame;
          }
          if (!hasLargeNeighboringText(frame.blocks, repeatedMainVisual)) return frame;

          return {
            ...frame,
            layoutFrameId: "singleCenter",
            blocks: [repeatedMainVisual],
          };
        });

  return finalizeFrameNormalization(applyAdaptiveLayoutPolicy(visualNormalized));
}

export function syncDeckFrameSlideCount(
  deckFrame: PresentationTaskDeckFrame | undefined,
  frames: PresentationTaskSlideFrame[]
): PresentationTaskDeckFrame | undefined {
  if (!deckFrame) return deckFrame;
  return normalizeDeckFrameBookends({
    ...deckFrame,
    slideCount: frames.length || deckFrame.slideCount,
  }, frames);
}

function normalizeDeckFrameBookends(
  deckFrame: PresentationTaskDeckFrame,
  frames: PresentationTaskSlideFrame[]
): PresentationTaskDeckFrame {
  const representativeVisual = findRepresentativeVisual(frames);
  const openingSlide =
    deckFrame.openingSlide?.enabled === false
      ? deckFrame.openingSlide
      : {
          enabled: true,
          ...(deckFrame.openingSlide || {}),
          frameId:
            deckFrame.openingSlide?.frameId === "titleCover" && representativeVisual
              ? "visualTitleCover"
              : deckFrame.openingSlide?.frameId ||
                (representativeVisual ? "visualTitleCover" : "titleCover"),
          visualRequest:
            deckFrame.openingSlide?.visualRequest ||
            cloneVisualRequest(representativeVisual),
        };
  const finalBodyIsSummary = isSummaryLikeFrame(frames[frames.length - 1]);
  const summary = finalBodyIsSummary ? null : summarizeDeckFrames(frames);
  const closingFrameId = finalBodyIsSummary
    ? "endSlide"
    : deckFrame.closingSlide?.frameId === "endSlide" && summary
      ? "summaryClosing"
      : deckFrame.closingSlide?.frameId || (summary ? "summaryClosing" : "endSlide");
  const closingNextSteps = finalBodyIsSummary
    ? undefined
    : deckFrame.closingSlide?.nextSteps?.length
      ? deckFrame.closingSlide.nextSteps
      : summary?.nextSteps;
  const closingSlide =
    deckFrame.closingSlide?.enabled === false
      ? deckFrame.closingSlide
      : {
          enabled: true,
          ...(deckFrame.closingSlide || {}),
          frameId: closingFrameId,
          title:
            deckFrame.closingSlide?.title &&
            deckFrame.closingSlide.title !== "- END -" &&
            !isBodySlideSummaryReuse(deckFrame.closingSlide.title, frames)
              ? deckFrame.closingSlide.title
              : summary?.title || deckFrame.closingSlide?.title || "- END -",
          message:
            deckFrame.closingSlide?.message ||
            (finalBodyIsSummary ? "Thank you" : summary?.message) ||
            "Thank you",
          nextSteps: closingNextSteps,
        };

  return {
    ...deckFrame,
    pageNumber: deckFrame.pageNumber
      ? {
          ...deckFrame.pageNumber,
          scope: deckFrame.pageNumber.scope || "bodyOnly",
        }
      : deckFrame.pageNumber,
    openingSlide,
    closingSlide,
  };
}

function finalizeFrameNormalization(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  return normalizeDenseHeroDetailsFrames(frames).map((frame, index) => ({
    ...frame,
    slideNumber: index + 1,
    title: normalizeFrameTitle(frame.title),
  }));
}

function applyAdaptiveLayoutPolicy(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  return frames.map((frame) => {
    const visualBlocks = frame.blocks.filter((block) => !!block.visualRequest);
    const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
    const primaryVisual = visualBlocks[0];
    const primaryText = textBlocks[0];
    const inferredRole = inferAdaptiveSlideRole(frame);
    const role = frame.slideRole || inferredRole;

    if (role === "visualMain" && primaryVisual) {
      const annotationBlocks = frame.slideRole
        ? textBlocks.filter((block) => !isDenseTextBlock(block))
        : textBlocks;
      const blocks =
        annotationBlocks.length > 0 ? [primaryVisual, annotationBlocks[0]] : [primaryVisual];
      return {
        ...frame,
        slideRole: "visualMain",
        layoutFrameId: "adaptiveVisualMain",
        layoutIntent: {
          ...frame.layoutIntent,
          primaryImageId:
            frame.layoutIntent?.primaryImageId || resolveVisualImageId(primaryVisual),
          textPlacement: frame.layoutIntent?.textPlacement || "right",
          notePolicy:
            frame.layoutIntent?.notePolicy ||
            (blocks.length > 1 ? "shortAnnotation" : "none"),
        },
        blocks,
      };
    }

    if (role === "textMain" && primaryText) {
      return {
        ...frame,
        slideRole: "textMain",
        layoutFrameId: "adaptiveTextMain",
        layoutIntent: {
          ...frame.layoutIntent,
          primaryImageId:
            frame.layoutIntent?.primaryImageId || resolveVisualImageId(primaryVisual),
          visualPlacement:
            frame.layoutIntent?.visualPlacement ||
            (visualBlocks.length > 1 ? "rightGrid" : "right"),
        },
        blocks: [primaryText, ...visualBlocks].slice(0, 7),
      };
    }

    return frame;
  });
}

function inferAdaptiveSlideRole(
  frame: PresentationTaskSlideFrame
): PresentationTaskSlideFrame["slideRole"] {
  if (frame.layoutFrameId === "adaptiveVisualMain") return "visualMain";
  if (frame.layoutFrameId === "adaptiveTextMain") return "textMain";
  if (frame.layoutFrameId === "visualLeftTextRight") {
    const visualBlock = frame.blocks[0];
    if (!visualBlock?.visualRequest) return undefined;
    return isVisualMainCandidateBlock(visualBlock) ? "visualMain" : "textMain";
  }
  if (frame.layoutFrameId === "textLeftVisualRight") {
    return frame.blocks.some((block) => !!block.visualRequest) ? "textMain" : undefined;
  }
  if (frame.layoutFrameId === "leftRight50") {
    if (frame.blocks[0]?.visualRequest && !frame.blocks[1]?.visualRequest) {
      return isVisualMainCandidateBlock(frame.blocks[0]) ? "visualMain" : "textMain";
    }
    if (!frame.blocks[0]?.visualRequest && frame.blocks[1]?.visualRequest) {
      return "textMain";
    }
  }
  return undefined;
}

function isVisualMainCandidateBlock(block: PresentationTaskSlideBlock | undefined) {
  const visual = block?.visualRequest;
  if (!visual) return false;
  return (
    visual.type === "diagram" ||
    visual.type === "chart" ||
    visual.type === "table" ||
    visual.type === "map" ||
    visual.type === "iconSet"
  );
}

function normalizeDenseHeroDetailsFrames(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  return frames.map((frame) => {
    if (frame.layoutFrameId !== "heroTopDetailsBottom" || frame.blocks.length < 3) {
      return frame;
    }
    const [heroBlock, firstDetail, secondDetail] = frame.blocks;
    if (
      heroBlock.styleId !== "headlineCenter" ||
      (!isDenseTextBlock(firstDetail) && !isDenseTextBlock(secondDetail))
    ) {
      return frame;
    }

    const title = blockText(heroBlock) || frame.title;
    const speakerIntent = [frame.speakerIntent, blockText(heroBlock)]
      .filter(Boolean)
      .join("\n");

    return {
      ...frame,
      title,
      layoutFrameId: "leftRight50",
      speakerIntent: speakerIntent || frame.speakerIntent,
      blocks: [firstDetail, secondDetail],
    };
  });
}

function findRepresentativeVisual(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskVisualRequest | undefined {
  const candidateFrames = frames.slice(0, Math.min(frames.length, 2));
  for (const frame of candidateFrames) {
    const visualBlock = frame.blocks.find((block) => {
      const visual = block.visualRequest;
      if (!visual) return false;
      return !!(
        visual.asset?.base64 ||
        visual.preferredImageId?.trim() ||
        visual.brief?.trim() ||
        visual.prompt?.trim()
      );
    });
    if (visualBlock?.visualRequest) return visualBlock.visualRequest;
  }
  return undefined;
}

function cloneVisualRequest(
  visual: PresentationTaskVisualRequest | undefined
): PresentationTaskVisualRequest | undefined {
  if (!visual) return undefined;
  return JSON.parse(JSON.stringify(visual)) as PresentationTaskVisualRequest;
}

function summarizeDeckFrames(frames: PresentationTaskSlideFrame[]) {
  if (frames.length === 0) return null;
  const keyFrames = frames.slice(0, 6);
  const items = keyFrames
    .map((frame) => {
      const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
      const primary = textBlocks[0];
      const firstItem = primary?.items?.[0];
      const text = primary?.text;
      const detail = firstItem || text || frame.speakerIntent || "";
      return [frame.title, detail].filter(Boolean).join(": ");
    })
    .filter(Boolean)
    .slice(0, 4);
  if (items.length < 2) return summarizeFinalFrame(frames[frames.length - 1]);
  return {
    title: "\u5168\u4f53\u307e\u3068\u3081",
    message:
      "\u4e3b\u8981\u8ad6\u70b9\u3092\u6a2a\u65ad\u3057\u3066\u3001\u30b5\u30d7\u30e9\u30a4\u30c1\u30a7\u30fc\u30f3\u5168\u4f53\u306e\u69cb\u9020\u30fb\u8ab2\u984c\u30fb\u5bfe\u5fdc\u65b9\u5411\u3092\u6574\u7406\u3057\u307e\u3059\u3002",
    nextSteps: items,
  };
}

function isSummaryLikeFrame(frame: PresentationTaskSlideFrame | undefined) {
  if (!frame) return false;
  const text = [
    frame.title,
    frame.speakerIntent,
    ...frame.blocks.flatMap((block) => [
      block.heading,
      block.text,
      ...(block.items || []),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const summaryTerms = [
    "\u307e\u3068\u3081",
    "\u7dcf\u62ec",
    "\u7d50\u8ad6",
    "\u5c55\u671b",
    "\u4eca\u5f8c",
    "next",
    "future",
    "summary",
    "recap",
    "conclusion",
    "closing",
  ];
  return summaryTerms.some((term) => text.includes(term));
}
function isBodySlideSummaryReuse(title: string | undefined, frames: PresentationTaskSlideFrame[]) {
  const normalizedTitle = title?.trim();
  if (!normalizedTitle) return false;
  return frames.some((frame) => {
    const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
    return (
      frame.title.trim() === normalizedTitle ||
      textBlocks.some((block) => block.heading?.trim() === normalizedTitle)
    );
  });
}

function summarizeFinalFrame(frame: PresentationTaskSlideFrame | undefined) {
  if (!frame) return null;
  const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
  const listBlock = [...textBlocks]
    .reverse()
    .find((block) => (block.items?.length || 0) >= 3);
  const messageBlock = textBlocks.find((block) => block.text && block.text.length >= 80);
  const looksLikeClosingSummary =
    textBlocks.length >= 2 ||
    !!listBlock ||
    /summary|future|next|closing/i.test(frame.title);
  if (!looksLikeClosingSummary || !listBlock?.items?.length) return null;
  return {
    title: listBlock.heading || messageBlock?.heading || "Summary",
    message: messageBlock?.text,
    nextSteps: listBlock.items.slice(0, 4),
  };
}

function mergeConsecutiveDuplicateVisualOnlyFrames(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  const merged: PresentationTaskSlideFrame[] = [];

  frames.forEach((frame) => {
    const previous = merged[merged.length - 1];
    if (isSameVisualOnlyFrame(previous, frame)) {
      merged[merged.length - 1] = mergeVisualOnlyFrameTitles(previous, frame);
      return;
    }
    merged.push(frame);
  });

  return merged.map((frame, index) => ({
    ...frame,
    slideNumber: index + 1,
  }));
}

function isSameVisualOnlyFrame(
  left: PresentationTaskSlideFrame | undefined,
  right: PresentationTaskSlideFrame
) {
  if (!left) return false;
  if (left.layoutFrameId !== "singleCenter" || right.layoutFrameId !== "singleCenter") {
    return false;
  }
  if (left.blocks.length !== 1 || right.blocks.length !== 1) return false;
  const leftImageId = resolveVisualImageId(left.blocks[0]);
  const rightImageId = resolveVisualImageId(right.blocks[0]);
  return !!leftImageId && leftImageId === rightImageId;
}

function mergeVisualOnlyFrameTitles(
  left: PresentationTaskSlideFrame,
  right: PresentationTaskSlideFrame
): PresentationTaskSlideFrame {
  const title = mergeFrameTitles(left.title, right.title);
  const speakerIntent = [left.speakerIntent, right.speakerIntent]
    .filter(Boolean)
    .join("\n");
  return {
    ...left,
    title,
    speakerIntent: speakerIntent || left.speakerIntent,
  };
}

function mergeFrameTitles(left: string, right: string): string {
  if (left === right || left.includes(right)) return normalizeFrameTitle(left);
  if (right.includes(left)) return normalizeFrameTitle(right);
  const compact = compactMergedTitle(left, right);
  if (compact.length <= TITLE_MAX_CHARS) return compact;
  const joined = `${left} / ${right}`;
  if (joined.length <= TITLE_MAX_CHARS) return joined;
  return truncateTitle(compact);
}

function normalizeFrameTitle(title: string): string {
  const value = title.trim();
  if (!value) return value;
  const parts = value
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(1).reduce((merged, part) => mergeFrameTitles(merged, part), parts[0]);
  }
  if (value.length <= TITLE_MAX_CHARS) return value;
  return truncateTitle(compactSingleTitle(value));
}

function compactMergedTitle(left: string, right: string) {
  const leftTitle = compactSingleTitle(left);
  const rightTitle = compactSingleTitle(right);
  if (hasProcessFlow(leftTitle) && hasCommerceFlow(rightTitle)) {
    return titleForFlowCombination(leftTitle);
  }
  if (hasCommerceFlow(leftTitle) && hasProcessFlow(rightTitle)) {
    return titleForFlowCombination(rightTitle);
  }
  return `${leftTitle} ${rightTitle}`;
}

function compactSingleTitle(value: string) {
  return value
    .replace(/^(?:slide|スライド)\s*\d+\s*[:：.-]?\s*/iu, "")
    .replace(/^(?:body|本体)\s*slide\s*\d+\s*[:：.-]?\s*/iu, "")
    .trim();
}

function hasProcessFlow(value: string) {
  return /工程|製造|加工|process|production|manufacturing/i.test(value);
}

function hasCommerceFlow(value: string) {
  return /商流|販売|流通|commerce|sales|retail|distribution/i.test(value);
}

function titleForFlowCombination(processTitle: string) {
  return /return|回収|返品|循環/i.test(processTitle)
    ? "Return exchange and commerce flow"
    : "Physical process and commerce flow";
}

function truncateTitle(value: string) {
  return value.length <= TITLE_MAX_CHARS
    ? value
    : `${value.slice(0, TITLE_MAX_CHARS - 3)}...`;
}

function hasLargeNeighboringText(
  blocks: PresentationTaskSlideBlock[],
  visualBlock: PresentationTaskSlideBlock
) {
  return blocks.some((block) => {
    if (block === visualBlock || block.visualRequest) return false;
    return isDenseTextBlock(block);
  });
}

function isDenseTextBlock(block: PresentationTaskSlideBlock | undefined) {
  if (!block || block.visualRequest) return false;
  const textLength = [block.heading, block.text, ...(block.items || [])]
    .filter(Boolean)
    .join("")
    .length;
  return textLength >= 80 || (block.items?.length || 0) >= 4;
}

function blockText(block: PresentationTaskSlideBlock | undefined) {
  return [block?.heading, block?.text].filter(Boolean).join(" ").trim();
}

function resolveVisualImageId(block: PresentationTaskSlideBlock | undefined) {
  return (
    block?.visualRequest?.preferredImageId?.trim() ||
    block?.visualRequest?.asset?.imageId?.trim() ||
    ""
  );
}

