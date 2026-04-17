import { describe, expect, it } from "vitest";
import {
  buildLegacyIngestBlocksFromText,
  buildLegacyPlannerWrappedInput,
  resolveLegacyIngestActionLabel,
  resolveLegacyIngestReadPolicyLabel,
} from "@/lib/app/legacyIngestHelpers";

describe("legacyIngestHelpers", () => {
  it("resolves readable labels for legacy ingest summaries", () => {
    expect(resolveLegacyIngestReadPolicyLabel("text_first")).toBe("テキスト優先");
    expect(resolveLegacyIngestActionLabel("attach_to_current_task")).toBe("現在タスクに反映");
  });

  it("wraps planner input only when an extra instruction is present", () => {
    const wrapped = buildLegacyPlannerWrappedInput("base text", "要約して");
    expect(wrapped).toContain("ユーザー追加指示:");
    expect(wrapped).toContain("base text");
  });

  it("builds legacy sys_info blocks from plain text", () => {
    const blocks = buildLegacyIngestBlocksFromText({
      mode: "sys_info",
      taskSlot: 1,
      title: "Doc",
      content: "alpha\nbeta",
      directiveLines: [],
    });

    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0]).toContain("SYS_INFO");
  });
});
