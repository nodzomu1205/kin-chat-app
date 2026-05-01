import { describe, expect, it } from "vitest";
import {
  buildPresentationCommandFailureMessage,
  buildPresentationRenderedMessage,
} from "@/lib/app/presentation/presentationGptPrompts";

describe("presentationGptPrompts", () => {
  it("builds the PPTX rendered message for the current PPT design flow", () => {
    const message = buildPresentationRenderedMessage({
      documentId: "ppt_123",
      title: "Cotton supply chain",
      slideCount: 5,
      outputPath: "blob:test",
      filename: "deck.pptx",
      generatedImages: [{ imageId: "img_1", title: "Cotton field" }],
    });

    expect(message).toContain("Presentation PPTX created.");
    expect(message).toContain("Document ID: ppt_123");
    expect(message).toContain("PPTX: [deck.pptx](blob:test)");
    expect(message).toContain("Image ID: img_1");
  });

  it("builds a render-only failure message", () => {
    const message = buildPresentationCommandFailureMessage({
      action: "renderPptx",
      error: new Error("missing plan"),
    });

    expect(message).toContain("Could not create the presentation PPTX.");
    expect(message).toContain("missing plan");
  });
});
