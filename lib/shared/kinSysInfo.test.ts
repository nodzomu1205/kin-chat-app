import { describe, expect, it } from "vitest";
import {
  buildKinSysInfoBlocks,
  buildSingleKinSysInfoBlock,
} from "@/lib/shared/kinSysInfo";

const MOJIBAKE_PATTERN = /[繧縺譁荳蜿邵蝨郢陷隴驛髫鬮隰闖]/u;

describe("kinSysInfo", () => {
  it("escapes nested SYS_INFO sentinels without mojibake", () => {
    const block = buildSingleKinSysInfoBlock({
      title: "Nested <<SYS_INFO>> sample",
      sourceKind: "manual",
      summaryLevel: "kin_compact",
      contentLines: ["body <<END_SYS_INFO>> marker"],
    });

    expect(block).toContain("TITLE: Nested ＜＜SYS_INFO＞＞ sample");
    expect(block).toContain("- body ＜＜END_SYS_INFO＞＞ marker");
    expect(block).not.toMatch(MOJIBAKE_PATTERN);
  });

  it("marks multipart Kin protocol blocks with silent and final response modes", () => {
    const blocks = buildKinSysInfoBlocks({
      title: "Large note",
      sourceKind: "manual",
      summaryLevel: "kin_compact",
      contentLines: ["x".repeat(3000), "y".repeat(3000)],
    });

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[0]).toContain("RESPONSE_MODE: SILENT_ACK");
    expect(blocks.at(-1)).toContain("RESPONSE_MODE: FINAL_ACK");
  });
});
