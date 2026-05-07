import { describe, expect, it } from "vitest";
import { mergePresentationResolveVisualCommandDraft } from "@/lib/app/presentation/presentationCommandDraft";

describe("mergePresentationResolveVisualCommandDraft", () => {
  it("accumulates visual block selections for the same document", () => {
    const current = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Slide 1 / block 2: img_a",
    ].join("\n");
    const next = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Slide 2 / block 2: img_b, img_c",
    ].join("\n");

    expect(mergePresentationResolveVisualCommandDraft(current, next)).toBe(
      [
        "/ppt",
        "Document ID: ppt_123",
        "Resolve visuals",
        "Slide 1 / block 2: img_a",
        "Slide 2 / block 2: img_b, img_c",
      ].join("\n")
    );
  });

  it("updates an existing visual block line instead of duplicating it", () => {
    const current = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Slide 1 / block 2: img_a",
      "Slide 2 / block 2: img_b",
    ].join("\n");
    const next = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Slide 1 / block 2: off",
    ].join("\n");

    expect(mergePresentationResolveVisualCommandDraft(current, next)).toContain(
      "Slide 1 / block 2: off\nSlide 2 / block 2: img_b"
    );
  });

  it("keeps the opening slide visual line when adding body block selections", () => {
    const current = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Opening slide / visual: img_cover",
    ].join("\n");
    const next = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Slide 1 / block 2: img_body",
    ].join("\n");

    expect(mergePresentationResolveVisualCommandDraft(current, next)).toBe(
      [
        "/ppt",
        "Document ID: ppt_123",
        "Resolve visuals",
        "Opening slide / visual: img_cover",
        "Slide 1 / block 2: img_body",
      ].join("\n")
    );
  });

  it("accumulates slot-level visual selections for the same document", () => {
    const current = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Opening slide / visual / slot 1: img_cover",
      "Slide 1 / block 2 / slot 1: img_a",
    ].join("\n");
    const next = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Slide 1 / block 2 / slot 2: img_b",
    ].join("\n");

    expect(mergePresentationResolveVisualCommandDraft(current, next)).toBe(
      [
        "/ppt",
        "Document ID: ppt_123",
        "Resolve visuals",
        "Opening slide / visual / slot 1: img_cover",
        "Slide 1 / block 2 / slot 1: img_a",
        "Slide 1 / block 2 / slot 2: img_b",
      ].join("\n")
    );
  });

  it("updates one slot-level visual selection without replacing sibling slots", () => {
    const current = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Slide 1 / block 2 / slot 1: img_old",
      "Slide 1 / block 2 / slot 2: img_b",
    ].join("\n");
    const next = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Slide 1 / block 2 / slot 1: img_new",
    ].join("\n");

    expect(mergePresentationResolveVisualCommandDraft(current, next)).toBe(
      [
        "/ppt",
        "Document ID: ppt_123",
        "Resolve visuals",
        "Slide 1 / block 2 / slot 1: img_new",
        "Slide 1 / block 2 / slot 2: img_b",
      ].join("\n")
    );
  });

  it("updates the opening slide visual line instead of duplicating it", () => {
    const current = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Opening slide / visual: img_old",
      "Slide 1 / block 2: img_body",
    ].join("\n");
    const next = [
      "/ppt",
      "Document ID: ppt_123",
      "Resolve visuals",
      "Opening slide / visual: img_new",
    ].join("\n");

    expect(mergePresentationResolveVisualCommandDraft(current, next)).toBe(
      [
        "/ppt",
        "Document ID: ppt_123",
        "Resolve visuals",
        "Opening slide / visual: img_new",
        "Slide 1 / block 2: img_body",
      ].join("\n")
    );
  });

  it("does not merge commands for different documents", () => {
    const current = [
      "/ppt",
      "Document ID: ppt_old",
      "Resolve visuals",
      "Slide 1 / block 2: img_a",
    ].join("\n");
    const next = [
      "/ppt",
      "Document ID: ppt_new",
      "Resolve visuals",
      "Slide 1 / block 2: img_b",
    ].join("\n");

    expect(mergePresentationResolveVisualCommandDraft(current, next)).toBe(next);
  });
});
