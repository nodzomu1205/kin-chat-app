import { describe, expect, it } from "vitest";
import { normalizePresentationVisualMainPolicy } from "@/lib/app/presentation/presentationPlanValidation";
import type { PresentationTaskSlideFrame } from "@/types/task";

describe("presentationPlanValidation title and layout cleanup", () => {
  it("keeps merged Japanese visual-only titles short enough for a one-line title slot", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "コットンの物理的加工と工程フロー",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "singleCenter",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: { type: "diagram", brief: "Process", preferredImageId: "img_process" },
          },
        ],
      },
      {
        slideNumber: 2,
        title: "サプライチェーンの情報・商流と循環フロー",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "singleCenter",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: { type: "diagram", brief: "Process", preferredImageId: "img_process" },
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].title.length).toBeLessThanOrEqual(28);
    expect(normalized[0].title).not.toContain("/");
  });

  it("keeps long slash-separated titles within the one-line title budget", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "コットンの物理的加工と工程フロー / サプライチェーンの情報・商流と循環フロー",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "leftRight50",
        blocks: [
          { id: "block1", kind: "list", styleId: "listCompact", items: ["A"] },
          { id: "block2", kind: "list", styleId: "listCompact", items: ["B"] },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0].title.length).toBeLessThanOrEqual(28);
    expect(normalized[0].title).not.toContain("/");
  });

  it("moves dense hero detail slides to a two-column detail layout", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Conclusion",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "heroTopDetailsBottom",
        blocks: [
          {
            id: "block1",
            kind: "textStack",
            styleId: "headlineCenter",
            text: "Sustainability requires traceable shared data",
          },
          {
            id: "block2",
            kind: "textStack",
            styleId: "textStackTopLeft",
            heading: "Main point",
            text: "This text is intentionally long enough to make the bottom detail row too dense for a shallow heroTopDetailsBottom layout.",
          },
          {
            id: "block3",
            kind: "list",
            styleId: "listCompact",
            heading: "Actions",
            items: ["Trace origin", "Share evidence", "Compare standards", "Reduce overlap"],
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0]).toMatchObject({
      layoutFrameId: "leftRight50",
      blocks: [{ id: "block2" }, { id: "block3" }],
    });
    expect(normalized[0].title.length).toBeLessThanOrEqual(28);
    expect(normalized[0].title).toContain("...");
  });
});
