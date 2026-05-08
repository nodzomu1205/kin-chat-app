import { describe, expect, it } from "vitest";
import { normalizePresentationVisualMainPolicy } from "@/lib/app/presentation/presentationPlanValidation";
import type { PresentationTaskSlideFrame } from "@/types/task";

describe("presentationPlanValidation adaptive visual layout", () => {
  it("converts visualMain slides to adaptive visual layout with concise annotation", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Visual evidence",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "visualLeftTextRight",
        slideRole: "visualMain",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "photo",
              brief: "Evidence photo",
              preferredImageId: "img_evidence",
            },
          },
          {
            id: "block2",
            kind: "callout",
            styleId: "callout",
            text: "Focus on the visible bottleneck.",
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0]).toMatchObject({
      layoutFrameId: "adaptiveVisualMain",
      slideRole: "visualMain",
      layoutIntent: {
        primaryImageId: "img_evidence",
        textPlacement: "right",
        notePolicy: "shortAnnotation",
      },
      blocks: [{ id: "block1" }, { id: "block2" }],
    });
  });

  it("adds a text-only annotation when adaptive visual-main has only a visual block", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "荻窪の住みやすさと家族向け魅力",
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
              brief: "荻窪駅周辺",
            },
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0]).toMatchObject({
      layoutFrameId: "adaptiveVisualMain",
      slideRole: "visualMain",
      layoutIntent: {
        notePolicy: "shortAnnotation",
      },
      blocks: [
        { id: "block1" },
        {
          id: "annotation",
          kind: "textStack",
          styleId: "textStackTopLeft",
          text: "荻窪の住みやすさと家族向け魅力は、交通・買い物などの利便性と落ち着いた住環境のバランスが、日常生活のしやすさにつながります。",
          renderStyle: { showHeading: false },
        },
      ],
    });
  });

  it("keeps all visual blocks selectable and normalizes annotation to text only", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Area",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "adaptiveVisualMain",
        slideRole: "visualMain",
        blocks: [
          {
            id: "visual1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: { type: "photo", brief: "Station" },
          },
          {
            id: "visual2",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: { type: "photo", brief: "Residential street" },
          },
          {
            id: "notes",
            kind: "list",
            styleId: "listCompact",
            heading: "Area",
            text: "Station access helps.",
            items: ["Hidden item."],
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0].blocks.map((block) => block.id)).toEqual([
      "visual1",
      "visual2",
      "notes",
    ]);
    expect(normalized[0].blocks[2]).toMatchObject({
      kind: "textStack",
      styleId: "textStackTopLeft",
      text: "Station access helps.",
      renderStyle: { showHeading: false },
    });
    expect(normalized[0].blocks[2].heading).toBeUndefined();
    expect(normalized[0].blocks[2].items).toBeUndefined();
  });

  it("infers adaptive visual layout from legacy visual-left frames with diagrams", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "Supply chain map",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "visualLeftTextRight",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "diagram",
              brief: "Supply chain process diagram with labels",
              preferredImageId: "img_flow",
            },
          },
          {
            id: "block2",
            kind: "callout",
            styleId: "callout",
            text: "Follow the three major phases.",
          },
        ],
      },
    ];

    const normalized = normalizePresentationVisualMainPolicy(frames);

    expect(normalized[0]).toMatchObject({
      layoutFrameId: "adaptiveVisualMain",
      slideRole: "visualMain",
      layoutIntent: {
        primaryImageId: "img_flow",
        textPlacement: "right",
        notePolicy: "shortAnnotation",
      },
      blocks: [{ id: "block1" }, { id: "block2" }],
    });
  });
});
