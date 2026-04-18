import { describe, expect, it } from "vitest";
import {
  buildCanonicalDocumentSummary,
  buildTaskPrepEnvelope,
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
});
