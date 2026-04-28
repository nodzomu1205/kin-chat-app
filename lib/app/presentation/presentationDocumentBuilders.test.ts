import { describe, expect, it, vi } from "vitest";
import {
  buildPresentationLibraryPayload,
  buildPresentationStoredDocument,
  parsePresentationPayload,
  rebuildPresentationLibraryPayload,
} from "@/lib/app/presentation/presentationDocumentBuilders";
import { buildPresentationPreviewText } from "@/lib/app/presentation/presentationPreviewText";
import type { PresentationSpec } from "@/lib/app/presentation/presentationTypes";

const spec: PresentationSpec = {
  version: "0.1",
  title: "提案資料",
  audience: "部長層",
  purpose: "新施策の承認を得る",
  theme: "business-clean",
  slides: [
    {
      type: "title",
      title: "提案資料",
      subtitle: "新施策について",
    },
    {
      type: "bullets",
      title: "導入効果",
      bullets: [{ text: "初稿作成を短縮する" }],
      takeaway: "小さく始める。",
    },
  ],
};

describe("presentation document builders", () => {
  it("builds deterministic preview text from a spec", () => {
    expect(buildPresentationPreviewText(spec)).toContain("Slides: 2");
    expect(buildPresentationPreviewText(spec)).toContain(
      "2. bullets - 導入効果 (1 bullets)"
    );
  });

  it("builds a library payload and stored document", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.123456);
    const payload = buildPresentationLibraryPayload({
      spec,
      timestamp: "2026-04-28T12:34:56.000Z",
    });
    const document = buildPresentationStoredDocument({ payload });

    expect(payload.documentId).toMatch(/^pres_20260428123456_/);
    expect(payload.summary).toContain("提案資料 (2 slides)");
    expect(document).toMatchObject({
      artifactType: "presentation",
      title: "提案資料",
      filename: `${payload.documentId}.presentation.json`,
      summary: payload.summary,
    });
    expect(parsePresentationPayload(document.text)).toMatchObject({
      documentId: payload.documentId,
      spec: { title: "提案資料" },
    });
  });

  it("rebuilds payload preview and status after updates", () => {
    const payload = buildPresentationLibraryPayload({
      spec,
      documentId: "pres_test",
      timestamp: "2026-04-28T12:00:00.000Z",
    });
    const next = rebuildPresentationLibraryPayload(payload, {
      spec: {
        ...spec,
        slides: [...spec.slides, { type: "closing", title: "次のステップ" }],
      },
      status: "revised",
      timestamp: "2026-04-28T13:00:00.000Z",
    });

    expect(next.status).toBe("revised");
    expect(next.previewText).toContain("Slides: 3");
    expect(next.updatedAt).toBe("2026-04-28T13:00:00.000Z");
  });

  it("adds latest pptx filename to rebuilt payload summary", () => {
    const payload = buildPresentationLibraryPayload({
      spec,
      documentId: "pres_test",
      timestamp: "2026-04-28T12:00:00.000Z",
    });
    const next = rebuildPresentationLibraryPayload(payload, {
      status: "rendered",
      outputs: [
        {
          id: "pptx_1",
          format: "pptx",
          filename: "pres_test.pptx",
          path: "/generated-presentations/pres_test.pptx",
          createdAt: "2026-04-28T13:00:00.000Z",
          slideCount: 2,
        },
      ],
      timestamp: "2026-04-28T13:00:00.000Z",
    });

    expect(next.summary).toContain("Latest PPTX: pres_test.pptx");
    expect(next.previewText).toContain(
      "Latest PPTX Link: /generated-presentations/pres_test.pptx"
    );
    expect(next.outputs).toHaveLength(1);
  });
});
