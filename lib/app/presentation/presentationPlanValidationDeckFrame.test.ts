import { describe, expect, it } from "vitest";
import { syncDeckFrameSlideCount } from "@/lib/app/presentation/presentationPlanValidation";
import type { PresentationTaskSlideFrame } from "@/types/task";

describe("presentationPlanValidation deck frame", () => {
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
