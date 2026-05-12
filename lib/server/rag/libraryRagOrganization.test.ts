import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeSupabaseRagLibraryOrganization } from "@/lib/server/rag/libraryRagOrganization";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";
import {
  hasSupabaseRagConfig,
  listSupabaseRagLibraryDocuments,
} from "@/lib/server/rag/supabaseRagClient";

vi.mock("@/lib/server/chatgpt/openaiClient", () => ({
  callOpenAIResponses: vi.fn(),
  extractOpenAIJsonObjectText: (text: string) => text,
}));

vi.mock("@/lib/server/rag/supabaseRagClient", () => ({
  hasSupabaseRagConfig: vi.fn(),
  listSupabaseRagLibraryDocuments: vi.fn(),
}));

const mockedHasConfig = vi.mocked(hasSupabaseRagConfig);
const mockedListDocuments = vi.mocked(listSupabaseRagLibraryDocuments);
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
});

function buildDocument(id: string, title: string) {
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
        content: `${title} content`,
        tokenEstimate: 20,
      },
    ],
  };
}
