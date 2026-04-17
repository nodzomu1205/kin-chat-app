import { describe, expect, it, vi } from "vitest";
import {
  buildLegacyIngestSummaryMessage,
  resolveLegacyIngestPostActionTexts,
} from "@/lib/app/legacyIngestFlowHelpers";

vi.mock("@/lib/app/gptTaskClient", () => ({
  formatTaskResultText: vi.fn((parsed, raw) => (parsed?.body as string) || raw || ""),
  runAutoPrepTask: vi.fn(async () => ({
    parsed: { body: "prepared text" },
    raw: "prepared text",
    usage: null,
  })),
  runAutoDeepenTask: vi.fn(async () => ({
    parsed: { body: "deepened text" },
    raw: "deepened text",
    usage: null,
  })),
}));

vi.mock("@/lib/app/legacyIngestHelpers", () => ({
  buildLegacyPlannerWrappedInput: vi.fn((text) => text),
  maybeTransformLegacyDisplayText: vi.fn(async ({ text }) => ({
    text,
    usage: null,
  })),
  resolveLegacyIngestActionLabel: vi.fn((action) => action),
  resolveLegacyIngestReadPolicyLabel: vi.fn((policy) => policy),
}));

describe("legacy ingest flow helpers", () => {
  it("resolves prep/deepen texts for deepen actions", async () => {
    const result = await resolveLegacyIngestPostActionTexts({
      action: "inject_prep_deepen",
      prepInput: "input",
      liveDirectiveInput: "",
      responseMode: "strict",
      fileName: "doc.txt",
      intentMode: "sys_info",
      applyTaskUsage: vi.fn(),
    });

    expect(result.prepTaskText).toBe("prepared text");
    expect(result.deepenTaskText).toBe("deepened text");
  });

  it("builds a readable ingest summary message", () => {
    const message = buildLegacyIngestSummaryMessage({
      title: "Doc",
      resolvedKind: "text",
      readPolicy: "text_first",
      mode: "compact",
      detail: "simple",
      action: "inject_and_prep",
      blocksLength: 2,
      directiveLines: ["Keep headings"],
      prepInput: "input",
      prepTaskText: "prepared",
      deepenTaskText: "",
    });

    expect(message).toContain("ファイルを Kin 注入用テキストへ変換しました。");
    expect(message).toContain("タイトル: Doc");
    expect(message).toContain("Keep headings");
    expect(message).toContain("prepared");
  });
});
