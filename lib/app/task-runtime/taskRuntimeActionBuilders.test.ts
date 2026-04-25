import { describe, expect, it, vi } from "vitest";
import { getIntentCandidateSignature } from "@/lib/app/chatPageHelpers";
import type {
  UseKinTransferActionsArgs,
  UseTaskProtocolActionsArgs,
} from "@/hooks/chatPageActionTypes";
import {
  buildSendCurrentTaskContentToKinFlowArgs,
  buildSendLatestGptContentToKinFlowArgs,
  buildStartKinTaskFlowArgs,
  buildTaskProtocolIntentSyncArgs,
  createPendingIntentCandidateMerger,
} from "@/lib/app/task-runtime/taskRuntimeActionBuilders";
import { createEmptyTaskDraft } from "@/types/task";
import type { TaskIntent } from "@/types/taskProtocol";

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

function createTaskProtocolArgs(): UseTaskProtocolActionsArgs {
  const taskProtocol = {
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
  } as unknown as UseTaskProtocolActionsArgs["taskProtocol"];

  return {
    applyTaskUsage: vi.fn(),
    approvedIntentPhrases: [],
    currentTaskDraft: {
      ...createEmptyTaskDraft(),
      title: "Draft title",
      userInstruction: "Draft instruction",
      slot: 2,
    },
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
    taskProtocol,
  };
}

function createKinTransferArgs(): UseKinTransferActionsArgs {
  const setPendingIntentCandidates = vi.fn();
  const rejectedCandidate = {
    id: "rejected",
    phrase: "Rejected",
    kind: "ask_gpt" as const,
    count: 1,
    rule: "up_to" as const,
    createdAt: "2026-04-18T00:00:00.000Z",
  };

  return {
    ...createTaskProtocolArgs(),
    currentKin: "kin-1",
    getTaskBaseText: vi.fn(() => "Task body"),
    getTaskSlotLabel: vi.fn(() => "2"),
    gptInput: "directive",
    gptMessages: [{ id: "g1", role: "gpt", text: "latest gpt" }],
    ingestProtocolMessage: vi.fn(),
    isMobile: false,
    kinInput: "",
    kinLoading: false,
    pendingIntentCandidates: [
      {
        id: "existing",
        phrase: "search up to 3 times",
        kind: "search_request",
        count: 3,
        rule: "up_to",
        sourceText: "search up to 3 times",
        createdAt: "2026-04-18T00:00:00.000Z",
      },
    ],
    pendingKinInjectionBlocks: [],
    pendingKinInjectionIndex: 0,
    processMultipartTaskDoneText: vi.fn(() => null),
    rejectedIntentCandidateSignatures: [getIntentCandidateSignature(rejectedCandidate)],
    setGptInput: vi.fn(),
    setGptLoading: vi.fn(),
    setKinConnectionState: vi.fn(),
    setKinLoading: vi.fn(),
    setKinMessages: vi.fn(),
    setPendingIntentCandidates,
    currentTaskDraft: {
      ...createEmptyTaskDraft(),
      title: "Draft title",
      userInstruction: "Draft instruction",
      slot: 2,
    },
    approvedIntentPhrases: [
      {
        id: "approved",
        phrase: "Approved",
        kind: "search_request",
        count: 3,
        rule: "up_to",
        createdAt: "2026-04-18T00:00:00.000Z",
      },
    ],
    taskProtocol: {
      ...(createTaskProtocolArgs().taskProtocol as unknown as object),
      startTask: vi.fn(),
    } as unknown as UseKinTransferActionsArgs["taskProtocol"],
  };
}

describe("taskRuntimeActionBuilders", () => {
  it("builds task protocol intent sync args from runtime and draft context", () => {
    const args = createTaskProtocolArgs();

    expect(
      buildTaskProtocolIntentSyncArgs(args, [
        {
          id: "approved",
          phrase: "search up to 3 times",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          createdAt: "2026-04-18T00:00:00.000Z",
        },
      ])
    ).toMatchObject({
      sourceInstruction: "Runtime original instruction",
      currentTaskId: "task-1",
      currentTaskTitle: "Runtime title",
      currentTaskDraftTitle: "Draft title",
      approvedIntentPhrases: [expect.objectContaining({ id: "approved" })],
    });
  });

  it("merges pending intent candidates while respecting approved/rejected/existing items", () => {
    const args = createKinTransferArgs();
    const merge = createPendingIntentCandidateMerger(args);

    merge([
      {
        id: "new-1",
        phrase: "Fresh",
        kind: "ask_gpt",
        count: 2,
        rule: "up_to",
        sourceText: "Fresh",
        createdAt: "2026-04-18T00:00:00.000Z",
      },
      {
        id: "dup-approved",
        phrase: "search the web at most 3 times",
        kind: "search_request",
        count: 3,
        rule: "up_to",
        sourceText: "search the web at most 3 times",
        createdAt: "2026-04-18T00:00:00.000Z",
      },
      {
        id: "dup-existing",
        phrase: "search up to 3 times",
        kind: "search_request",
        count: 3,
        rule: "up_to",
        sourceText: "search up to 3 times",
        createdAt: "2026-04-18T00:00:00.000Z",
      },
      {
        id: "rejected",
        phrase: "ask ChatGPT at most 1 time",
        kind: "ask_gpt",
        count: 1,
        rule: "up_to",
        sourceText: "ask ChatGPT at most 1 time",
        createdAt: "2026-04-18T00:00:00.000Z",
      },
    ]);

    const updater = (args.setPendingIntentCandidates as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(
      updater([
        {
          id: "existing",
          phrase: "search up to 3 times",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          sourceText: "search up to 3 times",
          createdAt: "2026-04-18T00:00:00.000Z",
        },
      ])
    ).toEqual([
      expect.objectContaining({ id: "new-1", phrase: "Fresh" }),
      expect.objectContaining({ id: "existing" }),
    ]);
  });

  it("builds Kin transfer flow args from the shared action state", () => {
    const args = createKinTransferArgs();
    const mergePendingIntentCandidates = vi.fn();

    expect(
      buildStartKinTaskFlowArgs(args, mergePendingIntentCandidates)
    ).toMatchObject({
      rawInput: "directive",
      approvedIntentPhrases: args.approvedIntentPhrases,
      mergePendingIntentCandidates,
    });

    expect(
      buildSendLatestGptContentToKinFlowArgs(args, mergePendingIntentCandidates)
    ).toMatchObject({
      gptInput: "directive",
      currentTaskSlot: 2,
      currentTaskTitle: "Draft title",
      mergePendingIntentCandidates,
    });

    expect(
      buildSendCurrentTaskContentToKinFlowArgs(
        args,
        mergePendingIntentCandidates,
        vi.fn()
      )
    ).toMatchObject({
      gptInput: "directive",
      currentTaskInstruction: "Draft instruction",
      currentTaskTitle: "Draft title",
      currentTaskSlot: 2,
      mergePendingIntentCandidates,
    });
  });
});
