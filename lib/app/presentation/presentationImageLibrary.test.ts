import { describe, expect, it } from "vitest";
import { getPresentationImageLibraryCandidates } from "@/lib/app/presentation/presentationImageLibrary";
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
});
