import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  buildFramePresentationSpecFromTaskPlan,
  buildPresentationTaskPlan,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import { renderFramePresentationToFile } from "@/kin-presentation-renderer/src/renderer.js";
import type { TaskResult } from "@/types/task";

const onePixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw9kngAAAABJRU5ErkJggg==";

describe("presentation planning to PPTX rendering", () => {
  it("keeps adaptive visual-main annotation visible in both the design text and rendered PPTX", async () => {
    const result: TaskResult = {
      taskId: "ppt-e2e",
      type: "PREP_TASK",
      status: "OK",
      summary: "荻窪エリアの魅力を説明するPPT",
      keyPoints: [],
      detailBlocks: [
        {
          title: "Slide Frame JSON",
          body: [
            JSON.stringify({
              deckFrame: {
                masterFrameId: "titleLineFooter",
                slideCount: 1,
              },
              slideFrames: [
                {
                  slideNumber: 1,
                  title: "荻窪の住みやすさと家族向け魅力",
                  masterFrameId: "titleLineFooter",
                  layoutFrameId: "adaptiveVisualMain",
                  slideRole: "visualMain",
                  layoutIntent: {
                    textPlacement: "right",
                  },
                  blocks: [
                    {
                      id: "visual",
                      kind: "visual",
                      styleId: "visualContain",
                      visualRequest: {
                        type: "photo",
                        brief: "荻窪駅周辺の街並み",
                        prompt: "荻窪駅周辺の商業施設と住宅街を示す写真",
                        asset: {
                          imageId: "img_ogikubo",
                          mimeType: "image/png",
                          base64: onePixelPng,
                          aspectRatio: 1.8,
                        },
                      },
                    },
                    {
                      id: "annotation",
                      kind: "textStack",
                      styleId: "textStackTopLeft",
                      heading: "荻窪の住みやすさと家族向け魅力",
                      text: "駅前の利便性と落ち着いた住宅街が近接し、家族の日常生活を支えます。",
                      items: ["この項目はadaptiveVisualMainでは描画しない"],
                    },
                  ],
                },
              ],
            }),
          ],
        },
      ],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    };

    const plan = buildPresentationTaskPlan({
      title: "荻窪エリア",
      result,
      rawText: "",
      updatedAt: "2026-05-08T00:00:00.000Z",
    });
    const designText = formatPresentationTaskPlanText(plan);

    expect(designText).toContain("- annotation textStack (textStackTopLeft)");
    expect(designText).toContain(
      "- 表示本文: 駅前の利便性と落ち着いた住宅街が近接し、家族の日常生活を支えます。"
    );

    const frameSpec = buildFramePresentationSpecFromTaskPlan(plan);
    expect(frameSpec?.slideFrames[0].blocks[1]).toMatchObject({
      id: "annotation",
      kind: "textStack",
      text: "駅前の利便性と落ち着いた住宅街が近接し、家族の日常生活を支えます。",
      renderStyle: { showHeading: false },
    });

    const outputDir = join(process.cwd(), ".tmp-presentation-e2e-tests");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, "adaptive-visual-main-e2e.pptx");
    await renderFramePresentationToFile(frameSpec!, outputPath);

    const zip = await JSZip.loadAsync(await readFile(outputPath));
    const slideXmls = await readSlideXmls(zip);
    const bodySlideXml = slideXmls.find((xml) =>
      xml.includes("荻窪の住みやすさと家族向け魅力")
    );

    expect(bodySlideXml).toBeTruthy();
    expect(bodySlideXml).toContain("荻窪駅周辺の街並み");
    expect(bodySlideXml).toContain(
      "駅前の利便性と落ち着いた住宅街が近接し、家族の日常生活を支えます。"
    );
    expect(bodySlideXml).not.toContain("この項目はadaptiveVisualMainでは描画しない");
    expect(bodySlideXml).not.toContain("荻窪駅周辺の商業施設と住宅街を示す写真");
  });
});

async function readSlideXmls(zip: JSZip) {
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml$/)?.[1] || 0) - Number(b.match(/slide(\d+)\.xml$/)?.[1] || 0));
  return Promise.all(
    slidePaths.map((path) => zip.file(path)?.async("text") || Promise.resolve(""))
  );
}
