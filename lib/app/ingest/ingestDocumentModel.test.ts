import { describe, expect, it } from "vitest";
import {
  applyStoredDocumentOverride,
  buildCanonicalDocumentSummary,
  buildCompactLibraryFilenameLabel,
  buildIngestedDocumentFilename,
  buildIngestedDocumentRecord,
  buildIngestedStoredDocument,
  buildLibraryFilenameWithCharCount,
  buildReferenceLibraryDocumentItem,
  buildReferenceLibrarySearchItem,
  buildStoredDocumentDisplayTitle,
  buildTaskPrepEnvelope,
  normalizeStoredDocument,
  resolveCanonicalDocumentText,
  stripTaskPrepEnvelopeMetadata,
} from "@/lib/app/ingest/ingestDocumentModel";

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
      buildIngestedDocumentRecord({
        title: "Notes",
        filename: "notes.txt",
        text: " Notes body. ",
        summary: "Short summary",
        taskId: "task-1",
        timestamp: "2026-04-18T00:00:00.000Z",
      })
    ).toMatchObject({
      title: "Notes",
      filename: "notes.txt",
      text: "Notes body.",
      summary: "Short summary",
      taskId: "task-1",
      charCount: "Notes body.".length,
      createdAt: "2026-04-18T00:00:00.000Z",
      updatedAt: "2026-04-18T00:00:00.000Z",
    });

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

  it("leaves search library summary empty when no generated summary is provided", () => {
    const item = buildReferenceLibrarySearchItem({
      rawResultId: "RAW-NO-SUMMARY",
      query: "Tokyo housing",
      summary: "",
      rawText: "alpha beta gamma",
      createdAt: "2026-04-18T00:00:00.000Z",
    });

    expect(item.summary).toBe("");
    expect(item.excerptText).toBe("alpha beta gamma");
  });

  it("cleans AI Mode references from reference-library search display text", () => {
    const item = buildReferenceLibrarySearchItem({
      rawResultId: "RAW-AI",
      mode: "ai",
      engines: ["google_ai_mode"],
      query: "OpenAI API",
      summary: "",
      rawText: [
        "Google AI Mode",
        "",
        "## APIを使うメリット",
        "- 自動化できます。 [refs: 3, 0, 22]",
        "",
        "### References",
        "[0] [OpenAI API](https://example.com/very-long-url) — long excerpt",
        "",
        "## APIを使うメリット",
        "- 自動化できます。 [refs: 3, 0, 22]",
        "",
        "Supporting links",
        "- Source A | https://example.com/source-a",
      ].join("\n"),
      createdAt: "2026-04-18T00:00:00.000Z",
      sources: [{ title: "Source A", link: "https://example.com/source-a" }],
    });

    expect(item.excerptText).not.toContain("Google AI Mode");
    expect(item.excerptText).toContain("- 自動化できます。");
    expect(item.excerptText).not.toContain("### References");
    expect(item.excerptText).not.toContain("[0] [OpenAI API]");
    expect(item.excerptText).not.toContain("Supporting links");
    expect(item.excerptText).not.toContain("Source A");
    expect(item.excerptText).not.toContain("[refs:");
    expect(item.summary).not.toContain("References");
    expect(item.sources).toBeUndefined();
  });

  it("keeps non-AI search sources on reference-library search items", () => {
    const item = buildReferenceLibrarySearchItem({
      rawResultId: "RAW-WEB",
      mode: "normal",
      engines: ["google_search"],
      query: "OpenAI API",
      summary: "Summary",
      rawText: "Google Search\n- Source A",
      createdAt: "2026-04-18T00:00:00.000Z",
      sources: [{ title: "Source A", link: "https://example.com/source-a" }],
    });

    expect(item.sources).toEqual([
      { title: "Source A", link: "https://example.com/source-a" },
    ]);
  });
});
