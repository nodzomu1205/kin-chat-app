import { describe, expect, it } from "vitest";
import { resolveIngestResultSelection } from "@/lib/server/ingest/resultSelection";

describe("ingest result selection", () => {
  const normalized = {
    rawText: "",
    structuredSummary: ["summary"],
    kinCompact: ["compact"],
    kinDetailed: ["detailed"],
  };

  it("prefers detailed lines for max text ingest", () => {
    const result = resolveIngestResultSelection({
      uploadKind: "text",
      readPolicy: "hybrid",
      detail: "simple",
      mode: "max",
      compactCharLimit: 500,
      simpleImageCharLimit: 500,
      normalized,
    });

    expect(result.selectedLines).toEqual(["detailed"]);
    expect(result.summaryLevel).toBe("full_text");
  });

  it("uses text-first visual summary levels", () => {
    const result = resolveIngestResultSelection({
      uploadKind: "visual",
      readPolicy: "text_first",
      detail: "simple",
      mode: "compact",
      compactCharLimit: 500,
      simpleImageCharLimit: 500,
      normalized,
    });

    expect(result.summaryLevel).toBe("visual_text_first");
  });

  it("uses raw text for max text-first visual ingest when available", () => {
    const result = resolveIngestResultSelection({
      uploadKind: "visual",
      readPolicy: "text_first",
      detail: "max",
      mode: "max",
      compactCharLimit: 500,
      simpleImageCharLimit: 500,
      normalized: {
        rawText: "原文の1行目\n原文の2行目\n原文の3行目",
        structuredSummary: ["summary"],
        kinCompact: ["compact"],
        kinDetailed: ["compressed detailed"],
      },
    });

    expect(result.selectedLines).toEqual([
      "原文の1行目",
      "原文の2行目",
      "原文の3行目",
    ]);
    expect(result.summaryLevel).toBe("visual_text_first_max");
  });

  it("keeps all detailed visual lines without applying a secondary budget cut", () => {
    const detailedLines = [
      "1. ルイ＝ニコラ・ダヴー: 説明",
      "2. ジャン・ランヌ: 説明",
      "3. ルイ＝アレクサンドル・ベルティエ: 説明",
      "4. ジョアシャン・ミュラ: 説明",
      "5. ニコラ・ジャン＝ド＝デュ・スールト: 説明",
      "6. アンドレ・マッセナ: 説明",
    ];

    const result = resolveIngestResultSelection({
      uploadKind: "visual",
      readPolicy: "text_first",
      detail: "detailed",
      mode: "compact",
      compactCharLimit: 120,
      simpleImageCharLimit: 120,
      normalized: {
        rawText: "",
        structuredSummary: ["summary"],
        kinCompact: ["6名のうち5名だけを説明"],
        kinDetailed: detailedLines,
      },
    });

    expect(result.selectedLines).toEqual(detailedLines);
    expect(result.selectedLines).toHaveLength(6);
  });

  it("keeps all detailed text lines without applying a secondary budget cut", () => {
    const detailedLines = ["section 1", "section 2", "section 3", "section 4"];

    const result = resolveIngestResultSelection({
      uploadKind: "text",
      readPolicy: "hybrid",
      detail: "simple",
      mode: "detailed",
      compactCharLimit: 10,
      simpleImageCharLimit: 10,
      normalized: {
        rawText: "",
        structuredSummary: ["summary"],
        kinCompact: ["compact"],
        kinDetailed: detailedLines,
      },
    });

    expect(result.selectedLines).toEqual(detailedLines);
  });

  it("keeps compact visual lines complete instead of clipping the last item", () => {
    const compactLines = [
      "1. Davout: strict commander.",
      "2. Lannes: frontline leader.",
      "3. Berthier: staff organizer.",
      "4. Murat: cavalry commander.",
      "5. Massena: resilient marshal.",
      "6. Ney: brave rearguard commander.",
    ];

    const result = resolveIngestResultSelection({
      uploadKind: "visual",
      readPolicy: "text_first",
      detail: "simple",
      mode: "compact",
      compactCharLimit: 60,
      simpleImageCharLimit: 60,
      normalized: {
        rawText: "",
        structuredSummary: ["summary"],
        kinCompact: compactLines,
        kinDetailed: ["detailed"],
      },
    });

    expect(result.selectedLines).toEqual(compactLines);
    expect(result.selectedLines.at(-1)).toBe("6. Ney: brave rearguard commander.");
  });

  it("keeps compact text lines complete instead of clipping the last item", () => {
    const compactLines = [
      "A. first complete point.",
      "B. second complete point.",
      "C. third complete point.",
    ];

    const result = resolveIngestResultSelection({
      uploadKind: "text",
      readPolicy: "hybrid",
      detail: "simple",
      mode: "compact",
      compactCharLimit: 30,
      simpleImageCharLimit: 30,
      normalized: {
        rawText: "",
        structuredSummary: ["summary"],
        kinCompact: compactLines,
        kinDetailed: ["detailed"],
      },
    });

    expect(result.selectedLines).toEqual(compactLines);
  });
});
