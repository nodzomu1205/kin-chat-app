import { describe, expect, it } from "vitest";
import {
  buildAttachCurrentTaskDraftUpdate,
  buildAttachCurrentTaskMergedInput,
  buildFileIngestBridgeState,
  buildFileIngestSummaryText,
  buildIngestKinInjectionBlocks,
  buildPostIngestTaskDraftUpdate,
  resolveFileIngestTransformResult,
  resolveIngestExtractionArtifacts,
  resolvePostIngestTaskTexts,
} from "@/lib/app/fileIngestFlow";

describe("fileIngestFlow helpers", () => {
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

  it("builds a prepared draft update from ingest prep output", () => {
    const nextDraft = buildPostIngestTaskDraftUpdate({
      previousDraft: {
        id: "draft-1",
        slot: 1,
        taskName: "",
        title: "",
        body: "",
        objective: "",
        prepText: "",
        deepenText: "",
        mergedText: "",
        kinTaskText: "",
        status: "idle",
        sources: [],
        userInstruction: "",
        updatedAt: "",
      } as never,
      action: "inject_and_prep",
      fileName: "notes.txt",
      fileTitle: "Notes",
      prepInput: "prep body",
      prepTaskText: "prepared task text",
      deepenTaskText: "",
      getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
        explicitTitle || fallback || "",
    });

    expect(nextDraft.title).toBe("Notes");
    expect(nextDraft.body).toBe("prepared task text");
    expect(nextDraft.status).toBe("prepared");
    expect(nextDraft.sources).toHaveLength(1);
  });

  it("builds a deepened draft update from ingest deepen output", () => {
    const nextDraft = buildPostIngestTaskDraftUpdate({
      previousDraft: {
        id: "draft-1",
        slot: 1,
        taskName: "",
        title: "",
        body: "",
        objective: "",
        prepText: "",
        deepenText: "",
        mergedText: "",
        kinTaskText: "",
        status: "idle",
        sources: [],
        userInstruction: "",
        updatedAt: "",
      } as never,
      action: "inject_prep_deepen",
      fileName: "notes.txt",
      fileTitle: "Notes",
      prepInput: "prep body",
      prepTaskText: "prepared task text",
      deepenTaskText: "deepened task text",
      getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
        explicitTitle || fallback || "",
    });

    expect(nextDraft.title).toBe("Notes");
    expect(nextDraft.body).toBe("deepened task text");
    expect(nextDraft.status).toBe("deepened");
    expect(nextDraft.prepText).toBe("prepared task text");
    expect(nextDraft.deepenText).toBe("deepened task text");
  });

  it("builds the ingest summary text without changing the existing messaging", () => {
    const summary = buildFileIngestSummaryText({
      fileTitle: "Notes",
      storedDocumentSummary: "short summary",
      canonicalDocumentText: "full body",
      resolvedKind: "text",
      readPolicy: "text_first",
      ingestMode: "compact",
      imageDetail: "detailed",
      action: "inject_prep_deepen",
      kinPayloadTextLength: 1234,
      selectedCharCount: 900,
      rawCharCount: 1200,
      blocksLength: 2,
      autoCopyFileIngestSysInfoToKin: true,
      prepInput: "prep body",
      prepTaskText: "prepared task text",
      deepenTaskText: "deepened task text",
    });

    expect(summary).toContain("File converted into Kin-ready text.");
    expect(summary).toContain("Summary: short summary");
    expect(summary).toContain("Set block 1/2 to Kin input.");
    expect(summary).toContain("Deepened task result");
    expect(summary).toContain("prepared task text");
  });

  it("does not append the full ingest content again with duplicate file metadata", () => {
    const summary = buildFileIngestSummaryText({
      fileTitle: "Notes",
      storedDocumentSummary: "short summary",
      canonicalDocumentText: "full body",
      resolvedKind: "text",
      readPolicy: "text_first",
      ingestMode: "max",
      imageDetail: "detailed",
      action: "inject_only",
      kinPayloadTextLength: 1234,
      selectedCharCount: 900,
      rawCharCount: 1200,
      blocksLength: 1,
      autoCopyFileIngestSysInfoToKin: true,
      prepInput: "File: notes.txt\nTitle: Notes\nContent:\nfull body",
      prepTaskText: "",
      deepenTaskText: "",
    });

    expect(summary).toContain("full body");
    expect(summary).toContain("--------------------");
    expect(summary).not.toContain("File: notes.txt");
    expect(summary.match(/Title: Notes/g)?.length).toBe(1);
  });

  it("builds the attach-current-task merged input", () => {
    const mergedInput = buildAttachCurrentTaskMergedInput({
      currentTaskText: "CURRENT TASK",
      fileName: "notes.txt",
      prepInput: "prep body",
      currentTaskDraft: {
        title: "Draft title",
        userInstruction: "Do this",
        searchContext: { rawText: "search raw" },
      } as never,
      fileTitle: "Notes",
      getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
        explicitTitle || fallback || "",
    });

    expect(mergedInput).toContain("CURRENT TASK");
    expect(mergedInput).toContain("FILE: notes.txt");
    expect(mergedInput).toContain("prep body");
  });

  it("builds the attach-current-task draft update", () => {
    const nextDraft = buildAttachCurrentTaskDraftUpdate({
      previousDraft: {
        id: "draft-1",
        slot: 1,
        taskName: "",
        title: "",
        body: "",
        objective: "",
        prepText: "",
        deepenText: "",
        mergedText: "",
        kinTaskText: "",
        status: "idle",
        sources: [],
        userInstruction: "",
        updatedAt: "",
      } as never,
      fileName: "notes.txt",
      fileTitle: "Notes",
      prepInput: "prep body",
      mergedTaskText: "merged task text",
      resolveTaskTitleFromDraft: (_draft, { explicitTitle, fallback }) =>
        explicitTitle || fallback || "",
    });

    expect(nextDraft.title).toBe("Notes");
    expect(nextDraft.body).toBe("merged task text");
    expect(nextDraft.status).toBe("prepared");
    expect(nextDraft.sources).toHaveLength(1);
  });

  it("keeps original ingest text when transform is not needed", async () => {
    const result = await resolveFileIngestTransformResult({
      intent: { mode: "sys_info", directives: [], directiveText: "" } as never,
      canonicalDocumentText: "shared body",
      taskPrepEnvelopeBase: "prep body",
      responseMode: "strict",
      shouldTransformContent: () => false,
      transformTextWithIntent: async () => ({
        text: "unused",
      }),
      applyTaskUsage: () => undefined,
    });

    expect(result).toEqual({
      transformedTaskPrepEnvelope: "prep body",
      transformedProtocolBodyText: "shared body",
      transformFailed: false,
    });
  });

  it("returns auto-prep and deepen fallback text without changing behavior", async () => {
    const result = await resolvePostIngestTaskTexts({
      action: "inject_only",
      prepInput: "prep body",
      fileName: "notes.txt",
      applyTaskUsage: () => undefined,
    });

    expect(result).toEqual({
      prepTaskText: "",
      deepenTaskText: "",
    });
  });
});
