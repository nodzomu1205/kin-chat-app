import { describe, expect, it } from "vitest";
import {
  normalizePresentationVisualMainPolicy,
  syncDeckFrameSlideCount,
} from "@/lib/app/presentation/presentationPlanValidation";
import type { PresentationTaskSlideFrame } from "@/types/task";

describe("presentationPlanValidation", () => {
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

    expect(normalized[1].layoutFrameId).toBe("visualLeftTextRight");
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
            visualRequest: { type: "diagram", preferredImageId: "img_process" },
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
            visualRequest: { type: "diagram", preferredImageId: "img_process" },
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

  it("syncs deck frame slide count after frame normalization", () => {
    const synced = syncDeckFrameSlideCount(
      { slideCount: 5, masterFrameId: "titleLineFooter" },
      [
        {
          slideNumber: 1,
          title: "A",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "singleCenter",
          blocks: [
            { id: "block1", kind: "callout", styleId: "callout", text: "A" },
          ],
        },
        {
          slideNumber: 2,
          title: "B",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "singleCenter",
          blocks: [
            { id: "block1", kind: "callout", styleId: "callout", text: "B" },
          ],
        },
      ]
    );

    expect(synced?.slideCount).toBe(2);
  });

  it("selects visual cover and summary closing bookends from body slide evidence", () => {
    const synced = syncDeckFrameSlideCount(
      {
        slideCount: 5,
        masterFrameId: "titleLineFooter",
        pageNumber: { enabled: true, position: "bottomRight" },
        openingSlide: { enabled: true, frameId: "titleCover", title: "Deck" },
        closingSlide: { enabled: true, frameId: "endSlide", title: "- END -" },
      },
      [
        {
          slideNumber: 1,
          title: "Opening body",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "visualLeftTextRight",
          blocks: [
            {
              id: "block1",
              kind: "visual",
              styleId: "visualContain",
              visualRequest: {
                type: "photo",
                brief: "Representative cotton photo",
                preferredImageId: "img_cotton",
              },
            },
            { id: "block2", kind: "callout", styleId: "callout", text: "Intro" },
          ],
        },
        {
          slideNumber: 2,
          title: "Future priorities",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "leftRight50",
          blocks: [
            {
              id: "block1",
              kind: "textStack",
              styleId: "textStackTopLeft",
              heading: "Summary",
              text: "A longer summary paragraph that closes the deck and explains why traceability, producer support, and recycling matter together.",
            },
            {
              id: "block2",
              kind: "list",
              styleId: "listCompact",
              heading: "Next priorities",
              items: ["Traceability", "Producer support", "Circular reuse"],
            },
          ],
        },
      ]
    );

    expect(synced).toMatchObject({
      slideCount: 2,
      pageNumber: { scope: "bodyOnly" },
      openingSlide: {
        frameId: "visualTitleCover",
        visualRequest: { preferredImageId: "img_cotton" },
      },
      closingSlide: {
        frameId: "summaryClosing",
        title: "Next priorities",
        nextSteps: ["Traceability", "Producer support", "Circular reuse"],
      },
    });
  });
});
