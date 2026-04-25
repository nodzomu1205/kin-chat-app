import { afterEach, describe, expect, it, vi } from "vitest";

const { resolveTaskIntentWithFallbackMock } = vi.hoisted(() => ({
  resolveTaskIntentWithFallbackMock: vi.fn(),
}));

vi.mock("@/lib/taskIntent", () => ({
  resolveTaskIntentWithFallback: resolveTaskIntentWithFallbackMock,
}));

import { syncApprovedIntentPhrasesToCurrentTaskFlow } from "@/lib/app/currentTaskIntentRefresh";

describe("currentTaskIntentRefresh", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reinterprets the current task and syncs draft plus Kin injection", async () => {
    resolveTaskIntentWithFallbackMock.mockResolvedValue({
      intent: {
        goal: "Updated goal",
      },
      pendingCandidates: [],
      usedFallback: true,
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
    });

    const applyTaskUsage = vi.fn();
    const syncTaskDraftFromProtocol = vi.fn();
    const setPendingKinInjectionBlocks = vi.fn();
    const setPendingKinInjectionIndex = vi.fn();
    const setKinInput = vi.fn();
    const replaceCurrentTaskIntent = vi.fn(() => ({
      taskId: "task-1",
      title: "Updated title",
      compiledTaskPrompt: "<<SYS_TASK>>\nTITLE: Updated title\nGOAL: Updated goal\n<<END_SYS_TASK>>",
    }));

    await syncApprovedIntentPhrasesToCurrentTaskFlow({
      approvedIntentPhrases: [
        {
          id: "phrase-1",
          phrase: "CAN ask GPT up to 3 times",
          kind: "ask_gpt",
          count: 3,
          rule: "up_to",
          createdAt: "2026-04-17T00:00:00.000Z",
        },
      ],
      sourceInstruction: "Original instruction text",
      currentTaskId: "task-1",
      currentTaskTitle: "Current title",
      currentTaskDraftTitle: "Draft title",
      reasoningMode: "strict",
      applyTaskUsage,
      replaceCurrentTaskIntent,
      syncTaskDraftFromProtocol,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setKinInput,
    });

    expect(resolveTaskIntentWithFallbackMock).toHaveBeenCalledWith({
      input: "Original instruction text",
      approvedPhrases: [
        expect.objectContaining({
          kind: "ask_gpt",
          count: 3,
          rule: "up_to",
        }),
      ],
      reasoningMode: "strict",
    });
    expect(applyTaskUsage).toHaveBeenCalledWith({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    });
    expect(replaceCurrentTaskIntent).toHaveBeenCalledWith({
      intent: {
        goal: "Updated goal",
      },
      title: "Current title",
      originalInstruction: "Original instruction text",
    });
    expect(syncTaskDraftFromProtocol).toHaveBeenCalledWith({
      taskId: "task-1",
      title: "Updated title",
      goal: "Updated goal",
      compiledTaskPrompt:
        "<<SYS_TASK>>\nTITLE: Updated title\nGOAL: Updated goal\n<<END_SYS_TASK>>",
      originalInstruction: "Original instruction text",
    });
    expect(setPendingKinInjectionBlocks).toHaveBeenCalledWith([]);
    expect(setPendingKinInjectionIndex).toHaveBeenCalledWith(0);
    expect(setKinInput).toHaveBeenCalledWith(
      "<<SYS_TASK>>\nTITLE: Updated title\nGOAL: Updated goal\n<<END_SYS_TASK>>"
    );
  });

  it("stops before reinterpreting when the current task cannot be refreshed", async () => {
    const applyTaskUsage = vi.fn();

    await syncApprovedIntentPhrasesToCurrentTaskFlow({
      approvedIntentPhrases: [],
      sourceInstruction: "   ",
      currentTaskId: null,
      currentTaskTitle: "Current title",
      currentTaskDraftTitle: "Draft title",
      reasoningMode: "strict",
      applyTaskUsage,
      replaceCurrentTaskIntent: vi.fn(),
      syncTaskDraftFromProtocol: vi.fn(),
      setPendingKinInjectionBlocks: vi.fn(),
      setPendingKinInjectionIndex: vi.fn(),
      setKinInput: vi.fn(),
    });

    expect(resolveTaskIntentWithFallbackMock).not.toHaveBeenCalled();
    expect(applyTaskUsage).not.toHaveBeenCalled();
  });
});
