import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeSupabaseRagLibraryOrganization } from "@/lib/server/rag/libraryRagOrganization";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";
import {
  hasSupabaseRagConfig,
  listAllSupabaseRagLibraryDocuments,
  listSupabaseRagLibraryDocumentsByIds,
} from "@/lib/server/rag/supabaseRagClient";

vi.mock("@/lib/server/chatgpt/openaiClient", () => ({
  callOpenAIResponses: vi.fn(),
  extractOpenAIJsonObjectText: (text: string) => text,
}));

vi.mock("@/lib/server/rag/supabaseRagClient", () => ({
  hasSupabaseRagConfig: vi.fn(),
  listAllSupabaseRagLibraryDocuments: vi.fn(),
  listSupabaseRagLibraryDocumentsByIds: vi.fn(),
}));

const mockedHasConfig = vi.mocked(hasSupabaseRagConfig);
const mockedListDocuments = vi.mocked(listAllSupabaseRagLibraryDocuments);
const mockedListDocumentsByIds = vi.mocked(listSupabaseRagLibraryDocumentsByIds);
const mockedCallOpenAIResponses = vi.mocked(callOpenAIResponses);

describe("libraryRagOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHasConfig.mockReturnValue(true);
  });

  it("does not group unrelated leftover ingested files by item type fallback", async () => {
    mockedListDocuments.mockResolvedValue([
      buildDocument("doc-1", "A"),
      buildDocument("doc-2", "B"),
      buildDocument("doc-3", "C"),
    ]);
    mockedCallOpenAIResponses.mockResolvedValue({
      data: {},
      text: JSON.stringify({ groups: [] }),
      usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
      usageDetails: null,
    });

    await expect(analyzeSupabaseRagLibraryOrganization()).resolves.toMatchObject({
      configured: true,
      documentsScanned: 3,
      groups: [],
    });
  });

  it("sends full chunk text to organization analysis", async () => {
    const lateText = "late document section that must remain visible";
    mockedListDocuments.mockResolvedValue([
      buildDocument("doc-1", "A", `A content\n${"x".repeat(3000)}\n${lateText}`),
      buildDocument("doc-2", "B", "B content"),
    ]);
    mockedCallOpenAIResponses.mockResolvedValue({
      data: {},
      text: JSON.stringify({ groups: [] }),
      usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
      usageDetails: null,
    });

    await analyzeSupabaseRagLibraryOrganization();

    expect(mockedCallOpenAIResponses).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.stringContaining(lateText),
      })
    );
  });

  it("analyzes only selected DB documents when ids are provided", async () => {
    mockedListDocumentsByIds.mockResolvedValue([
      buildDocument("doc-2", "B"),
      buildDocument("doc-3", "C"),
    ]);
    mockedCallOpenAIResponses.mockResolvedValue({
      data: {},
      text: JSON.stringify({ groups: [] }),
      usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
      usageDetails: null,
    });

    await expect(
      analyzeSupabaseRagLibraryOrganization({ documentIds: ["doc-2", "doc-3"] })
    ).resolves.toMatchObject({
      documentsScanned: 2,
    });
    expect(mockedListDocuments).not.toHaveBeenCalled();
    expect(mockedListDocumentsByIds).toHaveBeenCalledWith(["doc-2", "doc-3"]);
  });
});

function buildDocument(id: string, title: string, content = `${title} content`) {
  return {
    id,
    libraryItemId: `library-${id}`,
    sourceId: `source-${id}`,
    itemType: "ingested_file" as const,
    title,
    summary: "",
    contentHash: `hash-${id}`,
    chunks: [
      {
        id: `chunk-${id}`,
        documentId: id,
        chunkIndex: 0,
        content,
        tokenEstimate: 20,
      },
    ],
  };
}
