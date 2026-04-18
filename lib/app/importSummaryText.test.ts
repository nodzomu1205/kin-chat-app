import { describe, expect, it } from "vitest";
import { cleanImportSummarySource } from "@/lib/app/importSummaryText";

describe("importSummaryText", () => {
  it("removes leading timecodes and empty brackets from summary source", () => {
    expect(
      cleanImportSummarySource("[00:12] こんにちは\n[]\n00:18 次の行")
    ).toBe("こんにちは\n次の行");
  });

  it("removes common noise brackets without dropping normal text", () => {
    expect(
      cleanImportSummarySource("[BGM] 導入文です\n本文 [Applause] 続き")
    ).toBe("導入文です\n本文 続き");
  });
});
