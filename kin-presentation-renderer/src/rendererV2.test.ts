import { describe, expect, it } from "vitest";
import {
  buildUnresolvedVisualFallbackText,
  resolveAdaptiveTextMainBoxes,
  resolveAdaptiveVisualMainBoxes
} from "./rendererV2.js";

const contentBox = { x: 0.62, y: 1.34, w: 12.093, h: 5.46 };

describe("rendererV2 adaptive layouts", () => {
  it("places a portrait main visual top-left and leaves right annotation space", () => {
    const boxes = resolveAdaptiveVisualMainBoxes(contentBox, 0.67, true, "right");

    expect(boxes.visual.x).toBe(contentBox.x);
    expect(boxes.visual.y).toBe(contentBox.y);
    expect(boxes.visual.h).toBeCloseTo(contentBox.h, 2);
    expect(boxes.visual.w).toBeLessThan(contentBox.w * 0.5);
    expect(boxes.annotation?.x).toBeGreaterThan(boxes.visual.x + boxes.visual.w);
    expect(boxes.annotation?.h).toBeCloseTo(boxes.visual.h, 2);
  });

  it("places a wide main visual top-left and leaves bottom-right annotation space", () => {
    const boxes = resolveAdaptiveVisualMainBoxes(contentBox, 3.0, true, "bottomRight");

    expect(boxes.visual.x).toBe(contentBox.x);
    expect(boxes.visual.y).toBe(contentBox.y);
    expect(boxes.visual.w).toBeCloseTo(contentBox.w, 2);
    expect(boxes.visual.h).toBeLessThan(contentBox.h);
    expect(boxes.annotation?.y).toBeGreaterThan(boxes.visual.y + boxes.visual.h);
  });

  it("uses the right side for dense text-main slides with multiple visuals", () => {
    const boxes = resolveAdaptiveTextMainBoxes(
      contentBox,
      {
        id: "block1",
        kind: "textStack",
        styleId: "textStackTopLeft",
        text: "A".repeat(220)
      },
      2,
      "rightGrid"
    );

    expect(boxes.text.x).toBe(contentBox.x);
    expect(boxes.text.w).toBeGreaterThan(contentBox.w * 0.5);
    expect(boxes.visuals).toHaveLength(2);
    expect(boxes.visuals[0].x).toBeGreaterThan(boxes.text.x + boxes.text.w);
    expect(boxes.visuals[1].y).toBeGreaterThan(boxes.visuals[0].y);
  });

  it("keeps bottom-grid visuals below the estimated rendered text height", () => {
    const boxes = resolveAdaptiveTextMainBoxes(
      contentBox,
      {
        id: "block1",
        kind: "list",
        styleId: "listCompact",
        heading: "代表的な加工工程の紹介",
        text: "川中・川下の工程は紡績や染色、縫製など多岐にわたる。",
        items: [
          "ジンニング（種子と繊維の分離）: 機械による綿繰り工程。",
          "紡績: 糸に加工する工程。",
          "織布・編立: 糸を織って生地にする工程。",
          "染色・仕上げ: 生地の色付けや質感の調整。",
          "縫製: 生地を衣服などの製品に仕立てる。"
        ]
      },
      3,
      "rightGrid",
      [1.777, 1.777, 1.777]
    );

    expect(boxes.visuals).toHaveLength(3);
    for (const visual of boxes.visuals) {
      expect(visual.y).toBeGreaterThanOrEqual(boxes.text.y + boxes.text.h);
    }
    expect(boxes.text.h).toBeGreaterThan(2.1);
  });

  it("moves short text above multiple landscape visuals when that uses space better", () => {
    const boxes = resolveAdaptiveTextMainBoxes(
      contentBox,
      {
        id: "block1",
        kind: "textStack",
        styleId: "textStackTopLeft",
        text: "Short message."
      },
      2,
      undefined,
      [1.8, 1.6]
    );

    expect(boxes.text.w).toBeCloseTo(contentBox.w, 2);
    expect(boxes.visuals).toHaveLength(2);
    expect(boxes.visuals[0].y).toBeGreaterThan(boxes.text.y + boxes.text.h);
    expect(boxes.visuals[1].x).toBeGreaterThan(boxes.visuals[0].x);
  });

  it("keeps the unresolved visual block address visible for later replacement", () => {
    const text = buildUnresolvedVisualFallbackText({
      id: "block5",
      kind: "visual",
      styleId: "visualContain",
      visualRequest: {
        type: "photo",
        brief: "Factory detail still needs a matching library image"
      }
    });

    expect(text).toContain("Unresolved visual: block5");
    expect(text).toContain("Factory detail");
  });
});
