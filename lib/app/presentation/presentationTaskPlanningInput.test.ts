import { describe, expect, it } from "vitest";
import {
  buildPresentationTaskConstraints,
  buildPresentationTaskStructuredInput,
} from "@/lib/app/presentation/presentationTaskPlanning";

describe("presentation task planning input", () => {
  it("includes library reference context in presentation task input when provided", () => {
    const input = buildPresentationTaskStructuredInput({
      title: "Deck",
      userInstruction: "Use references",
      body: "Body",
      libraryReferenceContext: "<<STORED_LIBRARY_CONTEXT>>\nLIB DATA",
    });

    expect(input).toContain("Library reference context:");
    expect(input).toContain("LIB DATA");
  });

  it("asks for visual slots instead of image IDs when image candidates are present", () => {
    const input = buildPresentationTaskStructuredInput({
      title: "Deck",
      userInstruction: "Use library images",
      body: "Body",
      imageLibraryContext: "<<IMAGE_LIBRARY_CANDIDATES>>\n[VISUAL ASSET 1]\nTitle: Cotton field",
    });

    expect(input).toContain("Image library selection policy:");
    expect(input).toContain("Do not refer to a specific image-library asset by identifier");
    expect(input).toContain("visualRequest.visualSlots");
    expect(input).toContain("slotId, label, need");
    expect(input).not.toContain("Image ID:");
  });

  it("uses slideFrames wording in the task constraints", () => {
    const constraints = buildPresentationTaskConstraints("create").join("\n");

    expect(constraints).toContain("The canonical slide design source is deckFrame + slideFrames JSON.");
    expect(constraints).toContain("Do not create slideDesign.slides[].parts as the preferred path.");
    expect(constraints).toContain("one-block layouts need 1 block");
    expect(constraints).toContain("Use the user's/source language");
    expect(constraints).toContain("Preserve source breadth first;");
    expect(constraints).toContain("The visible chat text must show the actual messages that will appear in PPTX.");
    expect(constraints).toContain("compare the key message with visibleSubjects");
    expect(constraints).toContain("visualSlots");
    expect(constraints).toContain("include the full concrete visual prompt");
    expect(constraints).toContain("include visualRequest.labels with at least one short in-image display label");
    expect(constraints).toContain("Do not classify a normal photo as visualMain");
    expect(constraints).toContain("Existing assets can only be described through visualRequest.visualSlots");
    expect(constraints).toContain("stored asset selection happens after parsing");
    expect(constraints).toContain("upstream / midstream / downstream");
    expect(constraints).toContain("must not be narrower than visualSlot.need");
    expect(constraints).toContain("Do not assert a specific country, location, company, person, or named system");
    expect(constraints).toContain("do not use summaryClosing");
  });
});
