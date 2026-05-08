import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  buildUnresolvedVisualFallbackText,
  resolveAdaptiveTextMainBoxes,
  resolveAdaptiveVisualMainBoxes,
  resolveAdaptiveVisualMainMultiVisualBoxes,
  resolveVisualImageBox
} from "./rendererV2.js";
import { renderFramePresentationToFile } from "./renderer.js";

const contentBox = { x: 0.62, y: 1.34, w: 12.093, h: 5.46 };
const onePixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw9kngAAAABJRU5ErkJggg==";

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

  it("reserves right annotation space for landscape visual-main slides when requested", () => {
    const boxes = resolveAdaptiveVisualMainBoxes(contentBox, 1.8, true, "right");

    expect(boxes.visual.x).toBe(contentBox.x);
    expect(boxes.visual.y).toBe(contentBox.y);
    expect(boxes.annotation?.x).toBeGreaterThan(boxes.visual.x + boxes.visual.w);
    expect(boxes.annotation?.w).toBeGreaterThanOrEqual(2.25);
    expect(boxes.visual.w).toBeLessThan(contentBox.w - boxes.annotation!.w);
  });

  it("keeps multiple visual-main images inside the adaptive visual area", () => {
    const boxes = resolveAdaptiveVisualMainMultiVisualBoxes(
      contentBox,
      3,
      [1.7, 1.6, 1.8]
    );

    expect(boxes).toHaveLength(3);
    boxes.forEach((box) => {
      expect(box.x).toBeGreaterThanOrEqual(contentBox.x);
      expect(box.y).toBeGreaterThanOrEqual(contentBox.y);
      expect(box.x + box.w).toBeLessThanOrEqual(contentBox.x + contentBox.w + 0.001);
      expect(box.y + box.h).toBeLessThanOrEqual(contentBox.y + contentBox.h + 0.001);
    });
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
    expect(boxes[2].x).toBeGreaterThan(boxes[1].x);
  });

  it("top-aligns contained body images instead of centering them vertically", () => {
    const box = { x: 7, y: 1.5, w: 4, h: 4 };
    const imageBox = resolveVisualImageBox(box, 2.0, "visualContain");

    expect(imageBox.x).toBe(box.x);
    expect(imageBox.y).toBe(box.y);
    expect(imageBox.w).toBe(box.w);
    expect(imageBox.h).toBeLessThan(box.h);
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

  it("shrinks the text box only as far as needed and fits six right-side visuals", () => {
    const boxes = resolveAdaptiveTextMainBoxes(
      contentBox,
      {
        id: "block1",
        kind: "list",
        styleId: "listCompact",
        heading: "Cotton production steps",
        text: "Cotton production moves through multiple steps before becoming textile products.",
        items: [
          "Cultivation and harvest",
          "Ginning",
          "Spinning",
          "Weaving and knitting",
          "Dyeing and finishing",
          "Sewing"
        ]
      },
      6,
      "rightGrid",
      [1.5, 1.5, 1.5, 1.5, 1.5, 1.5]
    );

    expect(boxes.visuals).toHaveLength(6);
    expect(boxes.text.x).toBe(contentBox.x);
    expect(boxes.text.w).toBeLessThan(contentBox.w * 0.5);
    expect(boxes.visuals.every((visual) => visual.x > boxes.text.x + boxes.text.w)).toBe(true);
    expect(boxes.visuals.every((visual) => visual.w >= 1.6 && visual.h >= 1.2)).toBe(true);
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

  it("renders title cover and multiple adaptive visual-main images into PPTX relationships", async () => {
    const outputDir = join(process.cwd(), ".tmp-render-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "frame-v2-image-rels.pptx");

    await renderFramePresentationToFile(
      {
        version: "0.1-frame",
        title: "Image rels",
        theme: "business-clean",
        deckFrame: {
          slideCount: 3,
          masterFrameId: "titleLineFooter",
          openingSlide: {
            enabled: true,
            frameId: "visualTitleCover",
            title: "Cover",
            visualRequest: {
              type: "photo",
              brief: "Cover image",
              asset: {
                imageId: "img_cover",
                mimeType: "image/png",
                base64: onePixelPng,
                aspectRatio: 1.5
              }
            }
          },
          closingSlide: { enabled: true, frameId: "endSlide", title: "- END -" }
        },
        slideFrames: [
          {
            slideNumber: 1,
            title: "Multi visual",
            masterFrameId: "titleLineFooter",
            layoutFrameId: "adaptiveVisualMain",
            blocks: ["one", "two", "three", "four", "five", "six"].map((id, index) => ({
              id,
              kind: "visual" as const,
              styleId: "visualContain" as const,
              visualRequest: {
                type: "photo" as const,
                brief: `Image ${index + 1}`,
                asset: {
                  imageId: `img_${id}`,
                  mimeType: "image/png",
                  base64: onePixelPng,
                  aspectRatio: 1.6
                }
              }
            }))
          },
          {
            slideNumber: 2,
            title: "Unresolved",
            masterFrameId: "titleLineFooter",
            layoutFrameId: "adaptiveTextMain",
            blocks: [
              {
                id: "text",
                kind: "list",
                styleId: "listCompact",
                items: ["No matching visual"]
              },
              {
                id: "missing",
                kind: "visual",
                styleId: "visualContain",
                visualRequest: {
                  type: "photo",
                  brief: "Missing visual"
                }
              }
            ]
          },
          {
            slideNumber: 3,
            title: "Single visual",
            masterFrameId: "titleLineFooter",
            layoutFrameId: "adaptiveTextMain",
            blocks: [
              {
                id: "text",
                kind: "textStack",
                styleId: "textStackTopLeft",
                text: "Short text"
              },
              {
                id: "single",
                kind: "visual",
                styleId: "visualContain",
                visualRequest: {
                  type: "photo",
                  brief: "Single image",
                  renderStyle: { showBrief: false },
                  asset: {
                    imageId: "img_single",
                    mimeType: "image/png",
                    base64: onePixelPng,
                    aspectRatio: 1.6
                  }
                }
              }
            ]
          }
        ]
      },
      outputPath
    );

    const zip = await JSZip.loadAsync(await readFile(outputPath));
    await expectImageRelationshipCount(zip, 1, 1);
    await expectImageRelationshipCount(zip, 2, 6);
    await expectImageRelationshipCount(zip, 3, 0);
    await expectImageRelationshipCount(zip, 4, 1);
  });

  it("renders adaptive visual-main image labels without inventing hidden annotation text", async () => {
    const outputDir = join(process.cwd(), ".tmp-render-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "frame-v2-adaptive-visual-label.pptx");

    await renderFramePresentationToFile(
      {
        version: "0.1-frame",
        title: "Adaptive visual",
        theme: "business-clean",
        deckFrame: {
          slideCount: 1,
          masterFrameId: "titleLineFooter"
        },
        slideFrames: [
          {
            slideNumber: 1,
            title: "Tokyo overview",
            masterFrameId: "titleLineFooter",
            layoutFrameId: "adaptiveVisualMain",
            blocks: [
              {
                id: "main",
                kind: "visual",
                styleId: "visualContain",
                visualRequest: {
                  type: "photo",
                  brief: "Tokyo station label",
                  prompt: "A landscape daylight view of Tokyo Station with nearby streets.",
                  asset: {
                    imageId: "img_tokyo",
                    mimeType: "image/png",
                    base64: onePixelPng,
                    aspectRatio: 1.8
                  }
                }
              }
            ]
          }
        ]
      },
      outputPath
    );

    const zip = await JSZip.loadAsync(await readFile(outputPath));
    const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("text");
    expect(slideXml).toContain("Tokyo station label");
    expect(slideXml).not.toContain("A landscape daylight view of Tokyo Station");
  });

  it("renders right annotation text beside multi-image landscape visual-main slides", async () => {
    const outputDir = join(process.cwd(), ".tmp-render-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "frame-v2-adaptive-visual-multi-annotation.pptx");

    await renderFramePresentationToFile(
      {
        version: "0.1-frame",
        title: "Adaptive multi visual",
        theme: "business-clean",
        deckFrame: {
          slideCount: 1,
          masterFrameId: "titleLineFooter"
        },
        slideFrames: [
          {
            slideNumber: 1,
            title: "Ogikubo family area",
            masterFrameId: "titleLineFooter",
            layoutFrameId: "adaptiveVisualMain",
            layoutIntent: { textPlacement: "right" },
            blocks: [
              ...["station", "shopping", "residential"].map((id, index) => ({
                id,
                kind: "visual" as const,
                styleId: "visualContain" as const,
                visualRequest: {
                  type: "photo" as const,
                  brief: `Ogikubo image ${index + 1}`,
                  prompt:
                    index === 0
                      ? "Ogikubo station, shopping streets, and residential areas for families."
                      : undefined,
                  asset: {
                    imageId: `img_${id}`,
                    mimeType: "image/png",
                    base64: onePixelPng,
                    aspectRatio: 1.8
                  }
                }
              })),
              {
                id: "annotation",
                kind: "callout",
                styleId: "callout",
                text: "Station access, shopping, and quiet residential streets support family routines."
              }
            ]
          }
        ]
      },
      outputPath
    );

    const zip = await JSZip.loadAsync(await readFile(outputPath));
    await expectImageRelationshipCount(zip, 1, 3);
    const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("text");
    expect(slideXml).toContain("Ogikubo image 1");
    expect(slideXml).toContain("Station access, shopping");
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

async function expectImageRelationshipCount(
  zip: JSZip,
  slideNumber: number,
  expectedCount: number
) {
  const rels = await zip
    .file(`ppt/slides/_rels/slide${slideNumber}.xml.rels`)
    ?.async("text");
  expect(rels).toBeTruthy();
  const count = (rels?.match(/relationships\/image/g) || []).length;
  expect(count).toBe(expectedCount);
}
