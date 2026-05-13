import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeRagLibraryOrganization,
  createOrganizedRagLibraryDocument,
} from "@/lib/app/reference-library/ragLibraryOrganizationClient";

describe("ragLibraryOrganizationClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests DB organization analysis", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          configured: true,
          documentsScanned: 3,
          chunksScanned: 12,
          sourceTokenEstimate: 900,
          groups: [
            {
              id: "group-1",
              label: "Pricing policy",
              category: "sales",
              theme: "pricing",
              documentType: "policy",
              entities: ["Alpha"],
              documentIds: ["doc-1", "doc-2"],
              sourceDocumentCount: 2,
              sourceChunkCount: 8,
              sourceTokenEstimate: 600,
              suggestedChunkCount: 5,
              targetTitle: "Pricing policy knowledge",
              rationale: "Related policy fragments.",
            },
          ],
        })
      )
    );

    await expect(analyzeRagLibraryOrganization()).resolves.toMatchObject({
      configured: true,
      documentsScanned: 3,
      groups: [expect.objectContaining({ id: "group-1" })],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/library-rag/organize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "analyze" }),
    });
  });

  it("can restrict DB organization analysis to selected documents", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          configured: true,
          documentsScanned: 2,
          chunksScanned: 8,
          sourceTokenEstimate: 600,
          groups: [],
        })
      )
    );

    await analyzeRagLibraryOrganization({ documentIds: ["doc-1", "doc-2"] });

    expect(fetchMock).toHaveBeenCalledWith("/api/library-rag/organize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "analyze",
        documentIds: ["doc-1", "doc-2"],
      }),
    });
  });

  it("creates an optimized DB document and may delete source documents", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          documentId: "doc-new",
          title: "Pricing policy knowledge",
          sourceDocumentCount: 2,
          sourceChunkCount: 8,
          sourceTokenEstimate: 600,
          outputChunkCount: 10,
          outputTokenEstimate: 520,
          deletedSourceDocumentCount: 2,
        })
      )
    );

    await expect(
      createOrganizedRagLibraryDocument({
        documentIds: ["doc-1", "doc-2"],
        targetTitle: "Pricing policy knowledge",
        groupLabel: "Pricing",
        deleteSourceDocuments: true,
      })
    ).resolves.toMatchObject({
      documentId: "doc-new",
      outputChunkCount: 10,
      deletedSourceDocumentCount: 2,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/library-rag/organize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "create_organized_document",
        documentIds: ["doc-1", "doc-2"],
        targetTitle: "Pricing policy knowledge",
        groupLabel: "Pricing",
        deleteSourceDocuments: true,
      }),
    });
  });
});
