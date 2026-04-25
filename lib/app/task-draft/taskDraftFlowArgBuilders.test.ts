import { describe, expect, it, vi } from "vitest";
import type { UseTaskDraftActionsArgs } from "@/hooks/chatPageActionTypes";
import {
  buildTaskDraftSearchContextResolver,
  buildUpdateTaskFromLastGptMessageFlowArgs,
} from "@/lib/app/task-draft/taskDraftFlowArgBuilders";
import type { Message } from "@/types/chat";
import type { TaskDraft } from "@/types/task";

function createBaseArgs(
  overrides: Partial<UseTaskDraftActionsArgs> = {}
): UseTaskDraftActionsArgs {
  const currentTaskDraft: TaskDraft = {
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
  };

  const gptMessages: Message[] = [];

  return {
    applyPrefixedTaskFieldsFromText: vi.fn(() => ({
      searchQuery: "",
      title: "",
      userInstruction: "",
      freeText: "",
    })),
    applyCompressionUsage: vi.fn(),
    applyChatUsage: vi.fn(),
    applyTaskUsage: vi.fn(),
    currentTaskDraft,
    getResolvedTaskTitle: vi.fn(({ fallback }) => fallback || "Task"),
    getTaskBaseText: vi.fn(() => ""),
    getTaskLibraryItem: vi.fn(() => null),
    gptInput: "",
    gptLoading: false,
    gptMemoryRuntime: {
      chatRecentLimit: 8,
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
      setGptState: vi.fn(),
      persistCurrentGptState: vi.fn(),
      handleGptMemory: vi.fn(async () => ({
        compressionUsage: null,
        fallbackUsage: null,
        fallbackUsageDetails: null,
        fallbackMetrics: null,
        fallbackDebug: null,
      })),
      clearTaskScopedMemory: vi.fn(),
      resetGptForCurrentKin: vi.fn(),
    },
    gptMessages,
    lastSearchContext: null,
    setCurrentTaskDraft: vi.fn(),
    setGptInput: vi.fn(),
    setGptLoading: vi.fn(),
    setGptMessages: vi.fn(),
    ...overrides,
  };
}

describe("taskDraftFlowArgBuilders", () => {
  it("returns search context only when the selected library item strongly matches it", () => {
    const matchingContext = {
      rawResultId: "search-1",
      query: "farmers 360",
      rawText: "result",
      sources: [],
      createdAt: new Date().toISOString(),
    };
    const resolveContext = buildTaskDraftSearchContextResolver(
      createBaseArgs({
        lastSearchContext: matchingContext,
        getTaskLibraryItem: vi.fn(() => ({
          id: "library:1",
          sourceId: "1",
          itemType: "search" as const,
          title: "Search item",
          subtitle: "",
          summary: "",
          excerptText: "",
          rawResultId: "search-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      })
    );

    expect(resolveContext()).toBe(matchingContext);
  });

  it("builds last-message flow args with common runtime values and gptMessages", () => {
    const gptMessages = [{ id: "m1", role: "gpt", text: "hello" }] as Message[];
    const args = createBaseArgs({ gptInput: "update", gptMessages });

    const built = buildUpdateTaskFromLastGptMessageFlowArgs(args, () => null);

    expect(built.gptInput).toBe("update");
    expect(built.gptMessages).toBe(gptMessages);
    expect(built.chatRecentLimit).toBe(8);
    expect(built.getTaskBaseText).toBe(args.getTaskBaseText);
  });
});

