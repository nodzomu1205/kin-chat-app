import { describe, expect, it } from "vitest";
import { normalizePresentationVisualMainPolicy } from "@/lib/app/presentation/presentationPlanValidation";
import type { PresentationTaskSlideFrame } from "@/types/task";

describe("presentationPlanValidation repeated visuals", () => {
  it("prevents repeated main visuals from regrowing into duplicate text slides", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Process chart",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "singleCenter",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "diagram",
              brief: "Detailed process chart",
              preferredImageId: "img_process",
            },
          },
        ],
      },
      {
        slideNumber: 2,
        title: "Repeated explanation",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "visualLeftTextRight",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "diagram",
              brief: "Same detailed process chart",
              preferredImageId: "img_process",
            },
          },
          {
            id: "block2",
            kind: "textStack",
            styleId: "textStackTopLeft",
            heading: "Duplicated process explanation",
            text: "This repeats the process chart content instead of adding a short annotation.",
            items: ["Repeated step one", "Repeated step two"],
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[1]).toMatchObject({
      layoutFrameId: "singleCenter",
      blocks: [
        {
          id: "block1",
          visualRequest: { preferredImageId: "img_process" },
        },
      ],
    });
  });

  it("keeps repeated visuals when the neighbor is only a short annotation", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Process chart",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "singleCenter",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "diagram",
              brief: "Detailed process chart",
              preferredImageId: "img_process",
            },
          },
        ],
      },
      {
        slideNumber: 2,
        title: "Focused annotation",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "visualLeftTextRight",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "diagram",
              brief: "Same detailed process chart",
              preferredImageId: "img_process",
            },
          },
          {
            id: "block2",
            kind: "callout",
            styleId: "callout",
            text: "Focus on traceability.",
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[1].layoutFrameId).toBe("adaptiveVisualMain");
    expect(normalized[1].slideRole).toBe("visualMain");
    expect(normalized[1].blocks).toHaveLength(2);
  });

  it("merges consecutive visual-only frames that show the same main image", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Physical process flow",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "singleCenter",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "diagram",
              brief: "Process",
              preferredImageId: "img_process",
            },
          },
        ],
      },
      {
        slideNumber: 2,
        title: "Information and circular flow",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "singleCenter",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "diagram",
              brief: "Process",
              preferredImageId: "img_process",
            },
          },
        ],
      },
      {
        slideNumber: 3,
        title: "Certification",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "leftRight50",
        blocks: [
          { id: "block1", kind: "list", styleId: "listCompact", items: ["A"] },
          { id: "block2", kind: "list", styleId: "listCompact", items: ["B"] },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({
      slideNumber: 1,
      layoutFrameId: "singleCenter",
    });
    expect(normalized[0].title.length).toBeLessThanOrEqual(28);
    expect(normalized[1]).toMatchObject({
      slideNumber: 2,
      title: "Certification",
    });
  });
});
