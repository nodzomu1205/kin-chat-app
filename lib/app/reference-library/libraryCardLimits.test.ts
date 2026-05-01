import { describe, expect, it } from "vitest";
import { resolveLibraryCardLimitDeletionIds } from "@/lib/app/reference-library/libraryCardLimits";
import type { ReferenceLibraryItem } from "@/types/chat";

function item(
  id: string,
  artifactType?: ReferenceLibraryItem["artifactType"]
): ReferenceLibraryItem {
  return {
    id,
    sourceId: id.replace("item:", "doc:"),
    itemType: "ingested_file",
    artifactType,
    title: id,
    subtitle: "",
    summary: "",
    excerptText: "",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  };
}

describe("resolveLibraryCardLimitDeletionIds", () => {
  it("deletes overflow cards from the bottom of each library view", () => {
    expect(
      resolveLibraryCardLimitDeletionIds({
        items: [
          item("item:normal-top"),
          item("item:image-top", "generated_image"),
          item("item:normal-bottom"),
          item("item:image-bottom", "generated_image"),
        ],
        libraryCardLimit: 1,
        imageLibraryCardLimit: 1,
      })
    ).toEqual(["doc:normal-bottom", "doc:image-bottom"]);
  });

  it("uses current item order instead of timestamps", () => {
    expect(
      resolveLibraryCardLimitDeletionIds({
        items: [item("item:pinned-old"), item("item:newer-below")],
        libraryCardLimit: 1,
        imageLibraryCardLimit: 10,
      })
    ).toEqual(["doc:newer-below"]);
  });
});
