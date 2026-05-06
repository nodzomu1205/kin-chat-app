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
      generatedImages: [
        { imageId: "img_1", title: "Cotton field" },
        { imageId: "img_1", title: "Same image reused" },
      ],
      imageMatches: [
        {
          slideNumber: 2,
          label: "Cultivation",
          status: "selected",
          imageId: "img_1",
          imageTitle: "Cotton field",
          score: 7,
          threshold: 5,
        },
      ],
    });

    expect(message).toContain("Presentation PPTX created.");
    expect(message).toContain("Document ID: ppt_123");
    expect(message).toContain("PPTX: [deck.pptx](blob:test)");
    expect(message).toContain("Image ID: img_1");
    expect(message.match(/Image ID: img_1/g)).toHaveLength(2);
    expect(message).toContain("Slide 2 image match: Cultivation");
    expect(message).toContain("Score: 7 / Threshold: 5");
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
