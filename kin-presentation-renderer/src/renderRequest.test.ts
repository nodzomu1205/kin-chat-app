import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderPresentationRequest } from "./renderRequest.js";
import { extractFlowSteps, extractTwoAxisLabels, renderFramePresentationToFile } from "./renderer.js";
import type { PresentationSpec } from "./schema.js";

const spec: PresentationSpec = {
  version: "0.1",
  title: "Request Render",
  theme: "business-clean",
  slides: [
    {
      type: "title",
      title: "Request Render"
    }
  ]
};

describe("renderPresentationRequest", () => {
  it("extracts arrow flow steps without treating a leading description as a node", () => {
    expect(
      extractFlowSteps(
        "Cotton production flow diagram. Cultivation and harvest -> Ginning -> Spinning -> Weaving -> Finishing. Add short notes."
      )
    ).toEqual(["Cultivation and harvest", "Ginning", "Spinning", "Weaving", "Finishing"]);
  });

  it("extracts two-axis diagram labels from visual prompts", () => {
    expect(
      extractTwoAxisLabels(
        "オーガニックコットン推進とブロックチェーン利用の2軸を示す図解。矢印で連携を表現し、業界の持続可能性向上を強調。"
      )
    ).toEqual(["オーガニックコットン推進", "ブロックチェーン利用"]);
  });

  it("renders pptx and returns metadata", async () => {
    const outputDir = join(process.cwd(), ".tmp-render-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "request-render.pptx");

    const result = await renderPresentationRequest({
      spec,
      output: {
        format: "pptx",
        path: outputPath
      }
    });

    expect(result).toMatchObject({
      title: "Request Render",
      slideCount: 1,
      theme: "business-clean",
      outputPath
    });
    expect((await stat(outputPath)).size).toBeGreaterThan(0);
  });

  it("renders twoColumn slides that carry content in leftContent/rightContent", async () => {
    const outputDir = join(process.cwd(), ".tmp-render-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "two-column-alternate-content.pptx");

    const result = await renderPresentationRequest({
      spec: {
        version: "0.1",
        title: "Alternate Columns",
        theme: "business-clean",
        slides: [
          {
            type: "twoColumn",
            title: "Partnership and plan",
            left: { heading: "Left" },
            right: { heading: "Right" },
            leftContent: {
              bullets: [{ text: "Partner story development" }]
            },
            rightContent: {
              bullets: [{ text: "MVP validation" }]
            }
          }
        ]
      } as PresentationSpec,
      output: {
        format: "pptx",
        path: outputPath
      }
    });

    expect(result.slideCount).toBe(1);
    expect((await stat(outputPath)).size).toBeGreaterThan(0);
  });

  it("renders card grid slides", async () => {
    const outputDir = join(process.cwd(), ".tmp-render-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "cards-grid.pptx");

    const result = await renderPresentationRequest({
      spec: {
        version: "0.1",
        title: "Cards",
        theme: "business-clean",
        slides: [
          {
            type: "cards",
            title: "Supply chain overview",
            layoutVariant: "twoByTwoGrid",
            cards: [
              { title: "Countries", bullets: [{ text: "India" }, { text: "China" }] },
              { title: "Production map", kind: "visual", bullets: [{ text: "Prompt: Show India and China." }] },
              { title: "Water risk", bullets: [{ text: "Water scarcity" }] },
              { title: "Labor risk", bullets: [{ text: "Low wages" }] }
            ]
          }
        ]
      } as PresentationSpec,
      output: {
        format: "pptx",
        path: outputPath
      }
    });

    expect(result.slideCount).toBe(1);
    expect((await stat(outputPath)).size).toBeGreaterThan(0);
  });

  it("renders hero top detail card slides", async () => {
    const outputDir = join(process.cwd(), ".tmp-render-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "hero-cards.pptx");

    const result = await renderPresentationRequest({
      spec: {
        version: "0.1",
        title: "Hero Cards",
        theme: "business-clean",
        slides: [
          {
            type: "cards",
            title: "Risks",
            layoutVariant: "heroTopDetailsBottom",
            cards: [
              { title: "Focus", body: "環境と社会の課題", kind: "callout" },
              { title: "主な課題", bullets: [{ text: "水リスク" }, { text: "労働問題" }] },
              { title: "課題の象徴", kind: "visual", bullets: [{ text: "Prompt needed: 要相談" }] }
            ]
          }
        ]
      } as PresentationSpec,
      output: {
        format: "pptx",
        path: outputPath
      }
    });

    expect(result.slideCount).toBe(1);
    expect((await stat(outputPath)).size).toBeGreaterThan(0);
  });

  it("renders frame-native slide specs directly", async () => {
    const outputDir = join(process.cwd(), ".tmp-render-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "frame-native.pptx");

    await renderFramePresentationToFile(
      {
        version: "0.1-frame",
        title: "Frame Native",
        theme: "business-clean",
        deckFrame: {
          slideCount: 1,
          masterFrameId: "titleLineFooter",
          pageNumber: { enabled: true, position: "bottomRight" }
        },
        slideFrames: [
          {
            slideNumber: 1,
            title: "工程フロー",
            masterFrameId: "titleLineFooter",
            layoutFrameId: "visualLeftTextRight",
            blocks: [
              {
                id: "block1",
                kind: "visual",
                styleId: "visualContain",
                visualRequest: {
                  type: "diagram",
                  brief: "工程図",
                  prompt: "栽培から縫製までを矢印で示す。"
                }
              },
              {
                id: "block2",
                kind: "list",
                styleId: "listCompact",
                heading: "主要工程",
                items: ["栽培・収穫", "ジニング", "紡績"]
              }
            ]
          }
        ]
      },
      outputPath
    );

    expect((await stat(outputPath)).size).toBeGreaterThan(0);
  });

  it("renders frame-native style controls for larger text and vertical flows", async () => {
    const outputDir = join(process.cwd(), ".tmp-render-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "frame-style-controls.pptx");

    await renderFramePresentationToFile(
      {
        version: "0.1-frame",
        title: "Frame Style Controls",
        theme: "business-clean",
        deckFrame: {
          slideCount: 1,
          masterFrameId: "titleLineFooter",
          typography: { bodyScale: 1.18, itemScale: 1.18 }
        },
        slideFrames: [
          {
            slideNumber: 1,
            title: "Flow",
            masterFrameId: "titleLineFooter",
            layoutFrameId: "visualLeftTextRight",
            blocks: [
              {
                id: "block1",
                kind: "visual",
                styleId: "visualContain",
                visualRequest: {
                  type: "diagram",
                  brief: "Hidden brief",
                  prompt: "A -> B -> C",
                  renderStyle: { orientation: "vertical", showBrief: false }
                }
              },
              {
                id: "block2",
                kind: "list",
                styleId: "listCompact",
                renderStyle: { itemFontSize: "large" },
                items: ["First point", "Second point"]
              }
            ]
          }
        ]
      },
      outputPath
    );

    expect((await stat(outputPath)).size).toBeGreaterThan(0);
  });
});
