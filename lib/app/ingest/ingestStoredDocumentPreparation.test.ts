import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareIngestedStoredDocument } from "@/lib/app/ingest/ingestStoredDocumentPreparation";
import { resolveGeneratedImportSummary } from "@/lib/app/ingest/importSummaryGeneration";

vi.mock("@/lib/app/ingest/importSummaryGeneration", () => ({
  resolveGeneratedImportSummary: vi.fn(),
}));

describe("prepareIngestedStoredDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates summary usage and builds an ingest library record", async () => {
    vi.mocked(resolveGeneratedImportSummary).mockResolvedValue({
      summary: "generated summary",
      summarySourceText: "alpha beta",
      totalUsage: {
        inputTokens: 10,
        outputTokens: 3,
        totalTokens: 13,
      },
    });

    const result = await prepareIngestedStoredDocument({
      title: "Notes",
      filename: "notes.txt",
      text: "alpha beta",
      taskId: "task-1",
      autoGenerateSummary: true,
      currentUsage: {
        inputTokens: 1,
        outputTokens: 2,
        totalTokens: 3,
      },
      fallbackSummary: "fallback",
      timestamp: "2026-04-26T00:00:00.000Z",
    });

    expect(resolveGeneratedImportSummary).toHaveBeenCalledWith({
      enabled: true,
      title: "Notes",
      canonicalText: "alpha beta",
      currentUsage: {
        inputTokens: 1,
        outputTokens: 2,
        totalTokens: 3,
      },
      fallbackSummary: "fallback",
      onError: undefined,
    });
    expect(result.summary).toBe("generated summary");
    expect(result.totalUsage).toEqual({
      inputTokens: 10,
      outputTokens: 3,
      totalTokens: 13,
    });
    expect(result.storedDocument).toEqual({
      title: "Notes",
      filename: "notes.txt",
      text: "alpha beta",
      summary: "generated summary",
      taskId: "task-1",
      charCount: 10,
      createdAt: "2026-04-26T00:00:00.000Z",
      updatedAt: "2026-04-26T00:00:00.000Z",
    });
  });
});
