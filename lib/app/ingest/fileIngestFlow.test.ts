import { describe, expect, it } from "vitest";
import {
  buildFileIngestBridgeState,
  buildFileIngestSavedInfoMessage,
  buildIngestKinInjectionBlocks,
  resolveIngestExtractionArtifacts,
  buildStoredDocumentSummary,
} from "@/lib/app/ingest/fileIngestFlowBuilders";

const MOJIBAKE_PATTERN = /[繧縺譁荳蜿邵蝨郢陷隴驛髫鬮隰闖]/u;

describe("fileIngestFlow helpers", () => {
  it("builds stored document summary through the builder module", () => {
    expect(
      buildStoredDocumentSummary(
        "Notes alpha. beta gamma. delta epsilon.",
        "Notes"
      )
    ).toContain("alpha.");
  });

  it("builds saved info messages without mojibake", () => {
    const result = buildFileIngestSavedInfoMessage({
      fileTitle: "日本起業戦略メモ",
      storedDocumentCharCount: 12345,
    });

    expect(result).toBe(
      "ファイルをライブラリに保存しました: 日本起業戦略メモ\n抽出文字数: 12,345 chars"
    );
    expect(result).not.toMatch(MOJIBAKE_PATTERN);
  });

  it("resolves extraction artifacts from selected lines", () => {
    const result = resolveIngestExtractionArtifacts({
      data: {
        result: {
          selectedLines: ["line 1", "line 2"],
          rawText: "raw body",
        },
      },
      fileName: "notes.txt",
      fileTitle: "Notes",
    });

    expect(result.selectedText).toBe("line 1\nline 2");
    expect(result.selectedCharCount).toBe("line 1\nline 2".length);
    expect(result.taskPrepEnvelopeBase).toContain("File: notes.txt");
    expect(result.taskPrepEnvelopeBase).toContain("Title: Notes");
    expect(result.canonicalDocumentText).toBe("line 1\nline 2");
  });

  it("normalizes transcript-like prep input when falling back to ingest result text", () => {
    const result = resolveIngestExtractionArtifacts({
      data: {
        result: {
          selectedLines: [],
          rawText: [
            "[0:00] point one",
            "[0:08] point two",
            "[0:16] point three",
          ].join("\n"),
          summaryText: "point one",
          detailText: [
            "[0:00] point one",
            "[0:08] point two",
            "[0:16] point three",
          ].join("\n"),
        },
      } as never,
      fileName: "notes.txt",
      fileTitle: "Notes",
    });

    expect(result.taskPrepEnvelopeBase).not.toContain("[0:00]");
    expect(result.taskPrepEnvelopeBase).toContain("Content:");
    expect(result.taskPrepEnvelopeBase).toContain("point one");
    expect(result.taskPrepEnvelopeBase).toContain("point two");
    expect(result.canonicalDocumentText).toBe("point one point two point three");
  });

  it("builds the ingest bridge state with a fresh active document", () => {
    const result = buildFileIngestBridgeState({
      currentGptState: {
        memory: {
          facts: [],
          preferences: [],
          lists: {
            stale: true,
          },
          context: {
            currentTopic: "topic-a",
          },
        },
        recentMessages: [
          {
            id: "old-file",
            role: "gpt",
            text: "old ingest",
            meta: {
              kind: "task_info",
              sourceType: "file_ingest",
            },
          },
          {
            id: "keep",
            role: "user",
            text: "keep me",
          },
        ],
      },
      fileName: "notes.txt",
      fileTitle: "Notes",
      resolvedKind: "text",
      summary: "short summary",
      selectedCharCount: 120,
      rawCharCount: 140,
      chatContextExcerpt: "excerpt body",
      chatRecentLimit: 5,
      injectedAt: "2026-04-17T00:00:00.000Z",
    });

    expect(result.nextGptState.memory.lists.activeDocument).toEqual({
      title: "Notes",
      fileName: "notes.txt",
      kind: "text",
      summary: "short summary",
      charCount: 120,
      rawCharCount: 140,
      excerpt: "excerpt body",
      injectedAt: "2026-04-17T00:00:00.000Z",
    });
    expect(result.nextGptState.recentMessages).toHaveLength(2);
    expect(result.nextGptState.recentMessages[0]).toMatchObject({
      id: "keep",
      role: "user",
    });
    expect(result.fileContextMessage.text).toContain("[Ingested file context]");
    expect(result.fileContextMessage.text).toContain("Summary:\nshort summary");
    expect(result.fileContextMessage.text).toContain("Content:\nexcerpt body");
  });

  it("builds kin injection blocks for sys_info multipart payloads", () => {
    const blocks = buildIngestKinInjectionBlocks({
      intentMode: "sys_info",
      currentTaskSlot: 2,
      fileTitle: "Notes",
      fileName: "notes.txt",
      directiveLines: ["MODE: concise"],
      kinPayloadText: "a".repeat(5000),
    });

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[0]).toContain("<<SYS_INFO>>");
    expect(blocks[0]).toContain("TITLE: Notes");
    expect(blocks[0]).toContain("PART: 1/2");
  });
});
