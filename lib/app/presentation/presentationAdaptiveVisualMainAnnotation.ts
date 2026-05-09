import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";

export function isAdaptiveVisualMainBodyBlock(
  block: PresentationTaskSlideBlock | undefined
) {
  if (!block || block.visualRequest) return false;
  return (
    block.renderStyle?.showHeading === false &&
    !block.heading &&
    !(block.items?.length)
  );
}

export function isMultiVisualMainRequest(
  block: PresentationTaskSlideBlock | undefined
) {
  const usagePolicy = block?.visualRequest?.usagePolicy;
  return usagePolicy === "useOneOrMore" || usagePolicy === "useAsGrid";
}

export function normalizeAdaptiveVisualMainAnnotation(
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

export function buildAdaptiveVisualMainAnnotation(
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
