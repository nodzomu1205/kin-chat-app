import { describe, expect, it } from "vitest";
import { normalizePresentationVisualMainPolicy } from "@/lib/app/presentation/presentationPlanValidation";
import type { PresentationTaskSlideFrame } from "@/types/task";

describe("presentationPlanValidation adaptive text layout", () => {
  it("keeps dense text as adaptive text-main instead of thinning it into a visual annotation", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Livable Tokyo areas",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "adaptiveVisualMain",
        slideRole: "visualMain",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "photo",
              brief: "Tokyo neighborhood photo",
              preferredImageId: "img_tokyo",
              candidateImageIds: ["img_tokyo"],
            },
          },
          {
            id: "block2",
            kind: "list",
            styleId: "listCompact",
            heading: "Education and livability",
            text: "Preserve the original slide body when selected photos are hydrated.",
            items: ["School access", "Safety", "Commute", "Rent"],
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0].layoutFrameId).toBe("adaptiveTextMain");
    expect(normalized[0].slideRole).toBe("textMain");
    expect(normalized[0].blocks.map((block) => block.id)).toEqual(["block2", "block1"]);
    expect(normalized[0].blocks[0]).toMatchObject({
      kind: "list",
      styleId: "listCompact",
      heading: "Education and livability",
      text: "Preserve the original slide body when selected photos are hydrated.",
      items: ["School access", "Safety", "Commute", "Rent"],
    });
  });

  it("infers adaptive text layout from legacy visual-left frames with ordinary photos", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Supply chain structure",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "visualLeftTextRight",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "photo",
              brief: "Textile factory",
              preferredImageId: "img_factory",
            },
          },
          {
            id: "block2",
            kind: "textStack",
            styleId: "textStackTopLeft",
            heading: "Three phases",
            text: "Introduce the major process phases from upstream to downstream.",
            items: ["Upstream", "Midstream", "Downstream"],
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0]).toMatchObject({
      layoutFrameId: "adaptiveTextMain",
      slideRole: "textMain",
      layoutIntent: {
        primaryImageId: "img_factory",
        visualPlacement: "right",
      },
      blocks: [{ id: "block2" }, { id: "block1" }],
    });
  });

  it("converts textMain slides to adaptive text layout with supporting visuals", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Key message",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "textLeftVisualRight",
        slideRole: "textMain",
        blocks: [
          {
            id: "block1",
            kind: "textStack",
            styleId: "textStackTopLeft",
            heading: "Message",
            text: "The program should focus on traceability first.",
          },
          {
            id: "block2",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "photo",
              brief: "Related field photo",
              preferredImageId: "img_field",
            },
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0]).toMatchObject({
      layoutFrameId: "adaptiveTextMain",
      slideRole: "textMain",
      layoutIntent: {
        primaryImageId: "img_field",
        visualPlacement: "right",
      },
      blocks: [{ id: "block1" }, { id: "block2" }],
    });
  });

  it("infers adaptive text layout from legacy text-left frames with supporting images", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Market message",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "textLeftVisualRight",
        blocks: [
          {
            id: "block1",
            kind: "textStack",
            styleId: "textStackTopLeft",
            heading: "Growth context",
            text: "Demand is expanding because transparent sustainable products are easier to evaluate.",
          },
          {
            id: "block2",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "photo",
              brief: "Retail display",
              preferredImageId: "img_store",
            },
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0]).toMatchObject({
      layoutFrameId: "adaptiveTextMain",
      slideRole: "textMain",
      layoutIntent: {
        primaryImageId: "img_store",
        visualPlacement: "right",
      },
      blocks: [{ id: "block1" }, { id: "block2" }],
    });
  });
});
