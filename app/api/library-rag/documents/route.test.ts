import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/library-rag/documents/route";
import {
  hasSupabaseRagConfig,
  listAllSupabaseRagLibraryDocuments,
  listSupabaseRagLibraryDocuments,
  listSupabaseRagSemanticDuplicateGroups,
} from "@/lib/server/rag/supabaseRagClient";

vi.mock("@/lib/server/rag/libraryRagCompaction", () => ({
  compactSupabaseRagLibraryDocuments: vi.fn(),
}));

vi.mock("@/lib/server/rag/supabaseRagClient", () => ({
  deleteSupabaseRagLibraryDocument: vi.fn(),
  hasSupabaseRagConfig: vi.fn(),
  listAllSupabaseRagLibraryDocuments: vi.fn(),
  listSupabaseRagLibraryDocuments: vi.fn(),
  listSupabaseRagSemanticDuplicateGroups: vi.fn(),
}));

const mockedHasConfig = vi.mocked(hasSupabaseRagConfig);
const mockedListAllDocuments = vi.mocked(listAllSupabaseRagLibraryDocuments);
const mockedListDocuments = vi.mocked(listSupabaseRagLibraryDocuments);
const mockedListSemanticDuplicateGroups = vi.mocked(
  listSupabaseRagSemanticDuplicateGroups
);

describe("library-rag documents route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHasConfig.mockReturnValue(true);
    mockedListAllDocuments.mockResolvedValue([buildDocument("doc-all")]);
    mockedListDocuments.mockResolvedValue([buildDocument("doc-limited")]);
    mockedListSemanticDuplicateGroups.mockResolvedValue([]);
  });

  it("loads every DB document when no display limit is requested", async () => {
    const response = await GET(
      new Request("http://localhost/api/library-rag/documents?duplicateLimit=30")
    );
    const data = await response.json();

    expect(data.documents).toEqual([expect.objectContaining({ id: "doc-all" })]);
    expect(mockedListAllDocuments).toHaveBeenCalledTimes(1);
    expect(mockedListDocuments).not.toHaveBeenCalled();
  });

  it("keeps explicit limited loads available for callers that request them", async () => {
    const response = await GET(
      new Request("http://localhost/api/library-rag/documents?limit=25")
    );
    const data = await response.json();

    expect(data.documents).toEqual([expect.objectContaining({ id: "doc-limited" })]);
    expect(mockedListDocuments).toHaveBeenCalledWith({ limit: 25 });
    expect(mockedListAllDocuments).not.toHaveBeenCalled();
  });
});

function buildDocument(id: string) {
  return {
    id,
    libraryItemId: `library-${id}`,
    sourceId: `source-${id}`,
    itemType: "ingested_file" as const,
    title: id,
    summary: "",
    contentHash: `hash-${id}`,
    chunks: [],
  };
}
