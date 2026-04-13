import { describe, expect, it } from "vitest";
import {
  buildPendingKinInjectionBlocks,
  DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
} from "@/lib/app/kinMultipart";

describe("buildPendingKinInjectionBlocks", () => {
  it("returns a single untouched block when text fits in one message", () => {
    const text = `<<SYS_TASK>>
TASK_ID: 123
TITLE: Small task
<<END_SYS_TASK>>`;

    expect(buildPendingKinInjectionBlocks(text)).toEqual([text]);
  });

  it("wraps multipart blocks inside SYS_TASK with notice and end marker", () => {
    const longBody = Array.from({ length: 20 }, (_, index) => `Paragraph ${index + 1}`.repeat(20)).join("\n\n");
    const text = `<<SYS_TASK>>
TASK_ID: 123
TITLE: Long task

${longBody}
<<END_SYS_TASK>>`;

    const blocks = buildPendingKinInjectionBlocks(text, {
      maxChars: 800,
      reserveChars: 200,
      noticeLines: DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
    });

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[0]).toContain("<<SYS_TASK>>");
    expect(blocks[0]).toContain("PART: 1/");
    expect(blocks[0]).toContain("MULTIPART_TASK_NOTICE:");
    expect(blocks[0]).toContain('reply only with "Received."');
    expect(blocks[0]).toContain("END OF PART 1/");
    expect(blocks[0]).toContain("<<END_SYS_TASK>>");
  });

  it("creates wrapped SYS_TASK blocks when source chunk has no explicit SYS_TASK marker", () => {
    const text = Array.from({ length: 18 }, (_, index) => `Chunk ${index + 1}`.repeat(20)).join("\n\n");

    const blocks = buildPendingKinInjectionBlocks(text, {
      maxChars: 800,
      reserveChars: 200,
      noticeLines: DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
    });

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[0].startsWith("<<SYS_TASK>>")).toBe(true);
    expect(blocks[0]).toContain("PART: 1/");
    expect(blocks[0]).toContain("END OF PART 1/");
    expect(blocks[0].trim().endsWith("<<END_SYS_TASK>>")).toBe(true);
  });
});
