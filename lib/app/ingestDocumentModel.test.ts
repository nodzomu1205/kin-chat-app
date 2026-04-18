import { describe, expect, it } from "vitest";
import {
  applyStoredDocumentOverride,
  buildIngestedStoredDocument,
  buildKinStoredDocument,
  buildReferenceLibraryDocumentItem,
  buildCanonicalDocumentSummary,
  buildTaskPrepEnvelope,
  normalizeStoredDocument,
  resolveCanonicalDocumentText,
  stripTaskPrepEnvelopeMetadata,
} from "@/lib/app/ingestDocumentModel";

describe("ingestDocumentModel", () => {
  it("resolves canonical text from selected text first", () => {
    expect(
      resolveCanonicalDocumentText({
        selectedText: "line 1\nline 2",
        rawText: "raw body",
      })
    ).toBe("line 1\nline 2");
  });

  it("strips protocol envelope metadata when falling back from prep text", () => {
    const envelope = buildTaskPrepEnvelope({
      fileName: "notes.txt",
      title: "Notes",
      content: "body text",
    });

    expect(stripTaskPrepEnvelopeMetadata(envelope)).toBe("body text");
    expect(
      resolveCanonicalDocumentText({
        fallbackText: envelope,
      })
    ).toBe("body text");
  });

  it("builds canonical summaries from canonical text", () => {
    expect(
      buildCanonicalDocumentSummary(
        "Notes body. Second sentence. Third sentence.",
        "Notes"
      )
    ).toBe("body. Second sentence.");
  });

  it("normalizes stored documents through the shared ingest authority", () => {
    expect(
      normalizeStoredDocument({
        id: "doc-1",
        sourceType: "ingested_file",
        title: "Transcript",
        filename: "transcript.txt",
        text: "[0:00] alpha\n[0:08] beta",
        summary: "[0:00] alpha",
        charCount: 99,
        createdAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
      })
    ).toMatchObject({
      text: "alpha beta",
      summary: "alpha",
      charCount: "alpha beta".length,
    });
  });

  it("builds ingested and kin stored documents through the shared model", () => {
    expect(
      buildIngestedStoredDocument({
        id: "ingest-1",
        title: "Notes",
        filename: "notes.txt",
        text: "Notes body. Second sentence.",
        summary: "",
        createdAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
      })
    ).toMatchObject({
      sourceType: "ingested_file",
      summary: "body. Second sentence.",
    });

    expect(
      buildKinStoredDocument({
        id: "asm-1",
        filename: "result.txt",
        assembledText: "Task result body.",
        isComplete: true,
        totalParts: 1,
        parts: [{ index: 1, text: "Task result body." }],
        updatedAt: "2026-04-18T00:00:00.000Z",
      })
    ).toMatchObject({
      id: "kin:asm-1",
      sourceType: "kin_created",
      summary: "Task result body.",
    });
  });

  it("applies overrides and builds reference-library document items from the same model", () => {
    const overridden = applyStoredDocumentOverride(
      {
        id: "doc-1",
        sourceType: "ingested_file",
        title: "Before",
        filename: "before.txt",
        text: "Before body",
        summary: "",
        taskTitle: "Task title",
        charCount: 11,
        createdAt: "2026-04-18T00:00:00.000Z",
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
      {
        title: "After",
        text: "[0:00] After body",
        summary: "",
        updatedAt: "2026-04-19T00:00:00.000Z",
      }
    );

    expect(overridden).toMatchObject({
      title: "After",
      text: "After body",
      summary: "body",
      updatedAt: "2026-04-19T00:00:00.000Z",
    });

    expect(buildReferenceLibraryDocumentItem(overridden)).toMatchObject({
      id: "doc:doc-1",
      sourceId: "doc-1",
      itemType: "ingested_file",
      title: "After",
      excerptText: "After body",
      summary: "body",
    });
  });
});
