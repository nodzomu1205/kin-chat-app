import { describe, expect, it, vi } from "vitest";
import { resolveGeneratedImportSummary } from "@/lib/app/ingest/importSummaryGeneration";
import { requestGeneratedLibrarySummary } from "@/lib/app/reference-library/librarySummaryClient";
import { normalizeUsage } from "@/lib/tokenStats";

vi.mock("@/lib/app/reference-library/librarySummaryClient", () => ({
  normalizeLibrarySummaryUsage: vi.fn((usage) => usage),
  requestGeneratedLibrarySummary: vi.fn(),
}));

describe("importSummaryGeneration", () => {
  it("keeps a local fallback summary and skips remote generation when disabled", async () => {
    const result = await resolveGeneratedImportSummary({
      enabled: false,
      title: "Notes",
      canonicalText: "Notes body",
      currentUsage: normalizeUsage({
        inputTokens: 2,
        outputTokens: 3,
        totalTokens: 5,
      }),
      fallbackSummary: " Local fallback. ",
    });

    expect(requestGeneratedLibrarySummary).not.toHaveBeenCalled();
    expect(result.summary).toBe("Local fallback.");
    expect(result.totalUsage).toMatchObject({
      inputTokens: 2,
      outputTokens: 3,
      totalTokens: 5,
    });
  });

  it("uses the generated summary and adds its usage to the ingest usage", async () => {
    vi.mocked(requestGeneratedLibrarySummary).mockResolvedValueOnce({
      summary: " Generated summary. ",
      usage: {
        inputTokens: 11,
        outputTokens: 7,
        totalTokens: 18,
      },
    });

    const result = await resolveGeneratedImportSummary({
      enabled: true,
      title: "Notes",
      canonicalText: "Notes body",
      currentUsage: normalizeUsage({
        inputTokens: 2,
        outputTokens: 3,
        totalTokens: 5,
      }),
      fallbackSummary: "Local fallback.",
    });

    expect(requestGeneratedLibrarySummary).toHaveBeenCalledWith({
      title: "Notes",
      text: "Notes body",
    });
    expect(result.summary).toBe("Generated summary.");
    expect(result.totalUsage).toMatchObject({
      inputTokens: 13,
      outputTokens: 10,
      totalTokens: 23,
    });
  });
});
