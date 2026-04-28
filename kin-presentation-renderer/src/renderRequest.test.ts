import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderPresentationRequest } from "./renderRequest.js";
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
});
