import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAttachSearchResultToTaskFlow } from "@/lib/app/task-draft/taskDraftActionFlows";

const runAutoPrepTaskMock = vi.fn();
const formatTaskResultTextMock = vi.fn();

vi.mock("@/lib/app/gpt-task/gptTaskClient", () => ({
  buildMergedTaskInput: vi.fn(),
  buildTaskInput: vi.fn(),
  buildTaskStructuredInput: vi.fn((value) => value),
  formatTaskResultText: (...args: unknown[]) => formatTaskResultTextMock(...args),
  runAutoDeepenTask: vi.fn(),
  runAutoPrepTask: (...args: unknown[]) => runAutoPrepTaskMock(...args),
}));

describe("runAttachSearchResultToTaskFlow", () => {
  beforeEach(() => {
    runAutoPrepTaskMock.mockReset();
    formatTaskResultTextMock.mockReset();
  });

  it("imports non-search library items into a new task", async () => {
    runAutoPrepTaskMock.mockResolvedValue({
      parsed: { ok: true },
      raw: "prepared",
    });
    formatTaskResultTextMock.mockReturnValue("Prepared task body");

    const setCurrentTaskDraft = vi.fn();
    const setGptMessages = vi.fn();

    await runAttachSearchResultToTaskFlow({
      gptLoading: false,
      currentTaskDraft: {
        id: "draft-1",
        slot: 1,
        taskId: "",
        title: "",
        taskName: "",
        userInstruction: "",
        body: "",
        prepText: "",
        deepenText: "",
        mergedText: "",
        kinTaskText: "",
        objective: "",
        status: "idle",
        searchContext: null,
        sources: [],
        updatedAt: new Date().toISOString(),
      },
      getTaskBaseText: () => "",
      getTaskSearchContext: () => null,
      getTaskLibraryItem: () => ({
        id: "doc:1",
        sourceId: "1",
        itemType: "ingested_file",
        title: "Stored doc",
        subtitle: "file",
        summary: "Summary",
        excerptText: "Library body",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      applyPrefixedTaskFieldsFromText: () => ({}),
      getResolvedTaskTitle: ({ fallback }) => fallback || "Task",
      setGptMessages,
      setGptInput: vi.fn(),
      setGptLoading: vi.fn(),
      setGptState: vi.fn(),
      persistCurrentGptState: vi.fn(),
      setCurrentTaskDraft,
      gptStateRef: {
        current: {
          recentMessages: [],
          memory: {
            facts: [],
            preferences: [],
            lists: {},
            context: {},
          },
        },
      },
      chatRecentLimit: 8,
      referenceLibraryItems: [],
      buildLibraryReferenceContext: vi.fn(() => ""),
      imageLibraryReferenceEnabled: false,
      imageLibraryReferenceCount: 0,
      applyChatUsage: vi.fn(),
      applyTaskUsage: vi.fn(),
      applyCompressionUsage: vi.fn(),
      handleGptMemory: async () => ({
        compressionUsage: null,
        fallbackUsage: null,
        fallbackUsageDetails: null,
        fallbackMetrics: null,
        fallbackDebug: null,
      }),
      gptInput: "",
      lastSearchContext: null,
    });

    expect(runAutoPrepTaskMock).toHaveBeenCalled();
    expect(setCurrentTaskDraft).toHaveBeenCalled();
    expect(setGptMessages).toHaveBeenCalled();
  });
});

