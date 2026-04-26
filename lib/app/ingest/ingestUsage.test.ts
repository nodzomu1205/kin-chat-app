import { describe, expect, it } from "vitest";
import { normalizeLibrarySummaryIngestUsage } from "@/lib/app/ingest/ingestUsage";

describe("ingestUsage", () => {
  it("normalizes library summary usage for the ingest bucket", () => {
    expect(
      normalizeLibrarySummaryIngestUsage({
        inputTokens: 7,
        outputTokens: 3,
        totalTokens: 10,
      })
    ).toEqual({
      inputTokens: 7,
      outputTokens: 3,
      totalTokens: 10,
    });
  });
});
