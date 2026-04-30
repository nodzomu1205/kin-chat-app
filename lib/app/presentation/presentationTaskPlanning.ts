import type {
  PresentationTaskPlan,
  PresentationTaskSlidePlan,
  TaskResult,
} from "@/types/task";
import type {
  BulletItem,
  PresentationSpec,
} from "@/lib/app/presentation/presentationTypes";
import {
  cleanBulletPrefix,
  formatPresentationSlidePlanLines,
  formatPresentationSlideDesignLines,
  layoutItemBullets,
  parsePresentationTaskSlidesFromJsonLines,
  parsePresentationTaskSlidesFromLines,
  slideDisplayMessage,
  slideDisplayTitle,
  slideDisplayVisual,
} from "@/lib/app/presentation/slidePartsParser";

const PPT_MARKER = /(?:^|\s)\/ppt(?:\s|$)/i;

export function isPresentationTaskInstruction(text: string) {
  return PPT_MARKER.test(text);
}

export function stripPresentationTaskMarker(text: string) {
  return text
    .replace(PPT_MARKER, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export function buildPresentationTaskStructuredInput(args: {
  title?: string;
  userInstruction?: string;
  body?: string;
  material?: string;
  currentPlanText?: string;
}) {
  return [
    `プレゼンタイトル: ${args.title?.trim() || "未設定"}`,
    `ユーザー指示: ${args.userInstruction?.trim() || "なし"}`,
    args.currentPlanText?.trim()
      ? `現在のPPT設計書:\n${args.currentPlanText.trim()}`
      : "",
    args.body?.trim() ? `入力本文:\n${args.body.trim()}` : "",
    args.material?.trim() ? `取込素材:\n${args.material.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function resolvePresentationTaskTitle(args: {
  presentationMode: boolean;
  explicitTitle?: string;
  currentTitle?: string;
  currentTaskName?: string;
  generatedTitle?: string;
  fallbackTitle: string;
  preserveExistingTitle: boolean;
}) {
  if (!args.presentationMode) {
    return args.generatedTitle || args.fallbackTitle;
  }

  const explicitTitle = args.explicitTitle?.trim();
  if (explicitTitle) return explicitTitle;

  if (args.preserveExistingTitle) {
    const existingTitle =
      args.currentTitle?.trim() || args.currentTaskName?.trim();
    if (existingTitle) return existingTitle;
  }

  return args.generatedTitle || args.fallbackTitle;
}

export function buildPresentationTaskConstraints(mode: "create" | "update") {
  return [
    "これは通常タスクではなく、PPT設計書を作るためのタスク形成である",
    "PowerPointファイルをまだ作らない。まず人間が目視・修正できる設計書を作る",
    "出力はユーザーがチャット画面とタスク形成タブで読む前提で、日本語の設計書として整理する",
    "DETAIL_BLOCKS には必ず [BLOCK: 抽出事項] [BLOCK: Presentation Strategy] [BLOCK: キーメッセージ] [BLOCK: スライド設計JSON] を含める",
    "KEY_POINTS は空にする。設計ポイントという独立セクションは出力しない",
    "抽出事項は意味でグループ化されたRaw factsとして、素材に明示された内容を細かく箇条書きにする",
    "抽出事項では重要度・評価・ランキングを勝手に付けない",
    "Presentation Strategyには audience, purpose, tone, density, visual policy, structure policy, slide count range を含める",
    "キーメッセージブロックでは、各スライドで何を言い切るのかを素材中の具体事実に基づく主張文として書く",
    "配置‣構成はスライド全体のレイアウト指示であり、PPTX上に本文として表示される素材ではない前提で書く",
    "[BLOCK: スライド設計JSON] は必須であり、省略してはいけない。作れない場合は STATUS: NEEDS_MORE にして MISSING_INFO に理由を書く",
    "[BLOCK: スライド設計JSON] のbodyは、必ず1つの箇条書きだけにする。先頭は - { で始め、1行のcompact JSONだけを書く。説明文、markdown fence、自然文を混ぜない",
    "スライド設計JSONブロックだけはJSONで返す。このJSONを各スライドの正本とし、自然文のスライド設計ブロックは出力しない",
    "スライド設計JSONは {\"slides\":[{\"slideNumber\":1,\"placementComposition\":\"...\",\"parts\":[{\"role\":\"タイトル\",\"text\":\"...\"}]}]} の形にする",
    "partsには、スライド上に実際に置く要素だけを role/text の形で列挙する",
    "partsは1パーツ1オブジェクトで書く。複数の役割を同じtextに連結しない",
    "タイトル、狙い、主メッセージ、ポイント、キービジュアルなど、スライドに表示する文言は配置するパーツに入れる。別項目として重複表示しない",
    "配置‣構成には、画面上に置く要素の位置関係を具体的に書く",
    "配置‣構成に登場する要素名は、必ず配置するパーツにも同じ意味で登場させる。配置‣構成だけに存在するアイコン、図、説明、リスト、矢印、ラベルを作らない",
    "アイコン、図、説明、リスト、チャート、矢印などを配置する場合は、それぞれを独立したパーツとして、実際の表示文言または生成プロンプトまで書く",
    "図表や模式図を使う場合は、図中に表示するラベルや短文も配置するパーツに明記する",
    "partsには『説明』『テキスト』『ポイント』『一文ずつ』『例』などのプレースホルダーを書かず、実際に表示する文言を書く",
    "各ページに背景という項目は出力しない",
    "全ページを同じ配置に固定せず、内容に応じてビジュアル有無や構成を変える",
    "素材にない事実を補わない。不足する情報は MISSING_INFO に出す",
    "ユーザーが修正指示を出した場合は、既存設計書を保持しつつ該当箇所を更新する",
    mode === "create"
      ? "初回生成では、素材を広く拾い、あとで削れる状態にする"
      : "更新では、ユーザー指示を優先し、既存の有用な設計を不用意に薄めない",
  ];
}

function findBlock(result: TaskResult | null, names: string[]) {
  if (!result) return [];
  const normalizedNames = names.map((name) => name.toLowerCase());
  return (
    result.detailBlocks.find((block) =>
      normalizedNames.some((name) => block.title.toLowerCase().includes(name))
    )?.body || []
  );
}

function findExactBlock(result: TaskResult | null, names: string[]) {
  if (!result) return [];
  const normalizedNames = names.map((name) => name.toLowerCase());
  return (
    result.detailBlocks.find((block) =>
      normalizedNames.some((name) => block.title.toLowerCase() === name)
    )?.body || []
  );
}

function parseSectionLines(text: string) {
  const sections: Record<string, string[]> = {};
  let current = "";
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const sectionMatch = line.match(/^■\s*(.+)$/u);
    if (sectionMatch) {
      current = sectionMatch[1].trim();
      sections[current] = sections[current] || [];
      return;
    }
    if (current && line.startsWith("-")) {
      sections[current].push(cleanBulletPrefix(line));
    }
  });
  return sections;
}

function findSection(sections: Record<string, string[]>, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const entry = Object.entries(sections).find(([title]) =>
    normalizedNames.some((name) => title.toLowerCase().includes(name))
  );
  return entry?.[1] || [];
}

function findExactSection(sections: Record<string, string[]>, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const entry = Object.entries(sections).find(([title]) => {
    const normalizedTitle = title.toLowerCase();
    return normalizedNames.some((name) => normalizedTitle === name);
  });
  return entry?.[1] || [];
}

function extractSummaryFromText(text: string) {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("概要:"))
      ?.replace(/^概要:\s*/, "")
      .trim() || ""
  );
}

export function buildPresentationTaskPlanFromText(args: {
  title: string;
  text: string;
  updatedAt?: string;
}): PresentationTaskPlan {
  const sections = parseSectionLines(args.text);
  const slideJsonItems = findSection(sections, [
    "Debug: スライド設計JSON",
    "スライド設計JSON",
    "slide design json",
  ]);
  const slideItems = findExactSection(sections, ["スライド設計", "slides", "slide"]);
  const slidesFromJson = parsePresentationTaskSlidesFromJsonLines(slideJsonItems);
  const slidesFromText = parsePresentationTaskSlidesFromLines(slideItems);
  const slides = slidesFromJson.length > 0 ? slidesFromJson : slidesFromText;
  return {
    version: "0.1-presentation-task-plan",
    title: args.title,
    sourceSummary: extractSummaryFromText(args.text),
    extractedItems: findSection(sections, ["抽出事項", "raw facts", "facts"]),
    strategyItems: findSection(sections, ["Presentation Strategy", "strategy"]),
    keyMessages: findSection(sections, ["キーメッセージ", "key message"]),
    slideItems,
    slides,
    missingInfo: findSection(sections, ["不足情報", "missing"]),
    nextSuggestions: findSection(sections, ["次の提案", "next"]),
    latestPptx: null,
    debug: {
      slideSource:
        slidesFromJson.length > 0
          ? "slideDesignJson"
          : slidesFromText.length > 0
            ? "legacySlideText"
            : "none",
      slideJsonRaw: slideJsonItems,
      slideJsonParsed: slidesFromJson.length > 0,
      slideCount: slides.length,
      generatedAt: args.updatedAt || new Date().toISOString(),
    },
    updatedAt: args.updatedAt || new Date().toISOString(),
  };
}

export function buildPresentationTaskPlan(args: {
  title: string;
  result: TaskResult | null;
  rawText: string;
  updatedAt?: string;
}): PresentationTaskPlan {
  const result = args.result;
  const slideJsonItems = findBlock(result, [
    "スライド設計JSON",
    "slide design json",
    "slides json",
  ]);
  const slideItems = findExactBlock(result, ["スライド設計", "slides", "slide"]);
  const slidesFromJson = parsePresentationTaskSlidesFromJsonLines(slideJsonItems);
  const slidesFromText = parsePresentationTaskSlidesFromLines(slideItems);
  const slides = slidesFromJson.length > 0 ? slidesFromJson : slidesFromText;
  return {
    version: "0.1-presentation-task-plan",
    title: args.title,
    sourceSummary: result?.summary || "",
    extractedItems: findBlock(result, ["抽出事項", "raw facts", "facts"]),
    strategyItems: findBlock(result, ["Presentation Strategy", "strategy"]),
    keyMessages: findBlock(result, ["キーメッセージ", "key message"]),
    slideItems,
    slides,
    missingInfo: result?.missingInfo || [],
    nextSuggestions: result?.nextSuggestion || [],
    latestPptx: null,
    debug: {
      slideSource:
        slidesFromJson.length > 0
          ? "slideDesignJson"
          : slidesFromText.length > 0
            ? "legacySlideText"
            : "none",
      slideJsonRaw: slideJsonItems,
      slideJsonParsed: slidesFromJson.length > 0,
      slideCount: slides.length,
      generatedAt: args.updatedAt || new Date().toISOString(),
    },
    updatedAt: args.updatedAt || new Date().toISOString(),
  };
}

function bulletsFromSlide(slide: PresentationTaskSlidePlan): BulletItem[] {
  const items = slide.supportingInfo.filter(Boolean);
  return items.length > 0
    ? items.map((text) => ({ text }))
    : [{ text: slide.keyMessage || "内容を確認してください" }];
}

function bulletItems(values: string[]) {
  return values.filter(Boolean).map((text) => ({ text }));
}

function shouldUseVisualLayout(slide: PresentationTaskSlidePlan) {
  if (slideDisplayVisual(slide) || slide.visualSupportingInfo.length > 0) return true;
  return false;
}

function normalizedChars(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, "")
        .split("")
    )
  );
}

function relevanceScore(fact: string, query: string) {
  const queryChars = normalizedChars(query);
  if (queryChars.length === 0) return 0;
  const factText = fact.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return queryChars.reduce(
    (score, char) => score + (factText.includes(char) ? 1 : 0),
    0
  );
}

function relatedExtractedItemsForSlide(
  slide: PresentationTaskSlidePlan,
  extractedItems: string[]
) {
  const query = [slide.title, slide.keyMessage, slide.keyVisual].join(" ");
  return extractedItems
    .map((item) => ({
      item,
      score: relevanceScore(item, query),
    }))
    .filter(({ score }) => score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ item }) => item);
}

function supportingInfoForSlide(
  slide: PresentationTaskSlidePlan,
  extractedItems: string[]
) {
  return slide.supportingInfo.length > 0
    ? slide.supportingInfo
    : relatedExtractedItemsForSlide(slide, extractedItems);
}

function inferLayoutVariant(
  slide: PresentationTaskSlidePlan,
  slideIndex: number
): Extract<
  PresentationSpec["slides"][number],
  { type: "twoColumn" }
>["layoutVariant"] {
  const hint = `${slide.placementComposition} ${slideDisplayVisual(slide)}`;
  if (/中央|中心|大きく|全面|フル|地図|マップ|工程図|フロー|タイムライン/u.test(hint)) {
    return "visualHero";
  }
  if (/左に(?:写真|画像|イラスト|図|図解|地図|マップ|ビジュアル)|ビジュアル左|写真左|図左|左側に(?:写真|画像|イラスト|図|図解)/u.test(hint)) {
    return "visualLeftTextRight";
  }
  if (/右に(?:写真|画像|イラスト|図|図解|地図|マップ|ビジュアル)|ビジュアル右|写真右|図右|右側に(?:写真|画像|イラスト|図|図解)/u.test(hint)) {
    return "textLeftVisualRight";
  }
  if (/交互|リズム|左右|2分割|二分割|2カラム|二列/u.test(hint)) {
    return slideIndex % 2 === 0
      ? "textLeftVisualRight"
      : "visualLeftTextRight";
  }
  return "textLeftVisualRight";
}

function buildVisualLayoutSlide(
  slide: PresentationTaskSlidePlan,
  title: string,
  extractedItems: string[],
  slideIndex: number
): PresentationSpec["slides"][number] {
  const layoutBullets = layoutItemBullets(slide);
  const message = slideDisplayMessage(slide);
  const visual = slideDisplayVisual(slide);
  const visualBullets = bulletItems(
    layoutBullets.length > 0
      ? []
      : slide.structuredContent.visual.supportingFacts
  );
  const supportingBullets = bulletItems(
    layoutBullets.length > 0
      ? []
      : supportingInfoForSlide(slide, extractedItems)
  );

  return {
    type: "twoColumn",
    title,
    layoutVariant: inferLayoutVariant(slide, slideIndex),
    left: {
      heading: "配置するパーツ",
      body: message || undefined,
      bullets:
        layoutBullets.length > 0
          ? layoutBullets
          : supportingBullets.length > 0
            ? supportingBullets
            : undefined,
    },
    right: {
      heading: visual ? "キービジュアル案" : "配置‣構成",
      body:
        visual ||
        slide.structuredContent.layout.instruction ||
        "ビジュアル案を確認してください",
      bullets: visualBullets.length > 0 ? visualBullets : undefined,
    },
    notes: slide.keyMessage || undefined,
  };
}

export function buildPresentationSpecFromTaskPlan(
  plan: PresentationTaskPlan
): PresentationSpec {
  const plannedSlides = plan.slides.length > 0 ? plan.slides : [];
  if (plannedSlides.length === 0) {
    throw new Error(
      "PPTX出力に必要なスライド設計JSONがありません。設計書を更新してからPPTX出力してください。"
    );
  }
  const slides: PresentationSpec["slides"] =
    plannedSlides.map((slide, index) => {
      const title = slideDisplayTitle(slide, `Slide ${index + 1}`);
      if (index === 0) {
        const aimPart = slideDisplayMessage(slide);
        const visualPart = slideDisplayVisual(slide);
        return {
          type: "title",
          title,
          subtitle: aimPart || slide.keyMessage || undefined,
          keyVisual: visualPart || undefined,
          notes: slide.keyMessage || undefined,
        };
      }
      if (shouldUseVisualLayout(slide)) {
        return buildVisualLayoutSlide(slide, title, plan.extractedItems, index);
      }
      const supportingInfo = supportingInfoForSlide(slide, plan.extractedItems);
      const layoutBullets = layoutItemBullets(slide);
      return {
        type: "bullets",
        title,
        lead: slideDisplayMessage(slide) || undefined,
        bullets:
          layoutBullets.length > 0
            ? layoutBullets
            : supportingInfo.length > 0
              ? bulletItems(supportingInfo)
              : bulletsFromSlide(slide),
        notes: slide.keyMessage || undefined,
      };
    });

  return {
    version: "0.1",
    title: plan.title || "Presentation",
    language: "ja",
    audience: findStrategyValue(plan.strategyItems, "audience"),
    purpose: findStrategyValue(plan.strategyItems, "purpose"),
    theme: "business-clean",
    density: "standard",
    slides,
  };
}

export function hasRenderablePresentationTaskPlan(value: unknown) {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as { slides?: unknown }).slides) &&
    ((value as { slides: unknown[] }).slides.length > 0)
  );
}

function findStrategyValue(items: string[], key: string) {
  const matched = items.find((item) =>
    item.toLowerCase().startsWith(`${key.toLowerCase()}:`)
  );
  return matched?.replace(new RegExp(`^${key}\\s*:\\s*`, "i"), "").trim() || undefined;
}

export function formatPresentationTaskResultText(
  result: TaskResult | null,
  raw: string
) {
  if (!result) return raw?.trim() || "PPT設計書の解析に失敗しました。";

  const lines: string[] = [];
  lines.push("【PPT設計書】");
  if (result.summary) lines.push(`概要: ${result.summary}`);
  result.detailBlocks.forEach((block) => {
    if (block.title.toLowerCase().includes("json")) return;
    lines.push("", `■ ${block.title}`);
    if (block.title.toLowerCase().includes("スライド")) {
      formatPresentationSlideDesignLines(block.body).forEach((line) => {
        if (!line) {
          lines.push("");
        } else if (line.startsWith("- ")) {
          lines.push(`- ${line}`);
        } else {
          lines.push(`- ${line}`);
        }
      });
      return;
    }
    block.body.forEach((line) => lines.push(`- ${line}`));
  });
  if (result.missingInfo.length > 0) {
    lines.push("", "■ 不足情報");
    result.missingInfo.forEach((item) => lines.push(`- ${item}`));
  }
  if (result.nextSuggestion.length > 0) {
    lines.push("", "■ 次の提案");
    result.nextSuggestion.forEach((item) => lines.push(`- ${item}`));
  }
  return lines.join("\n");
}

export function formatPresentationTaskPlanText(plan: PresentationTaskPlan) {
  const lines: string[] = [];
  lines.push("【PPT設計書】");
  if (plan.sourceSummary) lines.push(`概要: ${plan.sourceSummary}`);

  if (plan.extractedItems.length > 0) {
    lines.push("", "■ 抽出事項");
    plan.extractedItems.forEach((item) => lines.push(`- ${item}`));
  }

  if (plan.strategyItems.length > 0) {
    lines.push("", "■ Presentation Strategy");
    plan.strategyItems.forEach((item) => lines.push(`- ${item}`));
  }

  if (plan.keyMessages.length > 0) {
    lines.push("", "■ キーメッセージ");
    plan.keyMessages.forEach((item) => lines.push(`- ${item}`));
  }

  const slides =
    Array.isArray(plan.slides) && plan.slides.length > 0
      ? plan.slides
      : parsePresentationTaskSlidesFromLines(plan.slideItems || []);

  lines.push("", "■ スライド設計");
  const slideLines =
    slides.length > 0
      ? formatPresentationSlidePlanLines(slides)
      : [
          "未生成: スライド設計JSONがありません。PPTX出力前に設計書を更新してください。",
        ];
  slideLines.forEach((line) => {
    if (!line) {
      lines.push("");
    } else {
      lines.push(`- ${line}`);
    }
  });

  if (plan.missingInfo.length > 0) {
    lines.push("", "■ 不足情報");
    plan.missingInfo.forEach((item) => lines.push(`- ${item}`));
  }

  if (plan.nextSuggestions.length > 0) {
    lines.push("", "■ 次の提案");
    plan.nextSuggestions.forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}
