import type {
  PresentationTaskDeckFrame,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";

export function formatPresentationSlideFramePlanLines(
  frames: PresentationTaskSlideFrame[],
  deckFrame?: PresentationTaskDeckFrame
) {
  const lines: string[] = [];
  if (deckFrame) {
    lines.push("全体設定");
    lines.push(`- 想定ページ数: ${deckFrame.slideCount || frames.length}枚`);
    lines.push(`- 共通マスター: ${deckFrame.masterFrameId}`);
    lines.push(`- 背景・壁紙: ${deckFrame.wallpaper || deckFrame.background || "指定なし"}`);
    lines.push(
      `- ページ番号: ${
        deckFrame.pageNumber?.enabled
          ? `${deckFrame.pageNumber.position || "bottomRight"} / ${deckFrame.pageNumber.style || "n / total"} / ${deckFrame.pageNumber.scope || "bodyOnly"}`
          : "なし"
      }`
    );
    if (deckFrame.openingSlide?.enabled) {
      lines.push(
        `- Opening slide: ${deckFrame.openingSlide.frameId} / ${deckFrame.openingSlide.title || "deck title"}`
      );
      if (
        deckFrame.openingSlide.frameId === "visualTitleCover" &&
        deckFrame.openingSlide.visualRequest
      ) {
        formatStageOneVisualDisplayLines({
          id: "openingVisual",
          kind: "visual",
          styleId: "visualCover",
          visualRequest: deckFrame.openingSlide.visualRequest,
        }).forEach((line) => lines.push(line));
      }
    }
    if (deckFrame.closingSlide?.enabled) {
      lines.push(
        `- Closing slide: ${deckFrame.closingSlide.frameId} / ${deckFrame.closingSlide.title || "- END -"}`
      );
    }
    lines.push(
      `- ロゴ: ${
        deckFrame.logo?.enabled
          ? `${deckFrame.logo.position || "topRight"}${deckFrame.logo.label ? ` / ${deckFrame.logo.label}` : ""}`
          : "なし"
      }`
    );
    lines.push("");
  }
  frames.forEach((frame, index) => {
    if (index > 0) lines.push("");
    lines.push(`Slide ${frame.slideNumber}: ${frame.title || "Untitled"}`);
    lines.push(
      deckFrame?.masterFrameId === frame.masterFrameId
        ? `Frame: ${frame.layoutFrameId}`
        : `Frame: ${frame.masterFrameId} / ${frame.layoutFrameId}`
    );
    if (frame.slideRole) lines.push(`Role: ${frame.slideRole}`);
    if (frame.layoutIntent) {
      lines.push(
        [
          "Layout intent:",
          frame.layoutIntent.textPlacement
            ? `text=${frame.layoutIntent.textPlacement}`
            : "",
          frame.layoutIntent.visualPlacement
            ? `visual=${frame.layoutIntent.visualPlacement}`
            : "",
          frame.layoutIntent.notePolicy
            ? `note=${frame.layoutIntent.notePolicy}`
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
    }
    frame.blocks.forEach((block) => {
      formatReadableBlockDisplayLines(block, frame).forEach((line) => lines.push(line));
    });
  });
  return lines;
}

function formatReadableBlockDisplayLines(
  block: PresentationTaskSlideBlock,
  frame?: PresentationTaskSlideFrame
) {
  const lines = [`- ${block.id} ${block.kind} (${block.styleId})`];
  if (
    frame?.layoutFrameId === "adaptiveVisualMain" &&
    !block.visualRequest
  ) {
    if (block.text) lines.push(`  - 表示本文: ${block.text}`);
    return lines;
  }
  if (block.heading) lines.push(`  - 表示見出し: ${block.heading}`);
  if (block.text) lines.push(`  - 表示本文: ${block.text}`);
  if (block.items?.length) {
    lines.push("  - 表示項目:");
    block.items.forEach((item) => lines.push(`    - ${item}`));
  }
  if (block.visualRequest) {
    formatStageOneVisualDisplayLines(block).forEach((line) => lines.push(line));
    return lines;
  }
  return lines;
}

function formatStageOneVisualDisplayLines(block: PresentationTaskSlideBlock) {
  const visual = block.visualRequest;
  if (!visual) return [];

  const lines: string[] = [];
  const slots = (visual.visualSlots || [])
    .filter((slot) => slot.need.trim() || slot.label.trim())
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (slots.length > 0) {
    slots.forEach((slot, index) => {
      lines.push(`  - Visual slot ${index + 1}:`);
      lines.push(`    - ビジュアルプロンプト: ${slot.need}`);
      lines.push(`    - ビジュアル内表示ラベル: ${slot.label || visual.labels?.[index] || visual.brief || "未設定"}`);
      const selectedImageId = selectedImageIdForVisualSlot(visual, slot.slotId, index);
      if (selectedImageId) {
        lines.push(`    - 選択済み画像: ${selectedImageId}`);
      }
    });
    return lines;
  }
  if (visual.prompt) {
    lines.push(`  - ビジュアルプロンプト: ${visual.prompt}`);
  } else {
    lines.push(`  - Visual prompt: prompt needed${visual.promptNote ? ` (${visual.promptNote})` : ""}`);
  }

  const displayLabel = visual.labels?.find((label) => label.trim()) || visual.brief;
  if (displayLabel) {
    lines.push(`  - ビジュアル内表示ラベル: ${displayLabel}`);
  }
  const selectedImageIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  );
  if (selectedImageIds.length > 0) {
    lines.push(`  - 選択済み画像: ${selectedImageIds.join(", ")}`);
  }

  return lines;
}

function selectedImageIdForVisualSlot(
  visual: NonNullable<PresentationTaskSlideBlock["visualRequest"]>,
  slotId: string,
  slotIndex: number
) {
  const match = (visual.selectionMatches || []).find(
    (item) => item.slotId === slotId && item.status === "selected" && item.imageId
  );
  if (match?.imageId) return match.imageId;
  const selectedIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  );
  return selectedIds[slotIndex] || (slotIndex === 0 ? selectedIds[0] || "" : "");
}