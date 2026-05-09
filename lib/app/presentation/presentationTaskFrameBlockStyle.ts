import type { PresentationTaskSlideFrame } from "@/types/task";
import { PRESENTATION_BLOCK_STYLES } from "@/lib/app/presentation/presentationSlideFrames";

export function applyBlockStylePreset(
  block: PresentationTaskSlideFrame["blocks"][number]
) {
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

export function applyTitleLineFooterHeadingPolicy(args: {
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
