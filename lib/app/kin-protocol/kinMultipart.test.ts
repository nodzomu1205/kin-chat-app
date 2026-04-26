import { describe, expect, it } from "vitest";
import {
  buildPendingKinInjectionBlocks,
  DEFAULT_KIN_INFO_MULTIPART_NOTICE_LINES,
  DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
} from "@/lib/app/kin-protocol/kinMultipart";

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
    expect(blocks[0]).toContain("-----");
    expect(blocks[0]).toContain(
      "reply only with <<SYS_KIN_RESPONSE>> Received. Send the next. <<END_SYS_KIN_RESPONSE>>"
    );
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

  it("wraps multipart library info as SYS_INFO without nested SYS_TASK or duplicate endings", () => {
    const longBody = Array.from(
      { length: 20 },
      (_, index) => `Library paragraph ${index + 1}. `.repeat(18)
    ).join("\n\n");
    const text = `<<SYS_INFO>>
TITLE: Library Data
CONTENT:
${longBody}
<<END_SYS_INFO>>`;

    const blocks = buildPendingKinInjectionBlocks(text, {
      maxChars: 800,
      reserveChars: 200,
      noticeLines: DEFAULT_KIN_INFO_MULTIPART_NOTICE_LINES,
      wrapperName: "SYS_INFO",
    });

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[0].startsWith("<<SYS_INFO>>")).toBe(true);
    expect(blocks[0]).toContain("MULTIPART_INFO_NOTICE:");
    expect(blocks[0]).toContain("-----\nTITLE: Library Data");
    expect(blocks[0]).toContain("-----\nEND OF PART 1/");
    expect(blocks[0].trim().endsWith("<<END_SYS_INFO>>")).toBe(true);
    expect(blocks.join("\n")).not.toContain("<<SYS_TASK>>");

    const finalBlock = blocks.at(-1) || "";
    expect(finalBlock).toContain(`END OF PART ${blocks.length}/${blocks.length}`);
    expect(finalBlock.match(/<<END_SYS_INFO>>/g)).toHaveLength(1);
    expect(finalBlock).not.toContain("<<END_SYS_TASK>>");
  });
});
