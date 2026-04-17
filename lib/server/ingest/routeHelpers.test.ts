import { describe, expect, it } from "vitest";
import {
  chooseLinesWithinBudget,
  extractIngestOutputText,
  normalizeParsedIngestResult,
} from "@/lib/server/ingest/routeHelpers";

describe("ingest route helpers", () => {
  it("extracts fallback output text from response content blocks", () => {
    const text = extractIngestOutputText({
      output: [
        {
          content: [{ text: "alpha" }, { text: "beta" }],
        },
      ],
    });

    expect(text).toBe("alpha\nbeta");
  });

  it("normalizes parsed ingest result arrays safely", () => {
    const normalized = normalizeParsedIngestResult({
      parsed: {
        title: "",
        sourceKind: "",
        rawText: "",
        structuredSummary: "bad",
        kinCompact: ["one"],
        kinDetailed: "bad",
        warnings: ["warn"],
      },
      fileName: "doc.txt",
      mimeType: "text/plain",
    });

    expect(normalized.title).toBe("doc.txt");
    expect(normalized.sourceKind).toBe("text/plain");
    expect(normalized.structuredSummary).toEqual([]);
    expect(normalized.kinCompact).toEqual(["one"]);
    expect(normalized.kinDetailed).toEqual([]);
    expect(normalized.warnings).toEqual(["warn"]);
  });

  it("falls back to secondary lines when primary lines are empty", () => {
    const lines = chooseLinesWithinBudget([], ["alpha", "beta"], 20);
    expect(lines).toEqual(["alpha", "beta"]);
  });
});
