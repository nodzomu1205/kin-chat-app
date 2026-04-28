import type {
  PresentationPatch,
  PresentationPatchOperation,
  PresentationSpec,
  SlideSpec,
} from "@/lib/app/presentation/presentationTypes";

export function applyPresentationPatchToSpec(
  spec: PresentationSpec,
  patch: PresentationPatch
): PresentationSpec {
  const next = clone(spec);

  patch.operations.forEach((operation) => {
    applyOperation(next, operation);
  });

  return next;
}

export function buildPresentationReplacementPatch(args: {
  currentSpec: PresentationSpec;
  nextSpec: PresentationSpec;
  description?: string;
}): PresentationPatch {
  const operations: PresentationPatchOperation[] = [
    {
      op: "updateDeck",
      title: args.nextSpec.title,
      subtitle: args.nextSpec.subtitle,
      audience: args.nextSpec.audience,
      purpose: args.nextSpec.purpose,
      theme: args.nextSpec.theme,
      density: args.nextSpec.density,
    },
  ];
  const sharedSlideCount = Math.min(
    args.currentSpec.slides.length,
    args.nextSpec.slides.length
  );

  for (
    let slideNumber = args.currentSpec.slides.length;
    slideNumber > args.nextSpec.slides.length;
    slideNumber -= 1
  ) {
    operations.push({ op: "deleteSlide", slideNumber });
  }

  for (let index = 0; index < sharedSlideCount; index += 1) {
    operations.push({
      op: "replaceSlide",
      slideNumber: index + 1,
      slide: args.nextSpec.slides[index],
    });
  }

  for (
    let index = sharedSlideCount;
    index < args.nextSpec.slides.length;
    index += 1
  ) {
    operations.push({
      op: "insertSlide",
      afterSlideNumber: index,
      slide: args.nextSpec.slides[index],
    });
  }

  return {
    version: "0.1",
    description:
      args.description ||
      "Full PresentationSpec replacement converted into patch operations.",
    operations,
  };
}

export function buildFallbackPresentationRevisionPatch(args: {
  currentSpec: PresentationSpec;
  userInstruction: string;
}): PresentationPatch {
  const afterSlideNumber = findFallbackInsertionPoint(args.currentSpec);
  const title = buildFallbackSlideTitle(args.userInstruction);
  return {
    version: "0.1",
    description: "Fallback revision generated when GPT did not return parseable JSON.",
    operations: [
      {
        op: "insertSlide",
        afterSlideNumber,
        slide: {
          type: "bullets",
          title,
          lead: "ユーザーの修正指示を反映するための追加詳細です。",
          bullets: [
            {
              text: `修正指示: ${args.userInstruction.trim()}`,
            },
            {
              text: "背景、目的、前提条件を補足して、読み手が判断しやすい構成にする。",
            },
            {
              text: "必要な数値、根拠、実行ステップをスライド本文に追加する。",
            },
            {
              text: "次回の修正で、この追加スライドを具体データに置き換える。",
            },
          ],
          takeaway: "修正意図はライブラリJSONに保存済みです。",
        },
      },
    ],
  };
}

function applyOperation(
  spec: PresentationSpec,
  operation: PresentationPatchOperation
) {
  switch (operation.op) {
    case "updateDeck":
      if (operation.title !== undefined) spec.title = operation.title;
      if (operation.subtitle !== undefined) spec.subtitle = operation.subtitle;
      if (operation.audience !== undefined) spec.audience = operation.audience;
      if (operation.purpose !== undefined) spec.purpose = operation.purpose;
      if (operation.theme !== undefined) spec.theme = operation.theme;
      if ("density" in operation && operation.density !== undefined) {
        spec.density = operation.density as PresentationSpec["density"];
      }
      return;
    case "updateSlide":
      spec.slides[toIndex(spec, operation.slideNumber)] = {
        ...spec.slides[toIndex(spec, operation.slideNumber)],
        ...operation.patch,
      } as SlideSpec;
      return;
    case "replaceSlide":
      spec.slides[toIndex(spec, operation.slideNumber)] = operation.slide;
      return;
    case "insertSlide":
      if (operation.afterSlideNumber > spec.slides.length) {
        throw new Error(
          `Cannot insert after slide ${operation.afterSlideNumber}; presentation has ${spec.slides.length} slides.`
        );
      }
      spec.slides.splice(operation.afterSlideNumber, 0, operation.slide);
      return;
    case "deleteSlide":
      if (spec.slides.length === 1) {
        throw new Error("Cannot delete the only slide in a presentation.");
      }
      spec.slides.splice(toIndex(spec, operation.slideNumber), 1);
      return;
    case "moveSlide": {
      const fromIndex = toIndex(spec, operation.fromSlideNumber);
      const toSlideIndex = toIndex(spec, operation.toSlideNumber);
      const [slide] = spec.slides.splice(fromIndex, 1);
      spec.slides.splice(toSlideIndex, 0, slide);
      return;
    }
  }
}

function toIndex(spec: PresentationSpec, slideNumber: number) {
  const index = slideNumber - 1;
  if (index < 0 || index >= spec.slides.length) {
    throw new Error(
      `Slide ${slideNumber} does not exist; presentation has ${spec.slides.length} slides.`
    );
  }
  return index;
}

function findFallbackInsertionPoint(spec: PresentationSpec) {
  const closingIndex = spec.slides.findIndex((slide) => slide.type === "closing");
  if (closingIndex > 0) return closingIndex;
  return Math.max(0, spec.slides.length - 1);
}

function buildFallbackSlideTitle(userInstruction: string) {
  if (/資金|費用|予算|収支|投資|売上|利益|数字|数値/u.test(userInstruction)) {
    return "資金計画の詳細";
  }
  if (/情報|詳細|リッチ|具体/u.test(userInstruction)) {
    return "詳細情報の補足";
  }
  return "修正内容の反映";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
