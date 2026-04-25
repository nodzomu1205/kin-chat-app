import { describe, expect, it } from "vitest";
import { buildPrepInputFromIngestResult } from "@/lib/app/gpt-task/gptTaskClient";

describe("buildPrepInputFromIngestResult", () => {
  it("builds a single content block without legacy points/detail sections", () => {
    const text = buildPrepInputFromIngestResult(
      {
        result: {
          title: "Napoleon",
          rawText: "[0:00] 要点\n[0:08] 補足\n[0:16] まとめ",
          kinCompact: ["旧要点1", "旧要点2"],
          kinDetailed: ["旧詳細1", "旧詳細2"],
        },
      },
      "notes.txt"
    );

    expect(text).toContain("File: notes.txt");
    expect(text).toContain("Title: Napoleon");
    expect(text).toContain("Content:\n要点 補足 まとめ");
    expect(text).not.toContain("要点:");
    expect(text).not.toContain("詳細");
    expect(text).not.toContain("[0:00]");
  });
});
