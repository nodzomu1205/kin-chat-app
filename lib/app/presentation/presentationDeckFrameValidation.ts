import type {
  PresentationTaskDeckFrame,
  PresentationTaskSlideFrame,
  PresentationTaskVisualRequest,
} from "@/types/task";
import { findRepresentativeVisual } from "@/lib/app/presentation/presentationDeckRepresentativeVisual";
import { isBodySlideSummaryReuse } from "@/lib/app/presentation/presentationDeckSummaryReuse";

export function syncDeckFrameSlideCount(
  deckFrame: PresentationTaskDeckFrame | undefined,
  frames: PresentationTaskSlideFrame[]
): PresentationTaskDeckFrame | undefined {
  if (!deckFrame) return deckFrame;
  return normalizeDeckFrameBookends(
    {
      ...deckFrame,
      slideCount: frames.length || deckFrame.slideCount,
    },
    frames
  );
}

function normalizeDeckFrameBookends(
  deckFrame: PresentationTaskDeckFrame,
  frames: PresentationTaskSlideFrame[]
): PresentationTaskDeckFrame {
  const representativeVisual = findRepresentativeVisual(frames);
  const generatedOpeningVisualRequest = buildOpeningCoverVisualRequest(
    deckFrame,
    frames,
    representativeVisual
  );
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
            generatedOpeningVisualRequest,
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

function buildOpeningCoverVisualRequest(
  deckFrame: PresentationTaskDeckFrame,
  frames: PresentationTaskSlideFrame[],
  representativeVisual: PresentationTaskVisualRequest | undefined
): PresentationTaskVisualRequest | undefined {
  if (!representativeVisual) return undefined;
  const opening = deckFrame.openingSlide;
  const title = opening?.title?.trim() || deckOverviewTitle(frames);
  const topic = deckOverviewTopic(frames);
  const coverNeed = [title, topic, "wide cover visual deck overview"]
    .filter(Boolean)
    .join(" ");
  const prompt = [
    `プレゼン全体のテーマ「${title || "全体像"}」を象徴する表紙用ワイドビジュアル。`,
    topic
      ? `本文スライド全体の論点（${topic}）を俯瞰できる、特定の本文スライドをそのまま写さない導入イメージ。`
      : "",
  ]
    .filter(Boolean)
    .join("");
  return {
    type: representativeVisual.type || "photo",
    brief: title ? `${title}の表紙イメージ` : "表紙イメージ",
    prompt,
    labels: ["表紙イメージ"],
    visualSlots: [
      {
        slotId: "openingCover",
        label: "表紙イメージ",
        need: coverNeed,
        keywords: ["cover", "overview", "wide", "presentation"],
        order: 1,
      },
    ],
  };
}

function deckOverviewTitle(frames: PresentationTaskSlideFrame[]) {
  const firstTitle = frames.find((frame) => frame.title?.trim())?.title?.trim();
  return firstTitle || "プレゼン全体像";
}

function deckOverviewTopic(frames: PresentationTaskSlideFrame[]) {
  return frames
    .slice(0, 5)
    .map((frame) => frame.title?.trim())
    .filter((title): title is string => !!title)
    .join(" / ");
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
    title: "全体まとめ",
    message:
      "主要論点を横断して、サプライチェーン全体の構造・課題・対応方向を整理します。",
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
    "まとめ",
    "総括",
    "結論",
    "展望",
    "今後",
    "next",
    "future",
    "summary",
    "recap",
    "conclusion",
    "closing",
  ];
  return summaryTerms.some((term) => text.includes(term));
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
