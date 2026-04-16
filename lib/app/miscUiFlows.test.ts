import { describe, expect, it, vi } from "vitest";
import {
  buildNextApprovedIntentPhrasesOnApprove,
  syncApprovedIntentPhrasesToCurrentTaskFlow,
} from "@/lib/app/miscUiFlows";

describe("miscUiFlows", () => {
  it("increments approval counts when the same candidate is approved again", () => {
    const next = buildNextApprovedIntentPhrasesOnApprove({
      pendingIntentCandidates: [
        {
          id: "cand-1",
          phrase: "検索3回迄",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          createdAt: "2026-04-16T00:00:00.000Z",
          sourceText: "検索3回迄",
        },
      ],
      approvedIntentPhrases: [
        {
          id: "approved-1",
          phrase: "検索3回迄",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          approvedCount: 2,
          rejectedCount: 0,
          createdAt: "2026-04-16T00:00:00.000Z",
        },
      ],
      candidateId: "cand-1",
    });

    expect(next[0]?.approvedCount).toBe(3);
  });

  it("rebuilds the current task and updates the Kin input immediately", async () => {
    const applyTaskUsage = vi.fn();
    const replaceCurrentTaskIntent = vi.fn().mockReturnValue({
      taskId: "123",
      title: "縄文時代YouTube動画分析",
      compiledTaskPrompt: "<<SYS_TASK>>\nTITLE: 縄文時代YouTube動画分析\n<<END_SYS_TASK>>",
    });
    const syncTaskDraftFromProtocol = vi.fn();
    const setPendingKinInjectionBlocks = vi.fn();
    const setPendingKinInjectionIndex = vi.fn();
    const setKinInput = vi.fn();

    await syncApprovedIntentPhrasesToCurrentTaskFlow({
      approvedIntentPhrases: [
        {
          id: "approved-1",
          phrase: "検索3回迄",
          draftText: "CAN search request up to 3 times",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          approvedCount: 1,
          rejectedCount: 0,
          createdAt: "2026-04-16T00:00:00.000Z",
        },
      ],
      sourceInstruction: "縄文時代について調べて。検索3回迄。",
      currentTaskId: "123",
      currentTaskTitle: "旧タイトル",
      currentTaskDraftTitle: "ドラフトタイトル",
      responseMode: "strict",
      applyTaskUsage,
      replaceCurrentTaskIntent,
      syncTaskDraftFromProtocol,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setKinInput,
    });

    expect(replaceCurrentTaskIntent).toHaveBeenCalled();
    expect(syncTaskDraftFromProtocol).toHaveBeenCalled();
    expect(setPendingKinInjectionIndex).toHaveBeenCalledWith(0);
    expect(setKinInput).toHaveBeenCalledWith(
      "<<SYS_TASK>>\nTITLE: 縄文時代YouTube動画分析\n<<END_SYS_TASK>>"
    );
  });

  it("normalizes edited draft text into structured approved phrases on approve", () => {
    const next = buildNextApprovedIntentPhrasesOnApprove({
      pendingIntentCandidates: [
        {
          id: "cand-1",
          phrase: "検索3回迄",
          draftText: "CAN search request up to 3 times",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          createdAt: "2026-04-16T00:00:00.000Z",
          sourceText: "検索3回迄",
        },
      ],
      approvedIntentPhrases: [],
      candidateId: "cand-1",
    });

    expect(next[0]).toEqual(
      expect.objectContaining({
        kind: "search_request",
        count: 3,
        rule: "up_to",
        draftText: "CAN search request up to 3 times",
      })
    );
  });
});
