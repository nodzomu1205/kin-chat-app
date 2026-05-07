import { describe, expect, it, vi } from "vitest";
import { runSavedDocumentEditFlow } from "@/lib/app/reference-library/savedDocumentEditFlow";
import type { Message, ReferenceLibraryItem } from "@/types/chat";

const { runAutoPrepTaskMock } = vi.hoisted(() => ({
  runAutoPrepTaskMock: vi.fn(),
}));

vi.mock("@/lib/app/gpt-task/gptTaskClient", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/app/gpt-task/gptTaskClient")>();
  return {
    ...actual,
    runAutoPrepTask: runAutoPrepTaskMock,
  };
});

describe("runSavedDocumentEditFlow", () => {
  it("updates a saved task snapshot by Document ID after chat reset", async () => {
    const messages: Message[] = [];
    const updateStoredDocument = vi.fn();
    runAutoPrepTaskMock.mockResolvedValueOnce({
      raw: "",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      parsed: {
        taskId: "task",
        type: "PREP_TASK",
        status: "OK",
        summary: "Updated task",
        keyPoints: ["Updated point"],
        detailBlocks: [],
        warnings: [],
        missingInfo: [],
        nextSuggestion: [],
      },
    });

    const handled = await runSavedDocumentEditFlow({
      rawText: [
        "/task",
        "Document ID: task_saved_001",
        "優先順位を明確にしてください",
      ].join("\n"),
      flowArgs: buildFlowArgs({
        messages,
        updateStoredDocument,
        referenceLibraryItems: [
          buildTaskSnapshotItem({
            documentId: "task_saved_001",
            sourceId: "stored-task-1",
            text: "Document ID: task_saved_001\n\nInstruction\nOld task",
          }),
        ],
      }),
    });

    expect(handled).toBe(true);
    expect(runAutoPrepTaskMock).toHaveBeenCalledWith(
      expect.stringContaining("Saved library document task_saved_001 update"),
      "saved-library-document-update"
    );
    expect(updateStoredDocument).toHaveBeenCalledWith(
      "stored-task-1",
      expect.objectContaining({
        title: "Saved",
        text: expect.stringContaining("Document ID: task_saved_001"),
        structuredPayload: expect.objectContaining({
          version: "0.1-task-snapshot",
          documentId: "task_saved_001",
          title: "Saved",
        }),
      })
    );
    expect(messages.at(-1)?.text).toContain("Saved task document updated");
    expect(
      (messages.at(-1)?.text.match(/Document ID:\s*task_saved_001/g) || [])
        .length
    ).toBe(1);
  });

  it("deduplicates document id lines returned by the task updater", async () => {
    const messages: Message[] = [];
    const updateStoredDocument = vi.fn();
    runAutoPrepTaskMock.mockResolvedValueOnce({
      raw: "Document ID: task_saved_002\n\nDocument ID: task_saved_002\n\nUpdated body",
      usage: null,
      parsed: null,
    });

    await runSavedDocumentEditFlow({
      rawText: "/edit\nDocument ID: task_saved_002\n更新",
      flowArgs: buildFlowArgs({
        messages,
        updateStoredDocument,
        referenceLibraryItems: [
          buildTaskSnapshotItem({
            documentId: "task_saved_002",
            sourceId: "stored-task-2",
            text: "Document ID: task_saved_002\n\nOld task",
          }),
        ],
      }),
    });

    const patch = updateStoredDocument.mock.calls[0]?.[1] as { text: string };
    expect((patch.text.match(/Document ID:\s*task_saved_002/g) || []).length).toBe(1);
    expect((messages.at(-1)?.text.match(/Document ID:\s*task_saved_002/g) || []).length).toBe(1);
  });

  it("does not claim bare normal text", async () => {
    await expect(
      runSavedDocumentEditFlow({
        rawText: "normal text",
        flowArgs: buildFlowArgs({
          messages: [],
          updateStoredDocument: vi.fn(),
          referenceLibraryItems: [],
        }),
      })
    ).resolves.toBe(false);
  });
});

function buildTaskSnapshotItem(args: {
  documentId: string;
  sourceId: string;
  text: string;
}): ReferenceLibraryItem {
  return {
    id: `doc:${args.sourceId}`,
    sourceId: args.sourceId,
    itemType: "ingested_file",
    artifactType: "task_snapshot",
    title: "Task Snapshot - Saved",
    subtitle: `Document ID: ${args.documentId}`,
    summary: "Saved task",
    excerptText: args.text,
    createdAt: "2026-05-07T00:00:00.000Z",
    updatedAt: "2026-05-07T00:00:00.000Z",
    filename: "Task Snapshot - Saved.txt",
    structuredPayload: {
      version: "0.1-task-snapshot",
      documentId: args.documentId,
      title: "Task Snapshot - Saved",
      mode: "normal",
    },
  };
}

function buildFlowArgs(args: {
  messages: Message[];
  updateStoredDocument: ReturnType<typeof vi.fn>;
  referenceLibraryItems: ReferenceLibraryItem[];
}) {
  return {
    referenceLibraryItems: args.referenceLibraryItems,
    gptStateRef: { current: { recentMessages: [] } },
    chatRecentLimit: 20,
    buildLibraryReferenceContext: vi.fn(() => ""),
    setGptMessages: (updater: (prev: Message[]) => Message[]) => {
      args.messages.splice(0, args.messages.length, ...updater(args.messages));
    },
    setGptInput: vi.fn(),
    setGptLoading: vi.fn(),
    updateStoredDocument: args.updateStoredDocument,
    applyTaskUsage: vi.fn(),
  } as unknown as Parameters<typeof runSavedDocumentEditFlow>[0]["flowArgs"];
}
