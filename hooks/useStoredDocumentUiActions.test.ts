import { describe, expect, it } from "vitest";
import {
  getStoredDocumentDownloadImagePayload,
  resolveStoredDocumentTextDownloadFileName,
} from "@/hooks/useStoredDocumentUiActions";
import type { StoredDocument } from "@/types/chat";

function createStoredDocument(
  overrides: Partial<StoredDocument> = {}
): StoredDocument {
  return {
    id: "doc-1",
    sourceType: "ingested_file",
    title: "Imported image description",
    filename: "Imported image description.txt",
    text: "A textile factory photo description.",
    charCount: 36,
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z",
    ...overrides,
  };
}

describe("getStoredDocumentDownloadImagePayload", () => {
  it("does not treat a normal library text document as an image download", () => {
    const payload = {
      version: "0.1-generated-image",
      imageId: "img_imported",
      mimeType: "image/png",
      prompt: "Describe this image",
      createdAt: "2026-05-04T00:00:00.000Z",
    };

    const result = getStoredDocumentDownloadImagePayload(
      createStoredDocument({ structuredPayload: payload })
    );

    expect(result).toBeNull();
  });

  it("returns the image payload only for image library documents", () => {
    const payload = {
      version: "0.1-generated-image",
      imageId: "img_saved",
      mimeType: "image/png",
      prompt: "A generated image",
      createdAt: "2026-05-04T00:00:00.000Z",
    } as const;

    const result = getStoredDocumentDownloadImagePayload(
      createStoredDocument({
        artifactType: "generated_image",
        structuredPayload: payload,
      })
    );

    expect(result).toBe(payload);
  });
});

describe("resolveStoredDocumentTextDownloadFileName", () => {
  it("downloads imported image descriptions as text files", () => {
    expect(
      resolveStoredDocumentTextDownloadFileName(
        createStoredDocument({ filename: "factory-line.png" })
      )
    ).toBe("factory-line.txt");
  });

  it("keeps existing text-like filenames", () => {
    expect(
      resolveStoredDocumentTextDownloadFileName(
        createStoredDocument({ filename: "factory-line [120chars].txt" })
      )
    ).toBe("factory-line [120chars].txt");
  });
});
