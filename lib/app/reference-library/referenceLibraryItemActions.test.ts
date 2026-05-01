import { describe, expect, it } from "vitest";
import {
  buildLibraryItemChatDisplayText,
  buildLibraryItemDriveExport,
  normalizeLibraryChatDisplayText,
} from "@/lib/app/reference-library/referenceLibraryItemActions";
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

  it("exports presentation library items as raw JSON", () => {
    const exported = buildLibraryItemDriveExport(
      createLibraryItem({
        artifactType: "presentation",
        filename: "pres_1.presentation.json",
        excerptText: JSON.stringify({
          kind: "kin.presentation",
          version: "0.1",
          documentId: "pres_1",
          status: "draft",
          spec: {
            version: "0.1",
            title: "Project deck",
            slides: [{ type: "title", title: "Project deck" }],
          },
          patches: [],
          outputs: [],
          previewText: "Slides: 1",
          summary: "Project deck",
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z",
        }),
      })
    );

    expect(exported.fileName).toBe("pres_1.presentation.json");
    expect(exported.mimeType).toBe("application/json");
    expect(JSON.parse(exported.text)).toMatchObject({
      kind: "kin.presentation",
      documentId: "pres_1",
    });
  });

  it("exports generated image cards as the visible card text", () => {
    const exported = buildLibraryItemDriveExport(
      createLibraryItem({
        artifactType: "generated_image",
        title: "Image",
        subtitle: "Image ID: img_123",
        filename: "img_123.txt",
        excerptText: "Image ID: img_123\nPrompt:\nPrompt text",
        structuredPayload: {
          version: "0.1-generated-image",
          imageId: "img_123",
          mimeType: "image/png",
          base64: "abc",
          prompt: "Prompt text",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      })
    );

    expect(exported.fileName).toBe("img_123.txt");
    expect(exported.mimeType).toBeUndefined();
    expect(exported.text).toBe("Image ID: img_123\nPrompt:\nPrompt text");
  });
});
