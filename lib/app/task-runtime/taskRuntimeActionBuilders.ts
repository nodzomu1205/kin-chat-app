import {
  buildPendingIntentCandidateKey,
  extractTaskGoalFromSysTaskBlock,
  getIntentCandidateSignature,
} from "@/lib/app/ui-state/chatPageHelpers";
import { looksLikeKinTaskStartInstruction } from "@/lib/app/task-support/kinTaskStartDetection";
import { resolveTaskRecompileSourceInstruction } from "@/lib/task/taskProtocolTaskState";
import {
  resolveTaskIntentWithFallback,
} from "@/lib/task/taskIntent";
import {
  resolveTransformIntent,
  shouldTransformContent,
  transformTextWithIntent,
} from "@/lib/app/task-runtime/transformIntent";
import type { runStartKinTaskFlow } from "@/lib/app/task-runtime/kinTaskFlow";
import type {
  sendCurrentTaskContentToKinFlow,
  sendLatestGptContentToKinFlow,
} from "@/lib/app/task-runtime/kinTransferFlows";
import type { syncApprovedIntentPhrasesToCurrentTaskFlow } from "@/lib/app/task-runtime/currentTaskIntentRefresh";
import type {
  UseKinTransferActionsArgs,
  UseTaskProtocolActionsArgs,
} from "@/hooks/chatPageActionTypes";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/task/taskIntent";
import type { Message } from "@/types/chat";

export function buildAppendGptMessage(
  setGptMessages: (
    updater: (prev: Message[]) => Message[]
  ) => void
) {
  return (message: Message) => {
    setGptMessages((prev) => [...prev, message]);
  };
}

export function buildTaskProtocolIntentSyncArgs(
  args: UseTaskProtocolActionsArgs,
  approvedIntentPhrases: ApprovedIntentPhrase[]
): Parameters<typeof syncApprovedIntentPhrasesToCurrentTaskFlow>[0] {
  return {
    approvedIntentPhrases,
    sourceInstruction: resolveTaskRecompileSourceInstruction({
      originalInstruction: args.taskProtocol.runtime.originalInstruction,
      draftUserInstruction: args.currentTaskDraft.userInstruction,
      intentGoal: args.taskProtocol.runtime.currentTaskIntent?.goal,
    }),
    currentTaskId: args.taskProtocol.runtime.currentTaskId,
    currentTaskTitle: args.taskProtocol.runtime.currentTaskTitle,
    currentTaskDraftTitle: args.currentTaskDraft.title,
    reasoningMode: args.reasoningMode === "creative" ? "creative" : "strict",
    applyTaskUsage: args.applyTaskUsage,
    replaceCurrentTaskIntent: args.taskProtocol.replaceCurrentTaskIntent,
    syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setKinInput: args.setKinInput,
  };
}

export function createPendingIntentCandidateMerger(
  args: Pick<
    UseKinTransferActionsArgs,
    | "approvedIntentPhrases"
    | "pendingIntentCandidates"
    | "rejectedIntentCandidateSignatures"
    | "setPendingIntentCandidates"
  >
) {
  return (candidates: PendingIntentCandidate[]) => {
    args.setPendingIntentCandidates((prev) => {
      const rejected = new Set(args.rejectedIntentCandidateSignatures);
      const approved = new Set(
        args.approvedIntentPhrases.map((item) => getIntentCandidateSignature(item))
      );
      const existingKeys = new Set(
        prev.map((item) => buildPendingIntentCandidateKey(item))
      );
      const additions = candidates.filter((item) => {
        const key = buildPendingIntentCandidateKey(item);
        const signature = getIntentCandidateSignature(item);
        return !existingKeys.has(key) && !rejected.has(signature) && !approved.has(signature);
      });
      return additions.length > 0 ? [...additions, ...prev].slice(0, 50) : prev;
    });
  };
}

