import { describe, expect, it } from "vitest";
import {
  applyStoredDocumentOverride,
  buildCanonicalDocumentSummary,
  buildCompactLibraryFilenameLabel,
  buildIngestedDocumentFilename,
  buildIngestedStoredDocument,
  buildKinStoredDocument,
  buildLibraryFilenameWithCharCount,
  buildReferenceLibraryDocumentItem,
  buildReferenceLibrarySearchItem,
  buildStoredDocumentDisplayTitle,
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

  it("replaces any existing char-count suffix with a single normalized filename suffix", () => {
    expect(
      buildLibraryFilenameWithCharCount("notes__120chars.txt", "alpha beta")
    ).toBe("notes [10chars].txt");
    expect(
      buildLibraryFilenameWithCharCount("notes [120chars].txt", "alpha")
    ).toBe("notes [5chars].txt");
  });

  it("builds an ingested-document display title without path or duplicated extensions", () => {
    expect(
      buildStoredDocumentDisplayTitle({
        title: "folder/sub/notes.txt.txt",
        filename: "notes [10chars].txt",
        sourceType: "ingested_file",
      })
    ).toBe("notes");
  });

  it("builds a clean stored filename for ingested documents from the normalized title", () => {
    expect(
      buildIngestedDocumentFilename({
        title:
          "ヨハネスブルグの最新の治安状況（2026年4月現在）は、依然として極めて厳しい状況です",
        fallbackFilename: "report.txt",
      })
    ).toBe("ヨハネスブルグの最新の治安状況（2026年4月現在）.txt");
  });

  it("clips long sentence-like ingested titles at a natural boundary", () => {
    expect(
      buildStoredDocumentDisplayTitle({
        title:
          "ヨハネスブルグの最新の治安状況（2026年4月現在）は、依然として極めて厳しい状況です",
        filename: "security-report.txt",
        sourceType: "ingested_file",
      })
    ).toBe("ヨハネスブルグの最新の治安状況（2026年4月現在）");
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
      title: "Transcript",
      text: "alpha beta",
      summary: "alpha",
      charCount: "alpha beta".length,
      filename: "transcript [10chars].txt",
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
      summary: "",
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

  it("applies overrides and builds compact document-library items", () => {
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
      summary: "",
      updatedAt: "2026-04-19T00:00:00.000Z",
    });

    expect(buildReferenceLibraryDocumentItem(overridden)).toMatchObject({
      id: "doc:doc-1",
      sourceId: "doc-1",
      itemType: "ingested_file",
      title: "After",
      subtitle: "before [10chars].txt",
      excerptText: "After body",
      summary: "",
    });
  });

  it("compacts duplicated filename labels for cleaner library cards", () => {
    expect(
      buildCompactLibraryFilenameLabel({
        title: "Task Snapshot - farmers 360° link",
        filename: "Task Snapshot - farmers 360° link [1254chars].txt",
      })
    ).toBe("[1254chars].txt");

    expect(
      buildCompactLibraryFilenameLabel({
        title: "Custom title",
        filename: "different-source-name [88chars].txt",
      })
    ).toBe("different-source-name [88chars].txt");
  });

  it("builds reference-library search items with char-count filenames", () => {
    expect(
      buildReferenceLibrarySearchItem({
        rawResultId: "RAW-1",
        query: "Tokyo housing",
        summary: "Short summary",
        rawText: "alpha beta gamma",
        createdAt: "2026-04-18T00:00:00.000Z",
      })
    ).toMatchObject({
      id: "search:RAW-1",
      sourceId: "RAW-1",
      itemType: "search",
      filename: "Tokyo housing [16chars].txt",
      subtitle: "[16chars].txt",
      summary: "Short summary",
      excerptText: "alpha beta gamma",
    });
  });
});
