import { describe, expect, it } from "vitest";
import {
  buildFramePresentationSpecFromTaskPlan,
  buildPresentationTaskConstraints,
  buildPresentationSpecFromTaskPlan,
  buildPresentationTaskPlan,
  buildPresentationTaskPlanFromText,
  buildPresentationTaskStructuredInput,
  formatPresentationTaskResultText,
  formatPresentationTaskPlanText,
  isPresentationTaskInstruction,
  resolvePresentationTaskTitle,
  stripPresentationTaskMarker,
} from "@/lib/app/presentation/presentationTaskPlanning";
import type { TaskResult } from "@/types/task";

const result: TaskResult = {
  taskId: "task",
  type: "PREP_TASK",
  status: "OK",
  summary: "事業提案資料の設計書",
  keyPoints: ["投資家向けに整理する"],
  detailBlocks: [
    { title: "抽出事項", body: ["市場課題: 小規模農家との接点が薄い"] },
    { title: "Presentation Strategy", body: ["audience: 投資家"] },
    { title: "キーメッセージ", body: ["透明性が価値になる"] },
    { title: "スライド設計", body: ["1枚目: タイトル / 概要 / 写真"] },
  ],
  warnings: [],
  missingInfo: ["収益モデル"],
  nextSuggestion: ["収益データを追加する"],
};

