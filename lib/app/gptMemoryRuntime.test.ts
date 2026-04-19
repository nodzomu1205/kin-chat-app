import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import {
  loadInitialGptMemoryRuntimeState,
  runGptMemoryRuntimeApprovedRulesReapply,
  runGptMemoryRuntimeUpdate,
} from "@/lib/app/gptMemoryRuntime";

const runGptMemoryUpdateCycleMock = vi.fn();
const runGptMemoryApprovedRulesReapplyCycleMock = vi.fn();
const loadStoredGptMemorySettingsMock = vi.fn();
const loadStoredKinMemoryMapMock = vi.fn();
const resolveActiveKinMemoryStateMock = vi.fn();

vi.mock("@/lib/app/gptMemoryUpdateCoordinator", () => ({
  runGptMemoryUpdateCycle: (...args: unknown[]) =>
    runGptMemoryUpdateCycleMock(...args),
  runGptMemoryApprovedRulesReapplyCycle: (...args: unknown[]) =>
    runGptMemoryApprovedRulesReapplyCycleMock(...args),
  runGptMemoryApprovedCandidateReapplyCycle: vi.fn(),
  runGptMemoryRejectedCandidateReapplyCycle: vi.fn(),
}));

vi.mock("@/lib/app/gptMemoryStoreCoordinator", () => ({
  loadStoredGptMemorySettings: (...args: unknown[]) =>
    loadStoredGptMemorySettingsMock(...args),
  loadStoredKinMemoryMap: (...args: unknown[]) =>
    loadStoredKinMemoryMapMock(...args),
  resolveActiveKinMemoryState: (...args: unknown[]) =>
    resolveActiveKinMemoryStateMock(...args),
}));

describe("gptMemoryRuntime", () => {
  beforeEach(() => {
    runGptMemoryUpdateCycleMock.mockReset();
    runGptMemoryApprovedRulesReapplyCycleMock.mockReset();
    loadStoredGptMemorySettingsMock.mockReset();
    loadStoredKinMemoryMapMock.mockReset();
    resolveActiveKinMemoryStateMock.mockReset();
  });

  it("loads the initial runtime state through the shared store coordinator", () => {
    const kinMemoryMap = {
      "kin-1": { memory: { facts: [], preferences: [], lists: {}, context: {} }, recentMessages: [] },
    };
    const gptState = kinMemoryMap["kin-1"];

    loadStoredGptMemorySettingsMock.mockReturnValue(DEFAULT_MEMORY_SETTINGS);
    loadStoredKinMemoryMapMock.mockReturnValue(kinMemoryMap);
    resolveActiveKinMemoryStateMock.mockReturnValue(gptState);

    expect(loadInitialGptMemoryRuntimeState("kin-1")).toEqual({
      settings: DEFAULT_MEMORY_SETTINGS,
      kinMemoryMap,
      gptState,
    });
  });

  it("delegates runtime update through the shared config bundle", async () => {
    runGptMemoryUpdateCycleMock.mockResolvedValue({
      nextState: null,
      compressionUsage: null,
    });

    const config = {
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedMemoryRules: [],
      rejectedMemoryRuleCandidateSignatures: [],
      onAddPendingMemoryRuleCandidates: vi.fn(),
    };

    await runGptMemoryRuntimeUpdate({
      currentState: {
        memory: { facts: [], preferences: [], lists: {}, context: {} },
        recentMessages: [],
      },
      updatedRecent: [{ id: "m1", role: "user", text: "hello" }],
      settings: DEFAULT_MEMORY_SETTINGS,
      config,
      runtimeConfig: {
        rejectedMemoryRuleCandidateSignatures: ["sig-1"],
      },
    });

    expect(runGptMemoryUpdateCycleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedRecent: [{ id: "m1", role: "user", text: "hello" }],
        memoryInterpreterSettings: config.memoryInterpreterSettings,
        approvedMemoryRules: [],
        rejectedMemoryRuleCandidateSignatures: [],
        rejectedMemoryRuleCandidateSignaturesOverride: ["sig-1"],
        onAddPendingMemoryRuleCandidates: config.onAddPendingMemoryRuleCandidates,
      })
    );
  });

  it("delegates approved-rules reapply through the shared config bundle", async () => {
    runGptMemoryApprovedRulesReapplyCycleMock.mockResolvedValue({
      nextState: null,
      compressionUsage: null,
    });

    const config = {
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedMemoryRules: [],
      rejectedMemoryRuleCandidateSignatures: ["sig-0"],
      onAddPendingMemoryRuleCandidates: vi.fn(),
    };

    await runGptMemoryRuntimeApprovedRulesReapply({
      currentState: {
        memory: { facts: [], preferences: [], lists: {}, context: {} },
        recentMessages: [],
      },
      settings: DEFAULT_MEMORY_SETTINGS,
      config,
      approvedMemoryRulesOverride: [{ id: "r1", kind: "topic_alias", phrase: "Topic", createdAt: "2026-04-19T00:00:00.000Z" }],
    });

    expect(runGptMemoryApprovedRulesReapplyCycleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryInterpreterSettings: config.memoryInterpreterSettings,
        rejectedMemoryRuleCandidateSignatures: ["sig-0"],
        onAddPendingMemoryRuleCandidates: config.onAddPendingMemoryRuleCandidates,
      })
    );
  });
});

