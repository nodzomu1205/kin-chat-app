import { describe, expect, it } from "vitest";
import { buildIngestPrompt } from "@/lib/server/ingest/promptBuilder";

describe("ingest prompt builder", () => {
  it("builds a visual prompt with the selected read policy guidance", () => {
    const prompt = buildIngestPrompt({
      file: new File(["image"], "slide.png", { type: "image/png" }),
      mimeType: "image/png",
      uploadKind: "visual",
      mode: "compact",
      detail: "detailed",
      readPolicy: "text_first",
    });

    expect(prompt).toContain("Reading policy: text-first.");
    expect(prompt).toContain("Visual detail level: detailed");
    expect(prompt).toContain('"kinDetailed": string[]');
  });

  it("avoids duplicate detail output for max text-first visual ingest", () => {
    const prompt = buildIngestPrompt({
      file: new File(["pdf"], "doc.pdf", { type: "application/pdf" }),
      mimeType: "application/pdf",
      uploadKind: "visual",
      mode: "max",
      detail: "max",
      readPolicy: "text_first",
    });

    expect(prompt).toContain("rawText is the single full-text authority");
    expect(prompt).toContain(
      "Do not repeat the extracted text in structuredSummary, kinCompact, or kinDetailed"
    );
  });

  it("requires complete structural coverage for detailed visual ingest", () => {
    const prompt = buildIngestPrompt({
      file: new File(["pdf"], "people.pdf", { type: "application/pdf" }),
      mimeType: "application/pdf",
      uploadKind: "visual",
      mode: "compact",
      detail: "detailed",
      readPolicy: "text_first",
    });

    expect(prompt).toContain(
      "Put one complete medium-detail coverage digest in kinDetailed only"
    );
    expect(prompt).toContain(
      "Preserve fixed sets, enumerations, steps, comparisons, and stated counts"
    );
    expect(prompt).not.toContain("omitting one");
  });

  it("builds a text prompt with max-mode preservation guidance", () => {
    const prompt = buildIngestPrompt({
      file: new File(["a"], "doc.txt", { type: "text/plain" }),
      mimeType: "text/plain",
      uploadKind: "text",
      mode: "max",
      detail: "simple",
      readPolicy: "hybrid",
    });

    expect(prompt).toContain("Preferred text mode: max");
    expect(prompt).toContain("keep wording and order as much as possible");
    expect(prompt).toContain("Put the full extracted text in kinDetailed only");
    expect(prompt).toContain(
      "Do not generate multiple alternate versions of the same content"
    );
  });

  it("requires complete structural coverage for detailed text ingest", () => {
    const prompt = buildIngestPrompt({
      file: new File(["a"], "doc.txt", { type: "text/plain" }),
      mimeType: "text/plain",
      uploadKind: "text",
      mode: "detailed",
      detail: "simple",
      readPolicy: "hybrid",
    });

    expect(prompt).toContain(
      "Put one complete medium-detail coverage digest in kinDetailed only"
    );
    expect(prompt).toContain(
      "Preserve fixed sets, enumerations, steps, comparisons, and stated counts"
    );
    expect(prompt).toContain(
      "compress evenly instead of dropping later items"
    );
  });
});