export function buildStartKinTaskFlowArgs(
  args: UseKinTransferActionsArgs,
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void
): Parameters<typeof runStartKinTaskFlow>[0] {
  const reasoningMode = args.reasoningMode === "creative" ? "creative" : "strict";

  return {
    rawInput: args.gptInput,
    approvedIntentPhrases: args.approvedIntentPhrases,
    reasoningMode,
    resolveIntent: resolveTaskIntentWithFallback,
    applyTaskUsage: args.applyTaskUsage,
    mergePendingIntentCandidates,
    startTask: args.taskProtocol.startTask,
    syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setKinInput: args.setKinInput,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    appendGptMessage: buildAppendGptMessage(args.setGptMessages),
    setActiveTabToKin: args.focusKinPanel,
    extractTaskGoalFromSysTaskBlock,
  };
}

export function buildSendLatestGptContentToKinFlowArgs(
  args: UseKinTransferActionsArgs,
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void
): Parameters<typeof sendLatestGptContentToKinFlow>[0] {
  return {
    gptMessages: args.gptMessages,
    gptInput: args.gptInput,
    currentTaskSlot: args.currentTaskDraft.slot,
    currentTaskTitle: args.currentTaskDraft.title,
    approvedIntentPhrases: args.approvedIntentPhrases,
    resolveTransformIntent: ({ input, defaultMode, reasoningMode }: {
      input: string;
      defaultMode: "sys_info" | "sys_task";
      reasoningMode: "strict" | "creative";
    }) => resolveTransformIntent({ input, defaultMode, reasoningMode }),
    resolveTaskIntent: resolveTaskIntentWithFallback,
    mergePendingIntentCandidates,
    startTask: args.taskProtocol.startTask,
    syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
    reasoningMode: args.reasoningMode,
    applyTaskUsage: args.applyTaskUsage,
    shouldTransformContent,
    transformTextWithIntent: ({ text, intent, reasoningMode }: {
      text: string;
      intent: Parameters<typeof transformTextWithIntent>[0]["intent"];
      reasoningMode: "strict" | "creative";
    }) => transformTextWithIntent({ text, intent, reasoningMode }),
    setGptLoading: args.setGptLoading,
    setGptMessages: args.setGptMessages,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setKinInput: args.setKinInput,
    setGptInput: args.setGptInput,
    getTaskSlotLabel: args.getTaskSlotLabel,
    setActiveTabToKin: args.focusKinPanel,
  };
}

export function buildSendCurrentTaskContentToKinFlowArgs(
  args: UseKinTransferActionsArgs,
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void,
  runStartKinTaskFromInput: () => void | Promise<void>
): Parameters<typeof sendCurrentTaskContentToKinFlow>[0] {
  return {
    gptInput: args.gptInput,
    getTaskBaseText: args.getTaskBaseText,
    currentTaskSlot: args.currentTaskDraft.slot,
    currentTaskTitle: args.currentTaskDraft.title,
    currentTaskInstruction: args.currentTaskDraft.userInstruction,
    approvedIntentPhrases: args.approvedIntentPhrases,
    looksLikeTaskInstruction: looksLikeKinTaskStartInstruction,
    runStartKinTaskFromInput,
    resolveTransformIntent: ({ input, defaultMode, reasoningMode }: {
      input: string;
      defaultMode: "sys_info" | "sys_task";
      reasoningMode: "strict" | "creative";
    }) => resolveTransformIntent({ input, defaultMode, reasoningMode }),
    resolveTaskIntent: resolveTaskIntentWithFallback,
    mergePendingIntentCandidates,
    startTask: args.taskProtocol.startTask,
    syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
    reasoningMode: args.reasoningMode,
    applyTaskUsage: args.applyTaskUsage,
    shouldTransformContent,
    transformTextWithIntent: ({ text, intent, reasoningMode }: {
      text: string;
      intent: Parameters<typeof transformTextWithIntent>[0]["intent"];
      reasoningMode: "strict" | "creative";
    }) => transformTextWithIntent({ text, intent, reasoningMode }),
    setGptLoading: args.setGptLoading,
    setGptMessages: args.setGptMessages,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setKinInput: args.setKinInput,
    setGptInput: args.setGptInput,
    getTaskSlotLabel: args.getTaskSlotLabel,
    setActiveTabToKin: args.focusKinPanel,
  };
}
