import { describe, expect, it } from "vitest";
import {
  buildPresentationFrameIndexText,
  buildPresentationFrameJsonText,
  findPresentationFrameRegistryEntry,
  getPresentationFrameRegistryEntries,
} from "@/lib/app/presentation/presentationFrameRegistry";

describe("presentationFrameRegistry", () => {
  it("lists master, layout, bookend, and block style frames from the live registry", () => {
    const entries = getPresentationFrameRegistryEntries();

    expect(entries.some((entry) => entry.id === "titleLineFooter")).toBe(true);
    expect(entries.some((entry) => entry.id === "visualLeftTextRight")).toBe(true);
    expect(entries.some((entry) => entry.id === "titleCover")).toBe(true);
    expect(entries.some((entry) => entry.id === "visualContain")).toBe(true);
  });

  it("builds a registry index with IDs and descriptions", () => {
    const text = buildPresentationFrameIndexText();

    expect(text).toContain("PPT frame registry index.");
    expect(text).toContain("Master frames");
    expect(text).toContain("Layout frames");
    expect(text).toContain("Bookend frames");
    expect(text).toContain("Block styles");
    expect(text).toContain("titleLineFooter");
    expect(text).toContain("visualLeftTextRight");
    expect(text).toContain("titleCover");
    expect(text).toContain("Blocks: block1, block2.");
  });

  it("returns stored JSON for a frame", () => {
    expect(findPresentationFrameRegistryEntry("titleLineFooter")).toMatchObject({
      kind: "master",
      id: "titleLineFooter",
      builtIn: true,
    });

    const text = buildPresentationFrameJsonText("titleLineFooter");
    expect(text).toContain("PPT frame JSON: titleLineFooter");
    expect(text).toContain('"kind": "master"');
    expect(text).toContain('"builtIn": true');
  });

  it("returns a helpful message for unknown frames", () => {
    const text = buildPresentationFrameJsonText("missingFrame");

    expect(text).toContain("PPT frame not found: missingFrame");
    expect(text).toContain("PPT frames: Show index");
  });
});
