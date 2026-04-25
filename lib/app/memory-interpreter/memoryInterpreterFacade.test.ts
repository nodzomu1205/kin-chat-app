import { describe, expect, it, vi } from "vitest";

const {
  buildInterpretedMemoryStateMock,
  orchestrateMemoryFallbackMock,
} = vi.hoisted(() => ({
  buildInterpretedMemoryStateMock: vi.fn(),
  orchestrateMemoryFallbackMock: vi.fn(),
}));

vi.mock("@/lib/app/memory-interpreter/memoryInterpreterStateAssembly", () => ({
  buildInterpretedMemoryState: buildInterpretedMemoryStateMock,
}));

vi.mock("@/lib/app/memory-interpreter/memoryInterpreterFallbackOrchestrator", () => ({
  orchestrateMemoryFallback: orchestrateMemoryFallbackMock,
}));

import {
  interpretMemoryState,
  resolveMemoryFallbackOptions,
} from "@/lib/app/memory-interpreter/memoryInterpreter";

describe("memoryInterpreter facade", () => {
  it("delegates memory state interpretation", () => {
    buildInterpretedMemoryStateMock.mockReturnValueOnce({
      context: { currentTopic: "Sample Topic" },
    });

    const input = {
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      recentMessages: [],
    };

    expect(interpretMemoryState(input)).toEqual({
      context: { currentTopic: "Sample Topic" },
    });
    expect(buildInterpretedMemoryStateMock).toHaveBeenCalledWith(input);
  });

  it("delegates fallback resolution", async () => {
    orchestrateMemoryFallbackMock.mockResolvedValueOnce({
      adjudication: { preserveExistingTopic: true },
      pendingCandidates: [],
      usedFallback: true,
    });

    const args = {
      latestUserText: "それって本当ですか？",
      recentMessages: [],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: { currentTopic: "ソクラテス" },
      },
      settings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedRules: [],
    };

    await expect(resolveMemoryFallbackOptions(args)).resolves.toEqual({
      adjudication: { preserveExistingTopic: true },
      pendingCandidates: [],
      usedFallback: true,
    });
    expect(orchestrateMemoryFallbackMock).toHaveBeenCalledWith(args);
  });
});
