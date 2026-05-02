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

  return finalizeFrameNormalization(visualNormalized);
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
  const summary = summarizeFinalFrame(frames[frames.length - 1]);
  const closingSlide =
    deckFrame.closingSlide?.enabled === false
      ? deckFrame.closingSlide
      : {
          enabled: true,
          ...(deckFrame.closingSlide || {}),
          frameId:
            deckFrame.closingSlide?.frameId === "endSlide" && summary
              ? "summaryClosing"
              : deckFrame.closingSlide?.frameId || (summary ? "summaryClosing" : "endSlide"),
          title:
            deckFrame.closingSlide?.title && deckFrame.closingSlide.title !== "- END -"
              ? deckFrame.closingSlide.title
              : summary?.title || deckFrame.closingSlide?.title || "- END -",
          message: deckFrame.closingSlide?.message || summary?.message || "Thank you",
          nextSteps:
            deckFrame.closingSlide?.nextSteps?.length
              ? deckFrame.closingSlide.nextSteps
              : summary?.nextSteps,
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
    title: listBlock.heading || messageBlock?.heading || "まとめ",
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
  return `${leftTitle} / ${rightTitle}`;
}

function compactSingleTitle(value: string) {
  return value
    .replace(/^コットンの/, "")
    .replace(/^サプライチェーンの/, "")
    .replace(/コットンの/g, "")
    .replace(/サプライチェーンの/g, "")
    .replace(/^繧ｳ繝・ヨ繝ｳ縺ｮ/, "")
    .replace(/^繧ｵ繝励Λ繧､繝√ぉ繝ｼ繝ｳ縺ｮ/, "")
    .replace(/繧ｳ繝・ヨ繝ｳ縺ｮ/g, "")
    .replace(/繧ｵ繝励Λ繧､繝√ぉ繝ｼ繝ｳ縺ｮ/g, "")
    .trim();
}

function hasProcessFlow(value: string) {
  return /工程フロー|蟾･遞九ヵ繝ｭ繝ｼ/.test(value);
}

function hasCommerceFlow(value: string) {
  return /情報・商流|諠・ｱ繝ｻ蝠・ｵ・/.test(value);
}

function titleForFlowCombination(processTitle: string) {
  return /蟾･遞九ヵ繝ｭ繝ｼ/.test(processTitle)
    ? "迚ｩ逅・噪蜉蟾･繝ｻ蟾･遞九ヵ繝ｭ繝ｼ縺ｨ諠・ｱ繝ｻ蝠・ｵ・"
    : "物理的加工・工程フローと情報・商流";
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
