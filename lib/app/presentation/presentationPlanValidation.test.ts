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

  it("keeps dense text on normal photo slides even if they were marked visualMain", () => {
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

    expect(normalized[0]).toMatchObject({
      layoutFrameId: "adaptiveTextMain",
      slideRole: "textMain",
      blocks: [{ id: "block2" }, { id: "block1" }],
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

  it("selects visual cover and avoids duplicate summary closing when final body slide is already a summary", () => {
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
        visualRequest: {
          brief: "Deckの表紙イメージ",
          labels: ["表紙イメージ"],
        },
      },
      closingSlide: {
        frameId: "endSlide",
        title: "- END -",
        message: "Thank you",
        nextSteps: undefined,
      },
    });
    expect(synced?.openingSlide?.visualRequest?.preferredImageId).toBeUndefined();
    expect(synced?.openingSlide?.visualRequest?.prompt).not.toBe("Representative cotton photo");
  });

  it("does not let a summary closing reuse one body slide heading as its title", () => {
    const synced = syncDeckFrameSlideCount(
      {
        slideCount: 2,
        masterFrameId: "titleLineFooter",
        closingSlide: {
          enabled: true,
          frameId: "summaryClosing",
          title: "Market scale and growth",
        },
      },
      [
        {
          slideNumber: 1,
          title: "Structure overview",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "adaptiveTextMain",
          blocks: [
            {
              id: "block1",
              kind: "textStack",
              styleId: "textStackTopLeft",
              heading: "Three phases",
              text: "Shows the full structure.",
            },
          ],
        },
        {
          slideNumber: 2,
          title: "Japan market",
          masterFrameId: "titleLineFooter",
          layoutFrameId: "adaptiveTextMain",
          blocks: [
            {
              id: "block1",
              kind: "list",
              styleId: "listCompact",
              heading: "Market scale and growth",
              items: ["Market expansion", "Environmental shift", "E-commerce"],
            },
          ],
        },
      ]
    );

    expect(synced?.closingSlide?.title).toBe("\u5168\u4f53\u307e\u3068\u3081");
  });

  it("creates a cover-specific opening visual instead of copying the first body slide visual", () => {
    const frames: PresentationTaskSlideFrame[] = [
      {
        slideNumber: 1,
        title: "東京都中央区の住みやすさ",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "adaptiveTextMain",
        blocks: [
          { id: "block1", kind: "list", styleId: "listCompact", items: ["交通利便性"] },
          {
            id: "block2",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "photo",
              brief: "中央区の街並み",
              prompt: "東京都中央区のビル群と交通機関の俯瞰写真。",
              labels: ["中央区の街並み"],
            },
          },
        ],
      },
      {
        slideNumber: 2,
        title: "荻窪駅周辺の生活環境",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "adaptiveTextMain",
        blocks: [
          { id: "block1", kind: "list", styleId: "listCompact", items: ["商店街"] },
        ],
      },
    ];

    const deckFrame = syncDeckFrameSlideCount(
      {
        slideCount: 2,
        masterFrameId: "titleLineFooter",
        openingSlide: {
          enabled: true,
          frameId: "titleCover",
          title: "東京都内の住みやすい地域ランキング",
        },
      },
      frames
    );

    expect(deckFrame?.openingSlide?.frameId).toBe("visualTitleCover");
    expect(deckFrame?.openingSlide?.visualRequest?.prompt).toContain("表紙用ワイドビジュアル");
    expect(deckFrame?.openingSlide?.visualRequest?.prompt).not.toBe(
      "東京都中央区のビル群と交通機関の俯瞰写真。"
    );
    expect(deckFrame?.openingSlide?.visualRequest?.labels).toEqual(["表紙イメージ"]);
    expect(deckFrame?.openingSlide?.visualRequest?.visualSlots?.[0]).toMatchObject({
      slotId: "openingCover",
      label: "表紙イメージ",
    });
  });
});


