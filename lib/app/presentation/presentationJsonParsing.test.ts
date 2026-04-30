import { describe, expect, it } from "vitest";
import {
  parseInformationInventoryFromText,
  parsePresentationDraftFromText,
  parsePresentationPatchFromText,
  parsePresentationSpecFromText,
  parsePresentationStrategyFromText,
} from "@/lib/app/presentation/presentationJsonParsing";

describe("presentationJsonParsing", () => {
  it("parses information inventory JSON without slide concepts", () => {
    const inventory = parseInformationInventoryFromText(
      JSON.stringify({
        version: "0.2-information-inventory",
        topic: "ロシア史",
        language: "ja",
        rawFacts: [
          {
            id: "fact_001",
            text: "882年にキエフ・ルーシが成立した",
            sourceHint: "source A",
          },
          {
            id: "fact_002",
            text: "1991年にソ連が解体した",
            sourceHint: "source B",
          },
        ],
        factGroups: [
          {
            id: "group_001",
            label: "歴史の転換点",
            factIds: ["fact_001", "fact_002"],
          },
        ],
      })
    );

    expect(inventory).toMatchObject({
      version: "0.2-information-inventory",
      topic: "ロシア史",
      rawFacts: [
        { id: "fact_001", text: "882年にキエフ・ルーシが成立した" },
        { id: "fact_002", text: "1991年にソ連が解体した" },
      ],
      factGroups: [
        {
          id: "group_001",
          label: "歴史の転換点",
          factIds: ["fact_001", "fact_002"],
        },
      ],
    });
  });

  it("upgrades v0.1-style inventory facts into rawFacts", () => {
    const inventory = parseInformationInventoryFromText(
      JSON.stringify({
        topic: "提案",
        keyMessages: [
          {
            message: "導入効果がある",
            facts: ["初稿作成を短縮する"],
          },
        ],
      })
    );

    expect(inventory).toMatchObject({
      version: "0.2-information-inventory",
      rawFacts: [{ id: "fact_001_001", text: "初稿作成を短縮する" }],
      factGroups: [{ factIds: ["fact_001_001"] }],
    });
  });

  it("parses presentation strategy JSON as meta-level policy", () => {
    const strategy = parsePresentationStrategyFromText(
      JSON.stringify({
        title: "ロシア史",
        density: "dense",
        slideCountRange: { min: 5, max: 8, target: 6 },
        selectedFactGroupIds: ["group_001"],
        visualPolicy: {
          overallUse: "selective",
          mustVisualizeFactGroupIds: ["group_002"],
          preferredVisualTypes: ["diagram", "chart"],
        },
        structurePolicy: {
          preferredFlow: "chronological",
        },
      }),
      { renderDensity: "standard" }
    );

    expect(strategy).toMatchObject({
      version: "0.1-presentation-strategy",
      density: "standard",
      slideCountRange: { min: 5, max: 8, target: 6 },
      selectedFactGroupIds: ["group_001"],
      visualPolicy: {
        overallUse: "selective",
        mustVisualizeFactGroupIds: ["group_002"],
        preferredVisualTypes: ["diagram", "chart"],
      },
      structurePolicy: {
        preferredFlow: "chronological",
        allowMultipleFactGroupsPerSlide: true,
      },
    });
  });

  it("parses strict PresentationSpec JSON", () => {
    const spec = parsePresentationSpecFromText(
      JSON.stringify({
        version: "0.1",
        title: "Deck",
        density: "detailed",
        slides: [{ type: "title", title: "Deck" }],
      })
    );

    expect(spec.title).toBe("Deck");
    expect(spec.density).toBe("detailed");
  });

  it("parses fenced and wrapped PresentationSpec JSON", () => {
    const spec = parsePresentationSpecFromText(`
Here is the JSON:

\`\`\`json
{
  "spec": {
    "version": "0.1",
    "title": "Wrapped Deck",
    "slides": [{ "type": "title", "title": "Wrapped Deck" }]
  }
}
\`\`\`
`);

    expect(spec.title).toBe("Wrapped Deck");
  });

  it("parses PresentationMotherSpec JSON into mother and render specs", () => {
    const draft = parsePresentationDraftFromText(
      JSON.stringify({
        version: "0.2-mother",
        title: "Mother Deck",
        purpose: "",
        audience: "",
        language: "ja",
        density: "detailed",
        theme: "business-clean",
        sourceIntent: "Build a rich proposal.",
        slides: [
          {
            title: "Rich slide",
            templateFrame: "",
            wallpaper: "",
            bodies: [
              {
                keyMessage: "Main message",
                keyMessageFacts: ["Fact 1"],
                keyVisual: {
                  type: "placeholder",
                  brief: "Simple flow",
                  generationPrompt: "Create a simple labeled flow diagram.",
                  assetId: "",
                  status: "pending",
                },
                keyVisualFacts: ["Visual fact"],
              },
            ],
            script: "Speaker note.",
          },
        ],
      })
    );

    expect(draft.motherSpec?.version).toBe("0.2-mother");
    expect(draft.motherSpec?.slides[0]?.bodies[0]?.keyVisual.generationPrompt).toBe(
      "Create a simple labeled flow diagram."
    );
    expect(draft.spec).toMatchObject({
      version: "0.1",
      title: "Mother Deck",
      density: "standard",
      slides: [
        {
          type: "twoColumn",
          title: "Rich slide",
          left: {
            heading: "Main message",
            bullets: [{ text: "Fact 1" }],
          },
          right: {
            heading: "placeholder request",
            body: "Simple flow",
            bullets: [
              {
                text: "Prompt: Create a simple labeled flow diagram.",
                emphasis: "muted",
              },
              { text: "Visual fact" },
            ],
          },
          notes: "Speaker note.",
        },
      ],
    });
  });

  it("parses wrapped PresentationPatch JSON", () => {
    const patch = parsePresentationPatchFromText(
      JSON.stringify({
        presentationPatch: {
          version: "0.1",
          operations: [
            {
              op: "updateSlide",
              slideNumber: 1,
              patch: { title: "Updated" },
            },
          ],
        },
      })
    );

    expect(patch.operations[0]).toMatchObject({ op: "updateSlide" });
  });

  it("coerces patch JSON that omits the version wrapper", () => {
    const patch = parsePresentationPatchFromText(
      JSON.stringify({
        operations: [
          {
            action: "edit_slide",
            slideIndex: 2,
            changes: { title: "Funding plan" },
          },
        ],
      })
    );

    expect(patch).toMatchObject({
      version: "0.1",
      operations: [
        {
          op: "updateSlide",
          slideNumber: 3,
          patch: { title: "Funding plan" },
        },
      ],
    });
  });

  it("coerces a bare patch operation array", () => {
    const patch = parsePresentationPatchFromText(
      JSON.stringify([
        {
          op: "replaceSlide",
          slideNumber: 2,
          slide: {
            type: "bullets",
            title: "Detailed budget",
            bullets: ["Initial cost: 1.2M JPY", "Monthly cost: 180K JPY"],
          },
        },
      ])
    );

    expect(patch.operations[0]).toMatchObject({
      op: "replaceSlide",
      slideNumber: 2,
      slide: {
        type: "bullets",
        title: "Detailed budget",
        bullets: [
          { text: "Initial cost: 1.2M JPY" },
          { text: "Monthly cost: 180K JPY" },
        ],
      },
    });
  });

  it("coerces slide types with missing required arrays", () => {
    const bullets = parsePresentationSpecFromText(
      JSON.stringify({
        version: "0.1",
        title: "Broken Deck",
        slides: [{ type: "bullets", title: "Missing bullets" }],
      })
    );
    expect(bullets.slides[0]).toMatchObject({
      type: "bullets",
      bullets: [{ text: "Content to be refined" }],
    });

    const table = parsePresentationSpecFromText(
      JSON.stringify({
        version: "0.1",
        title: "Broken Table",
        slides: [
          {
            type: "table",
            title: "Bad Table",
            columns: ["A", "B"],
            rows: [["A only"]],
          },
        ],
      })
    );
    expect(table.slides[0]).toMatchObject({
      type: "table",
      rows: [["A only", ""]],
    });
  });

  it("coerces common GPT slide shapes into PresentationSpec v0.1", () => {
    const spec = parsePresentationSpecFromText(
      JSON.stringify({
        presentationTitle: "farmers 360 link再始動計画",
        slides: [
          {
            layout: "cover",
            heading: "farmers 360 link再始動計画",
            subtitle: "提案プレゼン"
          },
          {
            type: "agenda",
            title: "本日の流れ",
            points: ["背景", "課題", "実行計画"]
          },
          {
            type: "comparison",
            title: "現状と再始動後",
            columns: [
              { title: "現状", items: ["接点が弱い"] },
              { title: "再始動後", items: ["継続接点を作る"] }
            ]
          }
        ]
      })
    );

    expect(spec.title).toBe("farmers 360 link再始動計画");
    expect(spec.slides[1].type).toBe("bullets");
    expect(spec.slides[1]).toHaveProperty("bullets");
    expect((spec.slides[1] as { bullets: Array<{ text: string }> }).bullets[0]).toEqual({
      text: "背景",
    });
    expect(spec.slides[2]).toMatchObject({
      type: "twoColumn",
      left: { heading: "現状" },
      right: { heading: "再始動後" }
    });
  });

  it("normalizes twoColumn item arrays into renderer-ready bullets", () => {
    const spec = parsePresentationSpecFromText(
      JSON.stringify({
        version: "0.1",
        title: "Deck",
        slides: [
          {
            type: "twoColumn",
            title: "Partnership and plan",
            left: {
              heading: "Partnership",
              items: ["Partner A", "Partner B"],
            },
            right: {
              heading: "Plan",
              items: ["MVP", "Pilot"],
            },
          },
        ],
      })
    );

    expect(spec.slides[0]).toMatchObject({
      type: "twoColumn",
      left: {
        heading: "Partnership",
        bullets: [{ text: "Partner A" }, { text: "Partner B" }],
      },
      right: {
        heading: "Plan",
        bullets: [{ text: "MVP" }, { text: "Pilot" }],
      },
    });
  });

  it("uses leftContent and rightContent when GPT leaves left/right empty", () => {
    const spec = parsePresentationSpecFromText(
      JSON.stringify({
        version: "0.1",
        title: "Deck",
        slides: [
          {
            type: "twoColumn",
            title: "Strategy",
            leftContent: {
              bullets: [{ text: "Build partner stories" }],
            },
            rightContent: {
              bullets: [{ text: "Run MVP validation" }],
            },
            left: { heading: "Left" },
            right: { heading: "Right" },
          },
        ],
      })
    );

    expect(spec.slides[0]).toMatchObject({
      type: "twoColumn",
      left: {
        heading: "Left",
        bullets: [{ text: "Build partner stories" }],
      },
      right: {
        heading: "Right",
        bullets: [{ text: "Run MVP validation" }],
      },
    });
  });

  it("reads nested content objects produced by GPT", () => {
    const spec = parsePresentationSpecFromText(
      JSON.stringify({
        version: "0.1",
        slides: [
          {
            type: "title",
            content: {
              title: "Farmers 360 Link",
              subtitle: "New business plan",
            },
          },
          {
            type: "bullets",
            content: {
              title: "Strategy goals",
              bullets: ["Connect consumers", "Support producers"],
            },
          },
          {
            type: "twoColumn",
            content: {
              title: "Benefits",
              leftTitle: "Consumer",
              leftBullets: ["Transparent story"],
              rightTitle: "Producer",
              rightBullets: ["Direct feedback"],
            },
          },
          {
            type: "closing",
            content: {
              title: "Summary",
              text: "Move to pilot.",
            },
          },
        ],
      })
    );

    expect(spec.title).toBe("Farmers 360 Link");
    expect(spec.slides[0]).toMatchObject({
      type: "title",
      title: "Farmers 360 Link",
      subtitle: "New business plan",
    });
    expect(spec.slides[1]).toMatchObject({
      type: "bullets",
      title: "Strategy goals",
      bullets: [{ text: "Connect consumers" }, { text: "Support producers" }],
    });
    expect(spec.slides[2]).toMatchObject({
      type: "twoColumn",
      title: "Benefits",
      left: { heading: "Consumer", bullets: [{ text: "Transparent story" }] },
      right: { heading: "Producer", bullets: [{ text: "Direct feedback" }] },
    });
    expect(spec.slides[3]).toMatchObject({
      type: "closing",
      title: "Summary",
      message: "Move to pilot.",
    });
  });

  it("reads nested leftColumn and rightColumn content objects", () => {
    const spec = parsePresentationSpecFromText(
      JSON.stringify({
        version: "0.1",
        title: "Deck",
        slides: [
          {
            type: "twoColumn",
            content: {
              title: "Consumer experience flow",
              leftColumn: {
                title: "Consumer action",
                bullets: ["Scan product", "Read producer story"],
              },
              rightColumn: {
                title: "Expected output",
                bullets: ["Deeper understanding", "Higher engagement"],
              },
            },
            left: {
              heading: "Left",
              bullets: [{ text: "Content to be refined" }],
            },
            right: {
              heading: "Right",
              bullets: [{ text: "Content to be refined" }],
            },
          },
        ],
      })
    );

    expect(spec.slides[0]).toMatchObject({
      type: "twoColumn",
      title: "Consumer experience flow",
      left: {
        heading: "Consumer action",
        bullets: [{ text: "Scan product" }, { text: "Read producer story" }],
      },
      right: {
        heading: "Expected output",
        bullets: [{ text: "Deeper understanding" }, { text: "Higher engagement" }],
      },
    });
  });

  it("maps content fields onto official v0.1 fields", () => {
    const spec = parsePresentationSpecFromText(
      JSON.stringify({
        title: "Deck",
        slides: [
          {
            type: "section",
            title: "概要",
            content: "プロジェクトの概要です。"
          },
          {
            type: "closing",
            title: "次のステップ",
            content: "実証と展開へ進みます。"
          }
        ]
      })
    );

    expect(spec.slides[0]).toMatchObject({
      type: "section",
      subtitle: "プロジェクトの概要です。"
    });
    expect(spec.slides[1]).toMatchObject({
      type: "closing",
      message: "実証と展開へ進みます。"
    });
  });

  it("rejects invalid responses", () => {
    expect(() => parsePresentationSpecFromText("not json")).toThrow(
      "No valid JSON object"
    );
  });
});
