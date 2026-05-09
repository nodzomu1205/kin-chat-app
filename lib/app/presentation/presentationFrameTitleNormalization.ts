import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";

const TITLE_MAX_CHARS = 28;

export function mergeConsecutiveDuplicateVisualOnlyFrames(
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

export function normalizeFrameTitle(title: string): string {
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

export function resolveVisualImageId(block: PresentationTaskSlideBlock | undefined) {
  return (
    block?.visualRequest?.preferredImageId?.trim() ||
    block?.visualRequest?.asset?.imageId?.trim() ||
    ""
  );
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
