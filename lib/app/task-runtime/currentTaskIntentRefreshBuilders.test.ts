import { describe, expect, it, vi } from "vitest";
import {
  buildCurrentTaskIntentRefreshApplyArgs,
  buildCurrentTaskIntentRefreshResolverArgs,
} from "@/lib/app/task-runtime/currentTaskIntentRefreshBuilders";

describe("currentTaskIntentRefreshBuilders", () => {
  it("builds resolver args only when the current task can be refreshed", () => {
    expect(
      buildCurrentTaskIntentRefreshResolverArgs({
        approvedIntentPhrases: [],
        sourceInstruction: " Original instruction ",
        currentTaskId: "task-1",
        currentTaskTitle: "Current title",
        currentTaskDraftTitle: "Draft title",
        reasoningMode: "strict",
        applyTaskUsage: vi.fn(),
        replaceCurrentTaskIntent: vi.fn(),
        syncTaskDraftFromProtocol: vi.fn(),
        setPendingKinInjectionBlocks: vi.fn(),
        setPendingKinInjectionIndex: vi.fn(),
        setKinInput: vi.fn(),
      })
    ).toMatchObject({
      sourceInstruction: "Original instruction",
      currentTaskTitle: "Current title",
      currentTaskDraftTitle: "Draft title",
    });

    expect(
      buildCurrentTaskIntentRefreshResolverArgs({
        approvedIntentPhrases: [],
        sourceInstruction: "   ",
        currentTaskId: null,
        currentTaskTitle: "Current title",
        currentTaskDraftTitle: "Draft title",
        reasoningMode: "strict",
        applyTaskUsage: vi.fn(),
        replaceCurrentTaskIntent: vi.fn(),
        syncTaskDraftFromProtocol: vi.fn(),
        setPendingKinInjectionBlocks: vi.fn(),
        setPendingKinInjectionIndex: vi.fn(),
        setKinInput: vi.fn(),
      })
    ).toBeNull();
  });

  it("builds resolver args for a registration draft without an active runtime task", () => {
    expect(
      buildCurrentTaskIntentRefreshResolverArgs({
        approvedIntentPhrases: [],
        sourceInstruction: " Registration instruction ",
        currentTaskId: null,
        currentTaskDraftTaskId: "R123456",
        currentTaskTitle: "",
        currentTaskDraftTitle: "Registration draft",
        reasoningMode: "strict",
        applyTaskUsage: vi.fn(),
        replaceCurrentTaskIntent: vi.fn(),
        syncTaskDraftFromProtocol: vi.fn(),
        setPendingKinInjectionBlocks: vi.fn(),
        setPendingKinInjectionIndex: vi.fn(),
        setKinInput: vi.fn(),
      })
    ).toMatchObject({
      sourceInstruction: "Registration instruction",
      currentTaskDraftTitle: "Registration draft",
      replaceCurrentTaskIntent: undefined,
    });
  });

  it("builds apply args for draft sync and Kin injection from the refreshed task", () => {
    expect(
      buildCurrentTaskIntentRefreshApplyArgs({
        sourceInstruction: "Original instruction",
        resolvedIntent: {
          goal: "Updated goal",
        } as never,
        replacedTask: {
          taskId: "task-1",
          title: "Updated title",
          compiledTaskPrompt: "<<SYS_TASK>>body<<END_SYS_TASK>>",
        },
        syncTaskDraftFromProtocol: vi.fn(),
        setPendingKinInjectionBlocks: vi.fn(),
        setPendingKinInjectionIndex: vi.fn(),
        setKinInput: vi.fn(),
      })
    ).toEqual({
      syncTaskDraftArgs: {
        taskId: "task-1",
        title: "Updated title",
        goal: "Updated goal",
        intent: {
          goal: "Updated goal",
        },
        compiledTaskPrompt: "<<SYS_TASK>>body<<END_SYS_TASK>>",
        originalInstruction: "Original instruction",
      },
      kinInjectionArgs: {
        compiledTaskPrompt: "<<SYS_TASK>>body<<END_SYS_TASK>>",
        setPendingKinInjectionBlocks: expect.any(Function),
        setPendingKinInjectionIndex: expect.any(Function),
        setPendingKinInjectionPurpose: undefined,
        setKinInput: expect.any(Function),
      },
    });
  });
});
