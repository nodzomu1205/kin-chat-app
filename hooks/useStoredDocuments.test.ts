import { describe, expect, it } from "vitest";
import { buildAllStoredDocuments, sanitizeDocumentOrder } from "@/hooks/useStoredDocuments";
import type { StoredDocument } from "@/types/chat";

function createDocument(
  id: string,
  overrides: Partial<StoredDocument> = {}
): StoredDocument {
  return {
    id,
    sourceType: "kin_created",
    title: `${id}-title`,
    filename: `${id}.txt`,
    text: `${id}-text`,
    summary: `${id}-summary`,
    charCount: `${id}-text`.length,
    createdAt: "2026-04-15T00:00:00.000Z",
    updatedAt: "2026-04-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("sanitizeDocumentOrder", () => {
  it("drops removed ids and appends missing ones", () => {
    const documents = [createDocument("doc-a"), createDocument("doc-b"), createDocument("doc-c")];

    expect(sanitizeDocumentOrder(["ghost", "doc-b"], documents)).toEqual([
      "doc-b",
      "doc-a",
      "doc-c",
    ]);
  });
});

describe("buildAllStoredDocuments", () => {
  it("applies overrides before sorting and ordering", () => {
    const kinDocuments = [
      createDocument("kin-1", {
        title: "Before title",
        text: "Before text",
        updatedAt: "2026-04-15T00:00:00.000Z",
      }),
    ];
    const ingestedDocuments = [
      createDocument("ingest-1", {
        sourceType: "ingested_file",
        updatedAt: "2026-04-14T00:00:00.000Z",
      }),
    ];

    const result = buildAllStoredDocuments({
      kinDocuments,
      ingestedDocuments,
      documentOverrides: {
        "kin-1": {
          title: "After title",
          text: "After text body",
          updatedAt: "2026-04-16T00:00:00.000Z",
        },
      },
      documentOrder: [],
    });

    expect(result.documentOrder).toEqual(["kin-1", "ingest-1"]);
    expect(result.allDocuments[0]).toMatchObject({
      id: "kin-1",
      title: "After title",
      text: "After text body",
      updatedAt: "2026-04-16T00:00:00.000Z",
      charCount: "After text body".length,
    });
  });

  it("respects the sanitized explicit order", () => {
    const documents = [
      createDocument("doc-1", { updatedAt: "2026-04-16T00:00:00.000Z" }),
      createDocument("doc-2", { updatedAt: "2026-04-15T00:00:00.000Z" }),
      createDocument("doc-3", { updatedAt: "2026-04-14T00:00:00.000Z" }),
    ];

    const result = buildAllStoredDocuments({
      kinDocuments: documents,
      ingestedDocuments: [],
      documentOverrides: {},
      documentOrder: ["missing", "doc-3", "doc-1"],
    });

    expect(result.documentOrder).toEqual(["doc-3", "doc-1", "doc-2"]);
    expect(result.allDocuments.map((item) => item.id)).toEqual(["doc-3", "doc-1", "doc-2"]);
  });
});