describe("presentationTaskPlanning", () => {
  it("uses slideFrames as the canonical slide source for visible text and renderer projection", () => {
    const frameResult: TaskResult = {
      taskId: "task-frame",
      type: "PREP_TASK",
      status: "OK",
      summary: "Frame-based plan",
      keyPoints: [],
      detailBlocks: [
        { title: "Presentation Strategy", body: ["audience: operators", "purpose: explain workflow"] },
        {
          title: "Slide Frame JSON",
          body: [
            JSON.stringify({
              slideFrames: [
                {
                  slideNumber: 1,
                  title: "Deck promise",
                  masterFrameId: "titleLineFooter",
                  layoutFrameId: "singleCenter",
                  speakerIntent: "Set the promise.",
                  blocks: [
                    {
                      id: "block1",
                      kind: "textStack",
                      styleId: "headlineCenter",
                      text: "A clearer workflow starts here.",
                    },
                  ],
                },
                {
                  slideNumber: 2,
                  title: "Workflow",
                  masterFrameId: "titleLineFooter",
                  layoutFrameId: "visualLeftTextRight",
                  speakerIntent: "Explain the workflow.",
                  blocks: [
                    {
                      id: "block1",
                      kind: "visual",
                      styleId: "visualContain",
                      visualRequest: {
                        type: "diagram",
                        brief: "Three-step workflow diagram",
                        prompt: "Draw intake, review, and output as connected steps.",
                      },
                    },
                    {
                      id: "block2",
                      kind: "textStack",
                      styleId: "textStackTopLeft",
                      heading: "Workflow",
                      text: "The process has three clear steps.",
                      items: ["Intake", "Review", "Output"],
                    },
                  ],
                },
              ],
            }),
          ],
        },
      ],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    };

    const plan = buildPresentationTaskPlan({
      title: "Workflow Deck",
      result: frameResult,
      rawText: "",
      updatedAt: "2026-04-30T00:00:00.000Z",
    });
    const visibleText = formatPresentationTaskPlanText(plan);
    const spec = buildPresentationSpecFromTaskPlan(plan);

    expect(plan.debug?.slideSource).toBe("slideFrameJson");
    expect(visibleText).toContain("Frame: visualLeftTextRight");
    expect(visibleText).toContain("- block2 textStack (textStackTopLeft)");
    expect(visibleText).toContain("- 表示本文: The process has three clear steps.");
    expect(visibleText).toContain("- Intake");
    expect(visibleText).toContain("- Review");
    expect(visibleText).toContain("- Output");
    expect(visibleText).toContain(
      "- ビジュアルプロンプト: Draw intake, review, and output as connected steps."
    );
    expect(spec.slides[1]).toMatchObject({
      type: "twoColumn",
      title: "Workflow",
      layoutVariant: "visualLeftTextRight",
      left: {
        heading: "Three-step workflow diagram",
      },
      right: {
        heading: "Workflow",
        body: "The process has three clear steps.",
      },
    });
  });

  it("normalizes deck settings, layout block counts, and list display fields", () => {
    const frameResult: TaskResult = {
      taskId: "task-frame",
      type: "PREP_TASK",
      status: "OK",
      summary: "Frame normalization plan",
      keyPoints: [],
      detailBlocks: [
        {
          title: "Slide Frame JSON",
          body: [
            JSON.stringify({
              deckFrame: {
                slideCount: 1,
                masterFrameId: "titleLineFooter",
                pageNumber: { enabled: true, position: "bottomRight" },
              },
              slideFrames: [
                {
                  slideNumber: 1,
                  title: "Risks and responses",
                  masterFrameId: "titleLineFooter",
                  layoutFrameId: "threeColumns",
                  blocks: [
                    {
                      id: "block1",
                      kind: "textStack",
                      styleId: "listCompact",
                      heading: "環境・社会課題と対応",
                      text: "コットンサプライチェーンが直面する問題と業界の対応策を紹介します。",
                      items: [
                        "水リスク：生産地で水不足や水質汚染の問題が深刻化",
                        "人権問題：児童労働や強制労働のリスクが存在",
                      ],
                    },
                    {
                      id: "block2",
                      kind: "visual",
                      styleId: "visualContain",
                      visualRequest: {
                        type: "map",
                        brief: "主要生産国マップ",
                        prompt: "インド、中国、アメリカ、ブラジルを世界地図上で強調表示する。",
                      },
                    },
                  ],
                },
              ],
            }),
          ],
        },
      ],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    };

    const plan = buildPresentationTaskPlan({
      title: "Cotton risks",
      result: frameResult,
      rawText: "",
      updatedAt: "2026-04-30T00:00:00.000Z",
    });
    const visibleText = formatPresentationTaskPlanText(plan);

    expect(plan.deckFrame).toMatchObject({
      slideCount: 1,
      masterFrameId: "titleLineFooter",
    });
    expect(plan.slideFrames[0].layoutFrameId).toBe("textLeftVisualRight");
    expect(plan.slideFrames[0].blocks[0].text).toBeUndefined();
    expect(buildPresentationSpecFromTaskPlan(plan).slides[0]).toMatchObject({
      type: "twoColumn",
      layoutVariant: "textLeftVisualRight",
    });
    expect(visibleText).toContain("全体設定");
    expect(visibleText).toContain("共通マスター: titleLineFooter");
    expect(visibleText).toContain("- 表示項目:");
    expect(visibleText).not.toContain("コットンサプライチェーンが直面する問題と業界の対応策を紹介します。");
  });

  it("keeps opening and closing slides as deck-level bookends", () => {
    const frameResult: TaskResult = {
      taskId: "task-bookends",
      type: "PREP_TASK",
      status: "OK",
      summary: "Bookend plan",
      keyPoints: [],
      detailBlocks: [
        {
          title: "Slide Frame JSON",
          body: [
            JSON.stringify({
              deckFrame: {
                slideCount: 1,
                masterFrameId: "titleLineFooter",
                pageNumber: { enabled: true, position: "bottomRight", scope: "bodyOnly" },
                openingSlide: {
                  enabled: true,
                  frameId: "titleCover",
                  title: "Opening title",
                  subtitle: "Deck scope",
                },
                closingSlide: {
                  enabled: true,
                  frameId: "endSlide",
                  title: "- END -",
                  message: "Thank you",
                },
              },
              slideFrames: [
                {
                  slideNumber: 1,
                  title: "Body",
                  layoutFrameId: "titleBody",
                  blocks: [
                    {
                      id: "block1",
                      kind: "list",
                      styleId: "listCompact",
                      items: ["Body point"],
                    },
                  ],
                },
              ],
            }),
          ],
        },
      ],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    };

    const plan = buildPresentationTaskPlan({
      title: "Bookend deck",
      result: frameResult,
      rawText: "",
      updatedAt: "2026-05-02T00:00:00.000Z",
    });
    const frameSpec = buildFramePresentationSpecFromTaskPlan(plan);
    const visibleText = formatPresentationTaskPlanText(plan);

    expect(plan.slideFrames).toHaveLength(1);
    expect(plan.deckFrame).toMatchObject({
      slideCount: 1,
      pageNumber: { scope: "bodyOnly" },
      openingSlide: { enabled: true, frameId: "titleCover" },
      closingSlide: { enabled: true, frameId: "endSlide" },
    });
    expect(frameSpec?.deckFrame?.openingSlide?.title).toBe("Opening title");
    expect(frameSpec?.deckFrame?.closingSlide?.title).toBe("- END -");
    expect(visibleText).toContain("Opening slide: titleCover / Opening title");
    expect(visibleText).toContain("Closing slide: endSlide / - END -");
  });

  it("removes no-heading edit notes from slide titles", () => {
    const frameResult: TaskResult = {
      taskId: "task-no-heading",
      type: "PREP_TASK",
      status: "OK",
      summary: "No heading edit",
      keyPoints: [],
      detailBlocks: [
        {
          title: "Slide Frame JSON",
          body: [
            JSON.stringify({
              slideFrames: [
                {
                  slideNumber: 1,
                  title: "コットンの主要生産国（見出しなし）",
                  masterFrameId: "titleLineFooter",
                  layoutFrameId: "titleBody",
                  blocks: [
                    {
                      id: "block1",
                      kind: "list",
                      styleId: "listCompact",
                      items: ["インド、中国、アメリカ、ブラジルが生産シェア上位。"],
                    },
                  ],
                },
              ],
            }),
          ],
        },
      ],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    };

    const plan = buildPresentationTaskPlan({
      title: "Cotton deck",
      result: frameResult,
      rawText: "",
      updatedAt: "2026-04-30T00:00:00.000Z",
    });

    expect(plan.slideFrames[0].title).toBe("コットンの主要生産国");
    expect(formatPresentationTaskPlanText(plan)).not.toContain("見出しなし");
  });

  it("removes no-heading edit notes when building frame specs from saved plans", () => {
    const frameResult: TaskResult = {
      taskId: "task-saved-no-heading",
      type: "PREP_TASK",
      status: "OK",
      summary: "Saved no heading edit",
      keyPoints: [],
      detailBlocks: [],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    };
    const plan = buildPresentationTaskPlan({
      title: "Cotton deck",
      result: frameResult,
      rawText: "",
      updatedAt: "2026-04-30T00:00:00.000Z",
    });
    plan.slideFrames = [
      {
        slideNumber: 1,
        title: "コットンの主要生産国（見出しなし）",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "titleBody",
        blocks: [
          {
            id: "block1",
            kind: "list",
            styleId: "listCompact",
            items: ["インド、中国、アメリカ、ブラジルが生産シェア上位。"],
          },
        ],
      },
    ];

    expect(buildFramePresentationSpecFromTaskPlan(plan)?.slideFrames[0].title).toBe(
      "コットンの主要生産国"
    );
  });

  it("projects grid frames to cards instead of table slides", () => {
    const frameResult: TaskResult = {
      taskId: "task-grid",
      type: "PREP_TASK",
      status: "OK",
      summary: "Grid plan",
      keyPoints: [],
      detailBlocks: [
        {
          title: "Slide Frame JSON",
          body: [
            JSON.stringify({
              slideFrames: [
                {
                  slideNumber: 1,
                  title: "Supply chain overview",
                  masterFrameId: "titleLineFooter",
                  layoutFrameId: "twoByTwoGrid",
                  blocks: [
                    { id: "block1", kind: "list", styleId: "listCompact", heading: "Countries", items: ["India", "China"] },
                    {
                      id: "block2",
                      kind: "visual",
                      styleId: "visualContain",
                      visualRequest: { type: "map", brief: "Production map", prompt: "Show India and China on a world map." },
                    },
                    { id: "block3", kind: "list", styleId: "listCompact", heading: "Water risk", items: ["Water scarcity", "Water pollution"] },
                    { id: "block4", kind: "list", styleId: "listCompact", heading: "Labor risk", items: ["Child labor", "Low wages"] },
                  ],
                },
              ],
            }),
          ],
        },
      ],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    };

    const plan = buildPresentationTaskPlan({
      title: "Grid deck",
      result: frameResult,
      rawText: "",
      updatedAt: "2026-04-30T00:00:00.000Z",
    });

    expect(buildPresentationSpecFromTaskPlan(plan).slides[0]).toMatchObject({
      type: "cards",
      layoutVariant: "twoByTwoGrid",
      cards: [
        { title: "Countries" },
        { title: "Production map", kind: "visual" },
        { title: "Water risk" },
        { title: "Labor risk" },
      ],
    });
  });

  it("projects heroTopDetailsBottom frames to cards without duplicating callout text", () => {
    const frameResult: TaskResult = {
      taskId: "task-hero",
      type: "PREP_TASK",
      status: "OK",
      summary: "Hero plan",
      keyPoints: [],
      detailBlocks: [
        {
          title: "Slide Frame JSON",
          body: [
            JSON.stringify({
              slideFrames: [
                {
                  slideNumber: 1,
                  title: "Risks",
                  masterFrameId: "titleLineFooter",
                  layoutFrameId: "heroTopDetailsBottom",
                  blocks: [
                    { id: "block1", kind: "callout", styleId: "callout", text: "環境と社会の課題" },
                    { id: "block2", kind: "list", styleId: "listCompact", heading: "主な課題", items: ["水リスク", "労働問題"] },
                    {
                      id: "block3",
                      kind: "visual",
                      styleId: "visualContain",
                      visualRequest: { type: "illustration", brief: "課題の象徴", promptNote: "要相談" },
                    },
                  ],
                },
              ],
            }),
          ],
        },
      ],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    };

    const plan = buildPresentationTaskPlan({
      title: "Hero deck",
      result: frameResult,
      rawText: "",
      updatedAt: "2026-04-30T00:00:00.000Z",
    });

    expect(buildPresentationSpecFromTaskPlan(plan).slides[0]).toMatchObject({
      type: "cards",
      layoutVariant: "heroTopDetailsBottom",
      cards: [
        { title: "block1", body: "環境と社会の課題", kind: "callout" },
        { title: "主な課題" },
        { title: "課題の象徴", kind: "visual" },
      ],
    });
  });

  it("detects and removes the initial /ppt marker", () => {
    expect(isPresentationTaskInstruction("/ppt 事業提案資料を作る")).toBe(true);
    expect(stripPresentationTaskMarker("/ppt 事業提案資料を作る")).toBe(
      "事業提案資料を作る"
    );
    expect(stripPresentationTaskMarker("/ppt\nタイトル: 提案\n本文")).toBe(
      "タイトル: 提案\n本文"
    );
  });

  it("builds task input for a presentation design workspace", () => {
    const input = buildPresentationTaskStructuredInput({
      title: "提案資料",
      userInstruction: "投資家向け",
      body: "本文",
      material: "素材",
    });

    expect(input).toContain("プレゼンタイトル: 提案資料");
    expect(input).toContain("取込素材:");
  });

  it("uses slideFrames wording in the task constraints", () => {
    const constraints = buildPresentationTaskConstraints("create").join("\n");

    expect(constraints).toContain("The canonical slide design source is deckFrame + slideFrames JSON.");
    expect(constraints).toContain("Do not create slideDesign.slides[].parts as the preferred path.");
    expect(constraints).toContain("one-block layouts need 1 block");
    expect(constraints).toContain("Preserve source breadth first;");
    expect(constraints).toContain("The visible chat text must show the actual messages that will appear in PPTX.");
    expect(constraints).toContain("When an image-library asset is the main information carrier");
  });

  it("keeps the existing title for presentation task updates unless title is explicit", () => {
    expect(
      resolvePresentationTaskTitle({
        presentationMode: true,
        currentTitle: "日本起業戦略メモ",
        generatedTitle: "スライド11は不要なので削除して下さい",
        fallbackTitle: "Task",
        preserveExistingTitle: true,
      })
    ).toBe("日本起業戦略メモ");

    expect(
      resolvePresentationTaskTitle({
        presentationMode: true,
        explicitTitle: "新タイトル",
        currentTitle: "日本起業戦略メモ",
        generatedTitle: "スライド11は不要なので削除して下さい",
        fallbackTitle: "Task",
        preserveExistingTitle: true,
      })
    ).toBe("新タイトル");
  });

  it("formats and stores a structured presentation plan from task result blocks", () => {
    const text = formatPresentationTaskResultText(result, "");
    const plan = buildPresentationTaskPlan({
      title: "提案資料",
      result,
      rawText: "",
      updatedAt: "2026-04-29T00:00:00.000Z",
    });

    expect(text).toContain("【PPT設計書】");
    expect(text).toContain("■ スライド設計");
    expect(text).not.toContain("■ 設計ポイント");
    expect(plan).toMatchObject({
      version: "0.1-presentation-task-plan",
      title: "提案資料",
      extractedItems: ["市場課題: 小規模農家との接点が薄い"],
      keyMessages: ["透明性が価値になる"],
      slideItems: ["1枚目: タイトル / 概要 / 写真"],
    });
  });

  it("formats visible presentation task text from the structured plan", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "環境課題",
      text: [
        "【PPT設計書】",
        "概要: 綿花生産の課題",
        "",
        "■ スライド設計",
        "- スライド5",
        "- 配置‣構成: 中央に水リスクと労働問題のアイコンと説明を並べて配置、下部に主要生産国のリスト",
        "- 配置するパーツ:",
        "- - タイトル: 現状の環境・社会課題",
        "- - ポイント: 水不足や汚染、人権労働問題が生産地で懸念されている",
        "- - 生産国: インド、中国、アメリカ、ブラジルなど主要な生産国",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });

    expect(formatPresentationTaskPlanText(plan)).toContain(
      "- 配置‣構成: 中央に水リスクと労働問題のアイコンと説明を並べて配置、下部に主要生産国のリスト"
    );
    expect(formatPresentationTaskPlanText(plan)).toContain(
      "- - タイトル: 現状の環境・社会課題"
    );
    expect(formatPresentationTaskPlanText(plan)).toContain(
      "- - ポイント: 水不足や汚染、人権労働問題が生産地で懸念されている"
    );
  });

  it("marks presentation plans without slide JSON as not renderable", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "空の設計",
      text: [
        "【PPT設計書】",
        "概要: スライド設計JSONがない",
        "",
        "■ キーメッセージ",
        "- スライド1（タイトル）「空の設計」",
        "",
        "■ スライド設計",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });

    expect(formatPresentationTaskPlanText(plan)).toContain(
      "未生成: スライド設計JSONがありません"
    );
    expect(() => buildPresentationSpecFromTaskPlan(plan)).toThrow(
      "スライド設計JSONがありません"
    );
  });

  it("uses slide design JSON as the source of truth when task result includes it", () => {
    const taskResult: TaskResult = {
      ...result,
      detailBlocks: [
        { title: "抽出事項", body: ["水リスクと労働問題がある"] },
        { title: "キーメッセージ", body: ["環境・社会課題を構造で理解する"] },
        {
          title: "スライド設計JSON",
          body: [
            JSON.stringify({
              slides: [
                {
                  slideNumber: 5,
                  placementComposition:
                    "上部にタイトル、中央に水リスクと労働問題の2つのアイコン説明、下部に主要生産国リスト",
                  parts: [
                    { role: "タイトル", text: "現状の環境・社会課題" },
                    {
                      role: "水リスクアイコン",
                      text: "水滴と乾いた大地を組み合わせたアイコン",
                    },
                    {
                      role: "水リスク説明",
                      text: "大量の水使用と水質汚染が生産地の負荷になっている",
                    },
                    {
                      role: "労働問題アイコン",
                      text: "作業者と警告マークを組み合わせたアイコン",
                    },
                    {
                      role: "労働問題説明",
                      text: "児童労働、低賃金、労働安全の問題が残る",
                    },
                    {
                      role: "生産国リスト",
                      text: "インド、中国、アメリカ、ブラジル",
                    },
                  ],
                },
              ],
            }),
          ],
        },
        {
          title: "スライド設計",
          body: ["スライド5", "配置するパーツ:", "- タイトル: 壊れた自然文"],
        },
      ],
    };
    const plan = buildPresentationTaskPlan({
      title: "コットン課題",
      result: taskResult,
      rawText: "",
      updatedAt: "2026-04-29T00:00:00.000Z",
    });
    const text = formatPresentationTaskPlanText(plan);

    expect(plan.slides[0].structuredContent.layout.elements).toEqual(
      expect.arrayContaining([
        { region: "タイトル", text: "現状の環境・社会課題" },
        { region: "水リスクアイコン", text: "水滴と乾いた大地を組み合わせたアイコン" },
        {
          region: "水リスク説明",
          text: "大量の水使用と水質汚染が生産地の負荷になっている",
        },
      ])
    );
    expect(text).toContain("- - 水リスク説明: 大量の水使用と水質汚染が生産地の負荷になっている");
    expect(text).not.toContain("壊れた自然文");
    expect(text).not.toContain("■ Debug:");
    expect(text).not.toContain('"role":"水リスク説明"');
    expect(plan.debug).toMatchObject({
      slideSource: "slideDesignJson",
      slideJsonParsed: true,
      slideCount: 1,
    });
  });

  it("normalizes the visible slide design block from parsed slide content", () => {
    const text = formatPresentationTaskResultText(
      {
        ...result,
        detailBlocks: [
          {
            title: "スライド設計",
            body: [
              "スライド1",
              "配置‣構成: タイトル中央",
              "配置するパーツ: タイトル:「表紙」／副題:「概要」",
              "スライド2",
              "配置‣構成: 左に図、右に説明",
              "配置するパーツ: タイトル:「工程」／工程図:「A→B→C」／説明文",
            ],
          },
        ],
      },
      ""
    );

    expect(text).toContain("- スライド1\n- 配置‣構成: タイトル中央");
    expect(text).toContain("- - タイトル: 表紙");
    expect(text).toContain("- - 副題: 概要");
    expect(text).toContain("- スライド2\n- 配置‣構成: 左に図、右に説明");
    expect(text).toContain("- - タイトル: 工程");
    expect(text).toContain("- - 工程図: A→B→C");
    expect(text).toContain("- - パーツ: 説明文");
  });

  it("reads natural slide design text into structured slides and a renderer spec", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "日本起業戦略メモ",
      text: [
        "【PPT設計書】",
        "概要: 起業戦略",
        "",
        "■ 抽出事項",
        "- 自己資金は3,000万円、外部調達は2,000万円を目標とする",
        "- 日本政策金融公庫と東京都補助金を組み合わせる",
        "",
        "■ スライド設計",
        "- 1. タイトルスライド",
        "- - タイトル：日本起業戦略メモ",
        "- - キーメッセージ：全体像を共有します",
        "- - 補足情報：資料作成者や日付は適宜追加",
        "- - ビジュアル：繊維の写真",
        "- - 配置：タイトル上部中央",
        "- 2. 資金戦略",
        "- - キーメッセージ：自己資金を厚くする",
        "- - 補足情報：公庫、補助金額見込み",
        "- - 配置：チャート＋テキスト",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });
    const spec = buildPresentationSpecFromTaskPlan(plan);

    expect(plan.slides).toMatchObject([
      {
        slideNumber: 1,
        title: "日本起業戦略メモ",
        keyVisual: "繊維の写真",
        placementComposition: "タイトル上部中央",
      },
      {
        slideNumber: 2,
        title: "資金戦略",
        keyMessage: "自己資金を厚くする",
      },
    ]);
    expect(spec.slides).toHaveLength(2);
    expect(spec.slides[1]).toMatchObject({
      type: "bullets",
      title: "資金戦略",
      lead: "自己資金を厚くする",
      bullets: [{ text: "公庫" }, { text: "補助金額見込み" }],
    });
    expect(spec.slides[1]).not.toHaveProperty("takeaway");
  });

  it("does not show placement/composition as visual content in PPTX spec", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "コットン",
      text: [
        "【PPT設計書】",
        "",
        "■ 抽出事項",
        "- コットンの生産は栽培・収穫、ジニング、紡績、製織・編立、仕上げ・染色、縫製に分かれる",
        "- ジニングでは綿繊維から種子を分離する",
        "",
        "■ スライド設計",
        "- スライド1【タイトル】コットン生産工程",
        "- - キーメッセージ：工程全体を確認する",
        "- スライド2【工程】コットン生産工程の全体像",
        "- - キーメッセージ：コットンは農業生産物から工業素材へ複数工程を経て変換される",
        "- - キービジュアル：栽培・収穫から縫製までを横方向に並べた工程フローチャート",
        "- - 配置‣構成：工程図を中央に大きく配置し、下部に各工程名を置く",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });
    const spec = buildPresentationSpecFromTaskPlan(plan);

    expect(spec.slides[1]).toMatchObject({
      type: "twoColumn",
      title: "コットン生産工程の全体像",
      layoutVariant: "visualHero",
      left: {
        body: "コットンは農業生産物から工業素材へ複数工程を経て変換される",
      },
      right: {
        heading: "キービジュアル案",
        body: "栽培・収穫から縫製までを横方向に並べた工程フローチャート",
      },
    });
    expect(JSON.stringify(spec.slides[1])).not.toContain("配置‣構成");
  });

  it("uses placement composition to vary visual slide layout", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "工程",
      text: [
        "【PPT設計書】",
        "■ スライド設計",
        "- スライド1【タイトル】工程",
        "- - キーメッセージ：工程を示す",
        "- スライド2【詳細】ジニング工程",
        "- - キーメッセージ：ジニングは種子を分離する工程である",
        "- - キービジュアル：ジニング機械の図解",
        "- - 配置‣構成：左に図解、右に工程説明文",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });

    expect(buildPresentationSpecFromTaskPlan(plan).slides[1]).toMatchObject({
      type: "twoColumn",
      layoutVariant: "visualLeftTextRight",
    });
  });

  it("keeps per-slide placement text in structured content", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "関係性モデル",
      text: [
        "【PPT設計書】",
        "■ スライド設計",
        "- スライド1【タイトル】関係性モデル",
        "- - 伝えること：三者それぞれの価値を示す",
        "- スライド2【モデル】三者の価値",
        "- - タイトル：三者の価値",
        "- - 伝えること：消費者・生産者・ブランドにそれぞれ参加価値がある",
        "- - 補足として使う情報：消費者は参加感を得る、生産者はフィードバックを得る",
        "- - ビジュアル：三者関係の模式図",
        "- - 配置‣構成：中央にサービス名、周囲に三者の価値を配置",
        "- - 配置する文言：",
        "- * 中央：Farmers 360 Link",
        "- * 上：消費者｜参加感を得る",
        "- * 左：生産者｜実用的なフィードバックを得る",
        "- * 右：ブランド｜編集者として価値を持つ",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });
    const slide = plan.slides[1];
    const spec = buildPresentationSpecFromTaskPlan(plan);

    expect(slide.structuredContent).toMatchObject({
      title: "三者の価値",
      mainMessage: "消費者・生産者・ブランドにそれぞれ参加価値がある",
      layout: {
        instruction: "中央にサービス名、周囲に三者の価値を配置",
        elements: [
          { region: "中央", text: "Farmers 360 Link" },
          { region: "上", text: "消費者｜参加感を得る" },
          { region: "左", text: "生産者｜実用的なフィードバックを得る" },
          { region: "右", text: "ブランド｜編集者として価値を持つ" },
        ],
      },
    });
    expect(spec.slides[1]).toMatchObject({
      type: "twoColumn",
      left: {
        bullets: [
          { text: "中央: Farmers 360 Link" },
          { text: "上: 消費者｜参加感を得る" },
          { text: "左: 生産者｜実用的なフィードバックを得る" },
          { text: "右: ブランド｜編集者として価値を持つ" },
        ],
      },
    });
  });

  it("uses concise placement parts as the slide source of truth", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "コットン",
      text: [
        "【PPT設計書】",
        "■ スライド設計",
        "- スライド1",
        "- - 配置‣構成: 上部中央にタイトル、中央にキービジュアル、下部に狙いを短文で配置",
        "- - 配置するパーツ:",
        "- - タイトル: コットン生産工程とサプライチェーンの課題",
        "- - キービジュアル: コットンの原綿や生地、衣類の写真を組み合わせたイメージ",
        "- - 狙い: 持続可能な繊維産業を考える基盤として、工程と課題を学ぶ",
        "",
        "- スライド2",
        "- - 配置‣構成: 左側に工程フロー図、右側に写真、下部に説明テキスト",
        "- - 配置するパーツ:",
        "- - タイトル: コットン栽培・収穫の基礎",
        "- - キービジュアル: 栽培から収穫までのフロー図、開花した綿花写真",
        "- - ポイント1: 春に種を蒔き夏に開花しコットンボールが熟す",
        "- - ポイント2: 収穫は機械または手作業で実綿を回収",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });
    const spec = buildPresentationSpecFromTaskPlan(plan);

    expect(plan.slides[0].structuredContent.layout.elements).toMatchObject([
      { region: "タイトル", text: "コットン生産工程とサプライチェーンの課題" },
      {
        region: "キービジュアル",
        text: "コットンの原綿や生地、衣類の写真を組み合わせたイメージ",
      },
      {
        region: "狙い",
        text: "持続可能な繊維産業を考える基盤として、工程と課題を学ぶ",
      },
    ]);
    expect(spec.slides[0]).toMatchObject({
      type: "title",
      title: "コットン生産工程とサプライチェーンの課題",
      subtitle: "持続可能な繊維産業を考える基盤として、工程と課題を学ぶ",
      keyVisual: "コットンの原綿や生地、衣類の写真を組み合わせたイメージ",
    });
    expect(spec.slides[1]).toMatchObject({
      type: "twoColumn",
      title: "コットン栽培・収穫の基礎",
      left: {
        bullets: [
          { text: "ポイント1: 春に種を蒔き夏に開花しコットンボールが熟す" },
          { text: "ポイント2: 収穫は機械または手作業で実綿を回収" },
        ],
      },
      right: {
        body: "栽培から収穫までのフロー図、開花した綿花写真",
      },
    });
  });

  it("normalizes bracketed slide parts and treats diagram/image roles as visuals", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "コットン",
      text: [
        "【PPT設計書】",
        "■ スライド設計",
        "- スライド1",
        "- 配置‣構成: タイトル中央大文字配置、下部に副題",
        "- 配置するパーツ:",
        "- [タイトル：コットン生産プロセスとサプライチェーンの現状",
        "- [副題：概要と現状分析",
        "",
        "- スライド2",
        "- 配置‣構成: 左側に工程フロー図、右側に工程説明",
        "- 配置するパーツ:",
        "- [タイトル：コットン生産の主要工程",
        "- [図表：栽培→収穫→ジニング→紡績→縫製フロー",
        "- [テキスト：栽培から縫製までの工程を一連の流れで把握する",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });
    const spec = buildPresentationSpecFromTaskPlan(plan);

    expect(plan.slides[1].structuredContent.layout.elements).toMatchObject([
      { region: "タイトル", text: "コットン生産の主要工程" },
      { region: "図表", text: "栽培→収穫→ジニング→紡績→縫製フロー" },
      {
        region: "テキスト",
        text: "栽培から縫製までの工程を一連の流れで把握する",
      },
    ]);
    expect(spec.slides[0]).toMatchObject({
      type: "title",
      title: "コットン生産プロセスとサプライチェーンの現状",
      subtitle: "概要と現状分析",
    });
    expect(spec.slides[1]).toMatchObject({
      type: "twoColumn",
      title: "コットン生産の主要工程",
      left: {
        bullets: [
          {
            text: "テキスト: 栽培から縫製までの工程を一連の流れで把握する",
          },
        ],
      },
      right: {
        body: "栽培→収穫→ジニング→紡績→縫製フロー",
      },
    });
    expect(JSON.stringify(spec.slides[1])).not.toContain("[図表");
  });

  it("splits inline placement parts into separate slide elements", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "コットン",
      text: [
        "【PPT設計書】",
        "■ スライド設計",
        "- スライド1",
        "- 配置‣構成: タイトル中央",
        "- 配置するパーツ: タイトル:「コットンの生産工程とサプライチェーンの課題」",
        "- スライド2",
        "- 配置‣構成: 左半分に工程図、右半分に工程名リスト",
        "- 配置するパーツ: タイトル:「コットン生産工程の全体像」／工程図:「栽培・収穫→ジニング→紡績→縫製」／各工程名と簡単説明",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });
    const spec = buildPresentationSpecFromTaskPlan(plan);

    expect(plan.slides[1].structuredContent.layout.elements).toMatchObject([
      { region: "タイトル", text: "コットン生産工程の全体像" },
      { region: "工程図", text: "栽培・収穫→ジニング→紡績→縫製" },
      { region: "", text: "各工程名と簡単説明" },
    ]);
    expect(spec.slides[1]).toMatchObject({
      type: "twoColumn",
      title: "コットン生産工程の全体像",
      right: {
        body: "栽培・収穫→ジニング→紡績→縫製",
      },
      left: {
        bullets: [{ text: "各工程名と簡単説明" }],
      },
    });
    expect(JSON.stringify(spec.slides[1])).not.toContain("内容を確認してください");
  });

  it("splits multiple role/value pairs that GPT placed on one bullet line", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "コットン",
      text: [
        "【PPT設計書】",
        "■ スライド設計",
        "- スライド1",
        "- 配置‣構成: 上部にタイトル、中央に写真",
        "- 配置するパーツ:",
        "- - タイトル: コットンの生産工程と課題 サブタイトル: 綿栽培から製品化までの流れと課題を解説 キービジュアル: コットンの葉と綿花の写真",
        "- スライド2",
        "- 配置‣構成: 左に図、右に説明",
        "- 配置するパーツ:",
        "- - タイトル: 栽培・収穫からジニングまで 栽培・収穫: 春に種を蒔き夏に花が咲く ジニング: 種子とゴミを除去する",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });
    const spec = buildPresentationSpecFromTaskPlan(plan);

    expect(plan.slides[0].structuredContent.layout.elements).toMatchObject([
      { region: "タイトル", text: "コットンの生産工程と課題" },
      {
        region: "サブタイトル",
        text: "綿栽培から製品化までの流れと課題を解説",
      },
      { region: "キービジュアル", text: "コットンの葉と綿花の写真" },
    ]);
    expect(spec.slides[0]).toMatchObject({
      type: "title",
      title: "コットンの生産工程と課題",
      subtitle: "綿栽培から製品化までの流れと課題を解説",
      keyVisual: "コットンの葉と綿花の写真",
    });
    expect(spec.slides[1]).toMatchObject({
      type: "bullets",
      title: "栽培・収穫からジニングまで",
      bullets: [
        { text: "栽培・収穫: 春に種を蒔き夏に花が咲く" },
        { text: "ジニング: 種子とゴミを除去する" },
      ],
    });
  });

  it("does not swallow control labels as slide parts after a placement parts list", () => {
    const plan = buildPresentationTaskPlanFromText({
      title: "配置順テスト",
      text: [
        "【PPT設計書】",
        "■ スライド設計",
        "- スライド1",
        "- 配置するパーツ:",
        "- - タイトル: Farmers 360 Link",
        "- - 狙い: 関係性を資産化する",
        "- 配置‣構成: 上部にタイトル、中央に関係図、下部に狙い",
        "- 補足情報: 消費者参加感、生産者フィードバック",
      ].join("\n"),
      updatedAt: "2026-04-29T00:00:00.000Z",
    });
    const slide = plan.slides[0];

    expect(slide.structuredContent.layout.instruction).toBe(
      "上部にタイトル、中央に関係図、下部に狙い"
    );
    expect(slide.structuredContent.layout.elements).toEqual([
      { region: "タイトル", text: "Farmers 360 Link" },
      { region: "狙い", text: "関係性を資産化する" },
    ]);
    expect(slide.supportingInfo).toEqual([
      "消費者参加感",
      "生産者フィードバック",
    ]);
  });
});
