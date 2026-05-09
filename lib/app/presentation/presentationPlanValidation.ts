import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";
import {
  mergeConsecutiveDuplicateVisualOnlyFrames,
  normalizeFrameTitle,
  resolveVisualImageId,
} from "@/lib/app/presentation/presentationFrameTitleNormalization";

export { syncDeckFrameSlideCount } from "@/lib/app/presentation/presentationDeckFrameValidation";

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
      if (
        primaryVisual.visualRequest?.type === "photo" &&
        primaryText &&
        isDenseTextBlock(primaryText) &&
        !isAdaptiveVisualMainBodyBlock(primaryText) &&
        !isMultiVisualMainRequest(primaryVisual)
      ) {
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
      const annotationBlock =
        normalizeAdaptiveVisualMainAnnotation(textBlocks[0], frame) ||
        buildAdaptiveVisualMainAnnotation(frame);
      const blocks =
        visualBlocks.length >= 6
          ? [...visualBlocks.slice(0, 6), annotationBlock]
          : [...visualBlocks, annotationBlock];
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

function isAdaptiveVisualMainBodyBlock(block: PresentationTaskSlideBlock | undefined) {
  if (!block || block.visualRequest) return false;
  return (
    block.renderStyle?.showHeading === false &&
    !block.heading &&
    !(block.items?.length)
  );
}

function isMultiVisualMainRequest(block: PresentationTaskSlideBlock | undefined) {
  const usagePolicy = block?.visualRequest?.usagePolicy;
  return usagePolicy === "useOneOrMore" || usagePolicy === "useAsGrid";
}

function normalizeAdaptiveVisualMainAnnotation(
  block: PresentationTaskSlideBlock | undefined,
  frame: PresentationTaskSlideFrame
): PresentationTaskSlideBlock | undefined {
  const text = block?.text?.trim();
  if (!text) return undefined;
  if (isWeakAdaptiveVisualMainAnnotation(text, frame.title)) return undefined;
  return buildAdaptiveVisualMainAnnotationBlock({
    id: block?.id || uniqueBlockId(frame.blocks, "annotation"),
    text,
  });
}

function buildAdaptiveVisualMainAnnotation(
  frame: PresentationTaskSlideFrame
): PresentationTaskSlideBlock {
  const text = resolveAdaptiveVisualMainBodyText(frame);
  return buildAdaptiveVisualMainAnnotationBlock({
    id: uniqueBlockId(frame.blocks, "annotation"),
    text,
  });
}

function buildAdaptiveVisualMainAnnotationBlock(args: {
  id: string;
  text: string;
}): PresentationTaskSlideBlock {
  return {
    id: args.id,
    kind: "textStack",
    styleId: "textStackTopLeft",
    text: args.text,
    renderStyle: {
      showHeading: false,
    },
  };
}

function uniqueBlockId(blocks: PresentationTaskSlideBlock[], base: string) {
  const existing = new Set(blocks.map((block) => block.id));
  if (!existing.has(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}_${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

function containsJapanese(value: string) {
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value);
}

function buildAdaptiveVisualMainBodyText(title: string) {
  if (!containsJapanese(title)) {
    return `${stripEnglishTitleEnding(title)} is framed through the visual, with the key message summarized in the remaining space.`;
  }
  const subject = stripJapaneseTitleEnding(title);
  if (/(住みやす|暮らしやす|家族|子育て|エリア|地域|街)/.test(title)) {
    return `${subject}は、交通・買い物などの利便性と落ち着いた住環境のバランスが、日常生活のしやすさにつながります。`;
  }
  return `${subject}について、重要なポイントを視覚情報とあわせて簡潔に整理します。`;
}

function resolveAdaptiveVisualMainBodyText(frame: PresentationTaskSlideFrame) {
  const title = frame.title.trim() || "This slide";
  const visualText = frame.blocks
    .flatMap((block) => {
      const visual = block.visualRequest;
      if (!visual) return [];
      return [
        ...(visual.visualSlots || []).flatMap((slot) => [slot.need, slot.label]),
        visual.prompt,
        visual.brief,
      ];
    })
    .filter((value): value is string => !!value?.trim());
  const source = [frame.speakerIntent, ...visualText]
    .map((value) => normalizeAnnotationCandidate(value || ""))
    .find(
      (value) =>
        value &&
        isSubstantiveAnnotationCandidate(value) &&
        !isWeakAdaptiveVisualMainAnnotation(value, title)
    );
  return source || buildAdaptiveVisualMainBodyText(title);
}

function normalizeAnnotationCandidate(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*・]\s*/, "").trim())
    .find(Boolean) || "";
}

function isWeakAdaptiveVisualMainAnnotation(value: string, title: string) {
  const text = value.trim();
  if (!text) return true;
  const normalized = text.replace(/\s+/g, "");
  const normalizedTitle = title.trim().replace(/\s+/g, "");
  if (normalizedTitle && normalized === normalizedTitle) return true;
  if (/^これは.+(について|に関して)(解説|説明|整理)しています[。.]?$/u.test(normalized)) {
    return true;
  }
  if (/^.+について(重要なポイント|要点)を(視覚情報とあわせて)?簡潔に整理します[。.]?$/u.test(normalized)) {
    return true;
  }
  if (/key message summarized in the remaining space/i.test(text)) return true;
  return false;
}

function isSubstantiveAnnotationCandidate(value: string) {
  const text = value.trim();
  if (containsJapanese(text)) return Array.from(text).length >= 18;
  return text.split(/\s+/).filter(Boolean).length >= 6;
}

function stripJapaneseTitleEnding(value: string) {
  return value
    .trim()
    .replace(/の?(特徴|ポイント|要点|まとめ|概要)$/u, "")
    .replace(/について$/u, "")
    .trim() || value.trim();
}

function stripEnglishTitleEnding(value: string) {
  return value
    .trim()
    .replace(/\b(features?|appeal|points?|summary|overview)\b\.?$/i, "")
    .trim() || value.trim();
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

