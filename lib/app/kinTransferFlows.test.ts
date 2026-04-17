import { describe, expect, it, vi } from "vitest";
import { sendCurrentTaskContentToKinFlow } from "@/lib/app/kinTransferFlows";

describe("kinTransferFlows", () => {
  it("bootstraps a new task from the current instruction when no task draft exists", async () => {
    const setGptMessages = vi.fn();
    const setPendingKinInjectionBlocks = vi.fn();
    const setPendingKinInjectionIndex = vi.fn();
    const setKinInput = vi.fn();
    const setGptInput = vi.fn();
    const setActiveTabToKin = vi.fn();
    const applyTaskUsage = vi.fn();
    const syncTaskDraftFromProtocol = vi.fn();
    const startTask = vi.fn(() => ({
      taskId: "123456",
      title: "Prepared task",
      compiledTaskPrompt:
        "<<SYS_TASK>>\nTASK_ID: 123456\nBODY: Do the work.\n<<END_SYS_TASK>>",
    }));

    await sendCurrentTaskContentToKinFlow({
      gptInput: "farmers 360 の戦略を Kin タスク化して",
      getTaskBaseText: () => "",
      currentTaskSlot: 1,
      currentTaskTitle: "",
      currentTaskInstruction: "",
      approvedIntentPhrases: [],
      looksLikeTaskInstruction: () => false,
      runStartKinTaskFromInput: vi.fn(),
      resolveTransformIntent: async () =>
        ({
          intent: {
            mode: "sys_task",
            transform: "preserve",
          },
        }) as never,
      resolveTaskIntent: async () => ({
        intent: {
          goal: "farmers 360 の戦略整理",
        } as never,
        pendingCandidates: [],
      }),
      mergePendingIntentCandidates: vi.fn(),
      startTask,
      syncTaskDraftFromProtocol,
      responseMode: "strict",
      applyTaskUsage,
      shouldTransformContent: () => false,
      transformTextWithIntent: async () => ({ text: "" }),
      setGptLoading: vi.fn(),
      setGptMessages,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setKinInput,
      setGptInput,
      getTaskSlotLabel: () => "1",
      setActiveTabToKin,
    });

    expect(startTask).toHaveBeenCalledWith({
      originalInstruction: "farmers 360 の戦略を Kin タスク化して",
      intent: expect.objectContaining({
        goal: "farmers 360 の戦略整理",
      }),
      title: undefined,
    });
    expect(setPendingKinInjectionBlocks).toHaveBeenCalledWith([]);
    expect(setPendingKinInjectionIndex).toHaveBeenCalledWith(0);
    expect(syncTaskDraftFromProtocol).toHaveBeenCalledWith(
      expect.objectContaining({
        originalInstruction: "farmers 360 の戦略を Kin タスク化して",
      })
    );
    expect(setKinInput).toHaveBeenCalledWith(
      "<<SYS_TASK>>\nTASK_ID: 123456\nBODY: Do the work.\n<<END_SYS_TASK>>"
    );
    expect(setGptInput).toHaveBeenCalledWith("");
    expect(setActiveTabToKin).toHaveBeenCalled();
    expect(setGptMessages).toHaveBeenCalled();
    expect(applyTaskUsage).toHaveBeenCalled();
  });
});
