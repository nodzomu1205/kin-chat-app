import type {
  PresentationTaskDeckFrame,
  PresentationTaskPlan,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";

type RevisionResult = {
  plan: PresentationTaskPlan;
  changed: boolean;
  notes: string[];
};

export function applyPresentationPlanInstruction(
  plan: PresentationTaskPlan,
  instruction: string
): RevisionResult {
  const notes: string[] = [];
  let changed = false;
  let next: PresentationTaskPlan = clonePlan(plan);

  if (shouldIncreaseBodyAndItemFonts(instruction)) {
    next = {
      ...next,
      deckFrame: {
        ...(next.deckFrame || defaultDeckFrame(next)),
        typography: {
          ...(next.deckFrame?.typography || {}),
          bodyScale: Math.max(next.deckFrame?.typography?.bodyScale || 1, 1.18),
          itemScale: Math.max(next.deckFrame?.typography?.itemScale || 1, 1.18),
        },
      },
    };
    changed = true;
    notes.push("全スライドの本文・項目の文字サイズを大きめに設定しました。");
  }

  const targetSlideNumber = extractSlideNumber(instruction);
  if (targetSlideNumber && shouldIncreaseSlideBodyFonts(instruction)) {
    next = updateSlide(next, targetSlideNumber, (slide) => ({
      ...slide,
      blocks: slide.blocks.map((block) =>
        block.kind === "visual"
          ? block
          : {
              ...block,
              renderStyle: {
                ...(block.renderStyle || {}),
                fontSize: "xlarge",
                itemFontSize: "xlarge",
              },
            }
      ),
    }));
    changed = true;
    notes.push(`Slide ${targetSlideNumber}の本文・項目の文字サイズを大きくしました。`);
  }

  const phrase = extractQuotedPhrase(instruction);
  if (targetSlideNumber && phrase && /不要|削除|消し|消す|いらな|要らな/u.test(instruction)) {
    next = updateSlide(next, targetSlideNumber, (slide) => {
      const blocks = slide.blocks.map((block) => removePhraseFromBlock(block, phrase));
      return { ...slide, blocks };
    });
    changed = true;
    notes.push(`Slide ${targetSlideNumber}から指定文言を削除しました。`);
  }

  if (targetSlideNumber && /フロー図|工程|flow/i.test(instruction) && /垂直|縦|vertical/i.test(instruction)) {
    next = updateSlide(next, targetSlideNumber, (slide) => ({
      ...slide,
      blocks: slide.blocks.map((block) =>
        block.visualRequest?.type === "diagram"
          ? {
              ...block,
              visualRequest: {
                ...block.visualRequest,
                renderStyle: {
                  ...(block.visualRequest.renderStyle || {}),
                  orientation: "vertical",
                },
              },
            }
          : block
      ),
    }));
    changed = true;
    notes.push(`Slide ${targetSlideNumber}のフロー図を縦方向に設定しました。`);
  }

  return {
    plan: {
      ...next,
      updatedAt: new Date().toISOString(),
    },
    changed,
    notes,
  };
}

function clonePlan(plan: PresentationTaskPlan): PresentationTaskPlan {
  return JSON.parse(JSON.stringify(plan)) as PresentationTaskPlan;
}

function defaultDeckFrame(plan: PresentationTaskPlan): PresentationTaskDeckFrame {
  return {
    slideCount: plan.slideFrames.length || plan.slides.length || undefined,
    masterFrameId: "titleLineFooter",
  };
}

function shouldIncreaseBodyAndItemFonts(instruction: string) {
  return (
    /全て|すべて|全スライド/u.test(instruction) &&
    /表示本文|本文|表示項目|項目/u.test(instruction) &&
    /大きく|大きめ|拡大|文字サイズ|フォントサイズ/u.test(instruction)
  );
}

function shouldIncreaseSlideBodyFonts(instruction: string) {
  return (
    /表示本文|本文|表示項目|項目|文字/u.test(instruction) &&
    /大幅|大きく|大きめ|拡大|文字サイズ|フォントサイズ/u.test(instruction)
  );
}

function extractSlideNumber(instruction: string) {
  const match =
    instruction.match(/スライド\s*([0-9０-９]+)/u) ||
    instruction.match(/slide\s*([0-9０-９]+)/iu);
  if (!match) return null;
  const normalized = match[1].replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function extractQuotedPhrase(instruction: string) {
  return (
    instruction.match(/「([^」]+)」/u)?.[1]?.trim() ||
    instruction.match(/"([^"]+)"/u)?.[1]?.trim() ||
    instruction.match(/'([^']+)'/u)?.[1]?.trim() ||
    ""
  );
}

function updateSlide(
  plan: PresentationTaskPlan,
  slideNumber: number,
  updater: (slide: PresentationTaskSlideFrame) => PresentationTaskSlideFrame
): PresentationTaskPlan {
  return {
    ...plan,
    slideFrames: plan.slideFrames.map((slide) =>
      slide.slideNumber === slideNumber ? updater(slide) : slide
    ),
  };
}

function removePhraseFromBlock(
  block: PresentationTaskSlideBlock,
  phrase: string
): PresentationTaskSlideBlock {
  const clean = (value?: string) =>
    value && normalizeText(value).includes(normalizeText(phrase)) ? undefined : value;
  return {
    ...block,
    heading: clean(block.heading),
    text: clean(block.text),
    items: block.items?.filter((item) => !normalizeText(item).includes(normalizeText(phrase))),
    visualRequest: block.visualRequest
      ? {
          ...block.visualRequest,
          brief: clean(block.visualRequest.brief) || "",
          prompt:
            block.visualRequest.prompt &&
            normalizeText(block.visualRequest.prompt) === normalizeText(phrase)
              ? undefined
              : block.visualRequest.prompt,
          renderStyle: {
            ...(block.visualRequest.renderStyle || {}),
            showBrief: clean(block.visualRequest.brief) ? block.visualRequest.renderStyle?.showBrief : false,
          },
        }
      : undefined,
  };
}

function normalizeText(value: string) {
  return value.replace(/[。．.\s]/g, "").trim();
}
