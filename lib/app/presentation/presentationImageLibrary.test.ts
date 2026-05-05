import { describe, expect, it } from "vitest";
import {
  buildPresentationImageLibraryContext,
  getPresentationImageLibraryCandidates,
} from "@/lib/app/presentation/presentationImageLibrary";
import type { ReferenceLibraryItem } from "@/types/chat";

function imageItem(imageId: string, title = `Image ${imageId}`): ReferenceLibraryItem {
  return {
    id: imageId,
    sourceId: imageId,
    itemType: "kin_created",
    artifactType: "generated_image",
    title,
    subtitle: "",
    summary: "",
    excerptText: "",
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
    structuredPayload: {
      version: "0.1-generated-image",
      imageId,
      mimeType: "image/png",
      prompt: imageId,
      createdAt: "2026-05-02T00:00:00.000Z",
    },
  };
}

describe("getPresentationImageLibraryCandidates", () => {
  it("includes required preferred image ids even when they are outside the reference count", () => {
    const candidates = getPresentationImageLibraryCandidates({
      enabled: true,
      count: 1,
      referenceLibraryItems: [
        imageItem("img_process"),
        imageItem("img_cotton"),
      ],
      requiredImageIds: ["img_cotton"],
    });

    expect(candidates.map((candidate) => candidate.imageId)).toEqual([
      "img_process",
      "img_cotton",
    ]);
  });

  it("includes required preferred image ids that match an image title alias", () => {
    const candidates = getPresentationImageLibraryCandidates({
      enabled: true,
      count: 0,
      referenceLibraryItems: [
        imageItem(
          "img_18cc183c-a3f0-4650-aeac-bf2891738715",
          "img_f2248aa3-4a19-4053-8df4-36df2797e5c7"
        ),
      ],
      requiredImageIds: ["img_f2248aa3-4a19-4053-8df4-36df2797e5c7"],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      imageId: "img_18cc183c-a3f0-4650-aeac-bf2891738715",
      title: "img_f2248aa3-4a19-4053-8df4-36df2797e5c7",
    });
  });

  it("describes adaptive layout hints with image dimensions and aspect ratio", () => {
    const candidates = getPresentationImageLibraryCandidates({
      enabled: true,
      count: 1,
      referenceLibraryItems: [
        {
          ...imageItem("img_wide", "Wide process"),
          summary: "A detailed process diagram with multiple labeled steps and relationships.",
          structuredPayload: {
            version: "0.1-generated-image",
            imageId: "img_wide",
            mimeType: "image/png",
            prompt: "A detailed process diagram with multiple labeled steps and relationships.",
            widthPx: 1600,
            heightPx: 900,
            aspectRatio: 1.777,
            orientation: "landscape",
            presentationMeta: {
              version: "0.3-presentation-image-meta",
              visualBaseType: "information_visual",
              visibleSubjects: ["process diagram", "labeled steps"],
              embeddedTextItems: [
                { text: "Process", role: "title", location: "top_center" },
              ],
              relationships: [
                {
                  type: "sequence",
                  items: ["Plan", "Build"],
                  evidence: "The diagram shows labeled steps in order.",
                },
              ],
              composition: "document_or_display",
              semanticTags: ["process"],
            },
            createdAt: "2026-05-02T00:00:00.000Z",
          },
        },
      ],
    });

    const context = buildPresentationImageLibraryContext(candidates);

    expect(context).toContain("adaptiveVisualMain");
    expect(context).toContain("adaptiveTextMain");
    expect(context).toContain("closed allowlist");
    expect(context).toContain("Use only these exact Image IDs");
    expect(context).toContain("candidateImageIds in relevance order");
    expect(context).toContain("labels must be one-to-one");
    expect(context).toContain("Caption seed:");
    expect(context).toContain("Size: 1600x900");
    expect(context).toContain("Aspect ratio: 1.777");
    expect(context).toContain("Visual base type: information_visual");
    expect(context).toContain("Visible subjects: process diagram, labeled steps");
    expect(context).toContain("Relationships: sequence: Plan, Build");
    expect(context).toContain("Visual role hint:");
  });

  it("does not classify images from description keywords when LLM metadata is absent", () => {
    const candidates = getPresentationImageLibraryCandidates({
      enabled: true,
      count: 1,
      referenceLibraryItems: [
        {
          ...imageItem("img_field", "Cotton field photo"),
          structuredPayload: {
            version: "0.1-generated-image",
            imageId: "img_field",
            mimeType: "image/png",
            prompt:
              "A very detailed scene photo of a cotton field with sunlight, green leaves, white cotton bolls, natural atmosphere, realistic farm texture, and wide landscape composition.",
            widthPx: 1600,
            heightPx: 900,
            aspectRatio: 1.777,
            orientation: "landscape",
            createdAt: "2026-05-02T00:00:00.000Z",
          },
        },
      ],
    });

    const context = buildPresentationImageLibraryContext(candidates);

    expect(context).toContain("base=unknown");
    expect(context).toContain("decide visualMain/textMain only by matching");
    expect(context).not.toContain("photo_scene; can be visualMain");
    expect(context).not.toContain("Visual main potential");
  });

  it("uses saved presentation metadata as the primary PPT planning signal", () => {
    const candidates = getPresentationImageLibraryCandidates({
      enabled: true,
      count: 1,
      referenceLibraryItems: [
        {
          ...imageItem("img_store", "Organic cotton store"),
          structuredPayload: {
            version: "0.1-generated-image",
            imageId: "img_store",
            mimeType: "image/png",
            prompt: "Detailed visual prompt mentioning process-like merchandising.",
            description: "A store display photo of organic cotton products.",
            widthPx: 1200,
            heightPx: 900,
            aspectRatio: 1.333,
            orientation: "landscape",
            presentationMeta: {
              version: "0.3-presentation-image-meta",
              visualBaseType: "photo",
              visibleSubjects: ["retail store", "organic cotton clothing"],
              embeddedTextItems: [
                {
                  text: "Organic Cotton Collection",
                  role: "claim",
                  location: "bottom_left",
                },
              ],
              relationships: [],
              composition: "single_scene",
              semanticTags: ["store", "product"],
            },
            createdAt: "2026-05-02T00:00:00.000Z",
          },
        },
      ],
    });

    const context = buildPresentationImageLibraryContext(candidates);

    expect(context).toContain("Visual base type: photo");
    expect(context).toContain("Visible subjects: retail store, organic cotton clothing");
    expect(context).toContain("Semantic tags: store, product");
    expect(context).toContain("Embedded text items: Organic Cotton Collection (claim, bottom_left)");
    expect(context).toContain(
      "Caption seed: Organic Cotton Collection / retail store / organic cotton clothing / store / product"
    );
    expect(context).toContain("base=photo");
  });
});
