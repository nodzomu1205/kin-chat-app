import { describe, expect, it } from "vitest";
import {
  buildLibraryItemEditDraftCommand,
  insertImageIdIntoGptDraft,
  resolveLibraryItemImageId,
} from "@/lib/app/reference-library/libraryDraftCommands";
import type { ReferenceLibraryItem } from "@/types/chat";

const baseItem: ReferenceLibraryItem = {
  id: "item-1",
  sourceId: "doc-1",
  itemType: "kin_created",
  title: "Title",
  subtitle: "Document ID: task_20260507142134_q4mtp6",
  summary: "summary",
  excerptText: "text",
  createdAt: "2026-05-07T00:00:00.000Z",
  updatedAt: "2026-05-07T00:00:00.000Z",
};

describe("libraryDraftCommands", () => {
  it("builds task edit drafts from task snapshot cards", () => {
    expect(
      buildLibraryItemEditDraftCommand({
        ...baseItem,
        artifactType: "task_snapshot",
      })
    ).toBe("/task\nDocument ID: task_20260507142134_q4mtp6\n");
  });

  it("builds ppt edit drafts from presentation plan cards", () => {
    expect(
      buildLibraryItemEditDraftCommand({
        ...baseItem,
        artifactType: "presentation_plan",
        subtitle: "Document ID: ppt_moviazhi_f760x1",
      })
    ).toBe("/ppt\nDocument ID: ppt_moviazhi_f760x1\n");
  });

  it("resolves generated image ids from structured payloads", () => {
    expect(
      resolveLibraryItemImageId({
        ...baseItem,
        artifactType: "generated_image",
        subtitle: "Image ID: img_fallback",
        structuredPayload: {
          version: "0.1-generated-image",
          imageId: "img_selected",
          mimeType: "image/png",
          prompt: "prompt",
          createdAt: "2026-05-07T00:00:00.000Z",
        },
      })
    ).toBe("img_selected");
  });

  it("inserts an image id into the latest blank visual selection line", () => {
    expect(
      insertImageIdIntoGptDraft(
        [
          "/ppt",
          "Document ID: ppt_123",
          "Resolve visuals",
          "Slide 2 / block 1: img_old",
          "Slide 3 / block 2:",
        ].join("\n"),
        "img_new"
      )
    ).toBe(
      [
        "/ppt",
        "Document ID: ppt_123",
        "Resolve visuals",
        "Slide 2 / block 1: img_old",
        "Slide 3 / block 2: img_new",
      ].join("\n")
    );
  });

  it("inserts an image id into the latest blank slot-level visual selection line", () => {
    expect(
      insertImageIdIntoGptDraft(
        [
          "/ppt",
          "Document ID: ppt_123",
          "Resolve visuals",
          "Opening slide / visual / slot 1: img_cover",
          "Slide 3 / block 2 / slot 1:",
        ].join("\n"),
        "img_new"
      )
    ).toBe(
      [
        "/ppt",
        "Document ID: ppt_123",
        "Resolve visuals",
        "Opening slide / visual / slot 1: img_cover",
        "Slide 3 / block 2 / slot 1: img_new",
      ].join("\n")
    );
  });
});
