import { describe, expect, it } from "vitest";
import {
  buildLibraryItemChatDisplayText,
  buildLibraryItemDriveExport,
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
    title: "テスト文書 [16chars].txt",
    subtitle: "取込文書 / transcript.txt",
    summary: "[0:00] 冒頭 [0:08] 説明",
    excerptText: "[0:00] 冒頭\n[0:08] 説明\n[0:16] 本文です",
    createdAt: "2026-04-18T00:00:00.000Z",
    updatedAt: "2026-04-18T00:00:00.000Z",
    filename: "transcript.txt",
    ...overrides,
  };
}

describe("buildLibraryItemChatDisplayText", () => {
  it("renders content blocks without putting the title or filename at the top", () => {
    const text = buildLibraryItemChatDisplayText(createLibraryItem());

    expect(text).toContain("Summary:\n冒頭 説明");
    expect(text).toContain("Detail:\n冒頭 説明 本文です");
    expect(text).not.toContain("[0:00]");
    expect(text).not.toContain("Library:");
    expect(text).not.toContain("テスト文書");
    expect(text).not.toContain("transcript.txt");
  });
});

describe("normalizeLibraryChatDisplayText", () => {
  it("drops legacy library headers and filename-like first blocks", () => {
    const text = normalizeLibraryChatDisplayText(
      [
        "Library: テスト文書 [16chars].txt",
        "",
        "transcript.txt",
        "",
        "Summary:\n[0:00] 冒頭 [0:08] 説明",
        "",
        "Detail:\n[0:00] 冒頭\n[0:08] 説明\n[0:16] 本文です",
      ].join("\n")
    );

    expect(text).toContain("Summary:\n冒頭 説明");
    expect(text).toContain("Detail:\n冒頭 説明 本文です");
    expect(text).not.toContain("[0:00]");
    expect(text).not.toContain("Library:");
    expect(text).not.toContain("transcript.txt");
  });
});

describe("buildLibraryItemDriveExport", () => {
  it("reuses the library filename instead of appending a new export suffix", () => {
    const exported = buildLibraryItemDriveExport(
      createLibraryItem({
        title: "Transcript",
        filename: "Transcript [16chars].txt",
        excerptText: "alpha beta gamma",
        summary: "alpha beta",
      })
    );

    expect(exported.fileName).toBe("Transcript [16chars].txt");
  });
});
