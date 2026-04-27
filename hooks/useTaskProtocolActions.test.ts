import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyTaskDraft } from "@/types/task";
import type { TaskIntent } from "@/types/taskProtocol";

const { syncApprovedIntentPhrasesToCurrentTaskFlowMock } = vi.hoisted(() => ({
  syncApprovedIntentPhrasesToCurrentTaskFlowMock: vi.fn(),
}));

vi.mock("@/lib/app/ui-state/miscUiFlows", async () => {
  const actual = await vi.importActual<typeof import("@/lib/app/ui-state/miscUiFlows")>(
    "@/lib/app/ui-state/miscUiFlows"
  );

  return {
    ...actual,
  };
});

vi.mock("@/lib/app/task-runtime/currentTaskIntentRefresh", () => ({
  syncApprovedIntentPhrasesToCurrentTaskFlow:
    syncApprovedIntentPhrasesToCurrentTaskFlowMock,
}));

import { useTaskProtocolActions } from "@/hooks/useTaskProtocolActions";

function createTaskIntent(goal: string): TaskIntent {
  return {
    mode: "task",
    goal,
    output: {
      type: "essay",
      language: "ja",
      length: "medium",
    },
    workflow: {},
    constraints: [],
    entities: [],
  };
}

function createArgs(
  overrides: Partial<Parameters<typeof useTaskProtocolActions>[0]> = {}
): Parameters<typeof useTaskProtocolActions>[0] {
  return {
    applyTaskUsage: vi.fn(),
    approvedIntentPhrases: [],
    currentTaskDraft: {
      ...createEmptyTaskDraft(),
      title: "Draft title",
      userInstruction: "Draft instruction",
    },
    taskRegistrationDraft: createEmptyTaskDraft(),
    focusKinPanel: vi.fn(() => false),
    pendingIntentCandidates: [],
    promptDefaultKey: "prompt-default",
    protocolPrompt: "prompt",
    protocolRulebook: "rulebook",
    reasoningMode: "strict",
    rulebookDefaultKey: "rulebook-default",
    setApprovedIntentPhrases: vi.fn(),
    setGptMessages: vi.fn(),
    setKinInput: vi.fn(),
    setPendingIntentCandidates: vi.fn(),
    setPendingKinInjectionBlocks: vi.fn(),
    setPendingKinInjectionIndex: vi.fn(),
    setProtocolPrompt: vi.fn(),
    setProtocolRulebook: vi.fn(),
    setRejectedIntentCandidateSignatures: vi.fn(),
    syncTaskDraftFromProtocol: vi.fn(),
    syncTaskRegistrationDraftFromProtocol: vi.fn(),
    taskProtocol: {
      runtime: {
        currentTaskId: "task-1",
        currentTaskTitle: "Runtime title",
        currentTaskIntent: createTaskIntent("Runtime goal"),
        originalInstruction: "Runtime original instruction",
      },
      replaceCurrentTaskIntent: vi.fn(),
      prepareWaitingAckMessage: vi.fn(),
      prepareTaskSyncMessage: vi.fn(),
      prepareTaskSuspendMessage: vi.fn(),
    } as unknown as Parameters<typeof useTaskProtocolActions>[0]["taskProtocol"],
    ...overrides,
  };
}

describe("useTaskProtocolActions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses runtime original instruction when approving a candidate", async () => {
    const args = createArgs({
      pendingIntentCandidates: [
        {
          id: "cand-1",
          phrase: "search up to 3 times",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          sourceText: "search up to 3 times",
          createdAt: "2026-04-17T00:00:00.000Z",
        },
      ],
    });

    const actions = useTaskProtocolActions(args, {
      sendKinMessage: vi.fn(),
    });

    await actions.approveIntentCandidate("cand-1");

    expect(syncApprovedIntentPhrasesToCurrentTaskFlowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceInstruction: "Runtime original instruction",
        currentTaskId: "task-1",
      })
    );
  });

  it("falls back to draft user instruction when updating an approved phrase", () => {
    const args = createArgs({
      approvedIntentPhrases: [
        {
          id: "phrase-1",
          phrase: "GPT request up to 3 times",
          kind: "ask_gpt",
          count: 3,
          rule: "up_to",
          draftText: "CAN ask GPT up to 3 times",
          createdAt: "2026-04-17T00:00:00.000Z",
        },
      ],
      currentTaskDraft: {
        ...createEmptyTaskDraft(),
        title: "Draft title",
        userInstruction: "Draft instruction only",
      },
      taskProtocol: {
        runtime: {
          currentTaskId: "task-1",
          currentTaskTitle: "Runtime title",
          currentTaskIntent: createTaskIntent("Runtime goal"),
          originalInstruction: "",
        },
        replaceCurrentTaskIntent: vi.fn(),
        prepareWaitingAckMessage: vi.fn(),
        prepareTaskSyncMessage: vi.fn(),
        prepareTaskSuspendMessage: vi.fn(),
      } as unknown as Parameters<typeof useTaskProtocolActions>[0]["taskProtocol"],
    });

    const actions = useTaskProtocolActions(args, {
      sendKinMessage: vi.fn(),
    });

    actions.updateApprovedIntentPhrase("phrase-1", {
      draftText: "CAN ask GPT up to 5 times",
    });

    expect(syncApprovedIntentPhrasesToCurrentTaskFlowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceInstruction: "Draft instruction only",
        approvedIntentPhrases: [
          expect.objectContaining({
            kind: "ask_gpt",
            count: 3,
            rule: "up_to",
            draftText: "CAN ask GPT up to 5 times",
          }),
        ],
      })
    );
  });

  it("falls back to the current task goal when deleting an approved phrase", () => {
    const args = createArgs({
      approvedIntentPhrases: [
        {
          id: "phrase-1",
          phrase: "search up to 3 times",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          createdAt: "2026-04-17T00:00:00.000Z",
        },
      ],
      currentTaskDraft: {
        ...createEmptyTaskDraft(),
        title: "Draft title",
        userInstruction: "",
      },
      taskProtocol: {
        runtime: {
          currentTaskId: "task-1",
          currentTaskTitle: "Runtime title",
          currentTaskIntent: createTaskIntent("Runtime goal fallback"),
          originalInstruction: "",
        },
        replaceCurrentTaskIntent: vi.fn(),
        prepareWaitingAckMessage: vi.fn(),
        prepareTaskSyncMessage: vi.fn(),
        prepareTaskSuspendMessage: vi.fn(),
      } as unknown as Parameters<typeof useTaskProtocolActions>[0]["taskProtocol"],
    });

    const actions = useTaskProtocolActions(args, {
      sendKinMessage: vi.fn(),
    });

    actions.deleteApprovedIntentPhrase("phrase-1");

    expect(syncApprovedIntentPhrasesToCurrentTaskFlowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceInstruction: "Runtime goal fallback",
        approvedIntentPhrases: [],
      })
    );
  });
});
