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
  });
});
