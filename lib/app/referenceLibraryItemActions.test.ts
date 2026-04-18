import { describe, expect, it } from "vitest";
import {
  buildLibraryItemChatDisplayText,
  normalizeLibraryChatDisplayText,
} from "@/lib/app/referenceLibraryItemActions";
import type { ReferenceLibraryItem } from "@/types/chat";

function createLibraryItem(
  overrides: Partial<ReferenceLibraryItem> = {}
): ReferenceLibraryItem {
  return {
    id: "doc:test",
    sourceId: "test",
    itemType: "ingested_file",
    title: "テスト文書",
    subtitle: "取込 / transcript.txt",
    summary: "[0:00] 要点 [0:08] 補足",
    excerptText: "[0:00] 要点\n[0:08] 補足\n[0:16] まとめ",
    createdAt: "2026-04-18T00:00:00.000Z",
    updatedAt: "2026-04-18T00:00:00.000Z",
    filename: "transcript.txt",
    ...overrides,
  };
}

describe("buildLibraryItemChatDisplayText", () => {
  it("removes transcript timestamps from summary and detail blocks", () => {
    const text = buildLibraryItemChatDisplayText(createLibraryItem());

    expect(text).toContain("Summary:\n要点 補足");
    expect(text).toContain("Detail:\n要点 補足 まとめ");
    expect(text).not.toContain("[0:00]");
    expect(text).not.toContain("[0:08]");
  });
});

describe("normalizeLibraryChatDisplayText", () => {
  it("normalizes existing library chat messages without rebuilding the item", () => {
    const text = normalizeLibraryChatDisplayText(
      [
        "Library: テスト文書",
        "",
        "Summary:\n[0:00] 要点 [0:08] 補足",
        "",
        "Detail:\n[0:00] 要点\n[0:08] 補足\n[0:16] まとめ",
      ].join("\n")
    );

    expect(text).toContain("Summary:\n要点 補足");
    expect(text).toContain("Detail:\n要点 補足 まとめ");
    expect(text).not.toContain("[0:00]");
  });
});
