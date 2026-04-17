import { describe, expect, it } from "vitest";
import { resolveIngestResultSelection } from "@/lib/server/ingest/resultSelection";

describe("ingest result selection", () => {
  const normalized = {
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
});
