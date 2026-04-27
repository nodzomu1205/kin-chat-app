import { describe, expect, it, vi } from "vitest";
import { runRegisterTaskDraftFlow } from "@/lib/app/task-runtime/kinTaskFlow";
import type { TaskIntent } from "@/types/taskProtocol";

function createIntent(): TaskIntent {
  return {
    mode: "task",
    goal: "Create the latest business plan.",
    output: {
      type: "essay",
      language: "ja",
      length: "medium",
    },
    workflow: {
      searchRequestCount: 5,
      searchRequestCountRule: "up_to",
      askGptCount: 3,
      askGptCountRule: "up_to",
      libraryReferenceCount: 1,
      libraryReferenceCountRule: "exact",
      allowSearchRequest: true,
      allowLibraryReference: true,
    },
    constraints: ["2000文字程度"],
    entities: [],
  };
}

describe("runRegisterTaskDraftFlow", () => {
  it("creates a SYS_TASK draft without injecting it into Kin input", async () => {
    const syncTaskDraftFromProtocol = vi.fn();
    const appendGptMessage = vi.fn();

    await runRegisterTaskDraftFlow({
      rawInput:
        "2000文字程度で事業計画の最新版を作ります。ライブラリデータ参照1回。検索5回迄、GPTへの依頼3回迄。",
      approvedIntentPhrases: [],
      reasoningMode: "strict",
      resolveIntent: vi.fn(async () => ({
        intent: createIntent(),
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
        pendingCandidates: [],
      })),
      applyTaskUsage: vi.fn(),
      mergePendingIntentCandidates: vi.fn(),
      syncTaskDraftFromProtocol,
      setGptInput: vi.fn(),
      setGptLoading: vi.fn(),
      appendGptMessage,
      extractTaskGoalFromSysTaskBlock: vi.fn(() => ""),
    });

    expect(syncTaskDraftFromProtocol).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: expect.stringMatching(/^R\d+/),
        goal: "Create the latest business plan.",
        originalInstruction:
          "2000文字程度で事業計画の最新版を作ります。ライブラリデータ参照1回。検索5回迄、GPTへの依頼3回迄。",
        compiledTaskPrompt: expect.stringContaining("<<SYS_TASK>>"),
      })
    );
    expect(appendGptMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Task registration draft generated."),
      })
    );
  });
});
