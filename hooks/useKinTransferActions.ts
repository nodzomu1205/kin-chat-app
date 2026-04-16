import {
  sendCurrentTaskContentToKinFlow,
  sendLatestGptContentToKinFlow,
} from "@/lib/app/kinTransferFlows";
import { runSendKinMessageFlow } from "@/lib/app/sendToKinFlow";
import { runStartKinTaskFlow } from "@/lib/app/kinTaskFlow";
import {
  buildPendingIntentCandidateKey,
  extractTaskGoalFromSysTaskBlock,
  getIntentCandidateSignature,
  toTransformResponseMode,
} from "@/lib/app/chatPageHelpers";
import {
  looksLikeTaskInstruction,
  resolveTaskIntentWithFallback,
} from "@/lib/taskIntent";
import {
  resolveTransformIntent,
  shouldTransformContent,
  transformTextWithIntent,
} from "@/lib/app/transformIntent";
import type { UseKinTransferActionsArgs } from "@/hooks/chatPageActionTypes";

export function useKinTransferActions(
  args: UseKinTransferActionsArgs,
  deps?: { onPendingKinAck?: () => void | Promise<void> }
) {
  const clearPendingKinInjection = () => {
    args.setPendingKinInjectionBlocks([]);
    args.setPendingKinInjectionIndex(0);
  };

  const mergePendingIntentCandidates = (candidates: typeof args.pendingIntentCandidates) => {
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

  const runStartKinTaskFromInput = async () => {
    await runStartKinTaskFlow({
      rawInput: args.gptInput,
      approvedIntentPhrases: args.approvedIntentPhrases,
      responseMode: args.responseMode === "creative" ? "creative" : "strict",
      resolveIntent: resolveTaskIntentWithFallback,
      applyTaskUsage: args.applyTaskUsage,
      mergePendingIntentCandidates,
      startTask: args.taskProtocol.startTask,
      syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setKinInput: args.setKinInput,
      setGptInput: args.setGptInput,
      appendGptMessage: (message) => args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
      extractTaskGoalFromSysTaskBlock,
    });
  };

  const sendKinMessage = async (text: string) => {
    await runSendKinMessageFlow({
      text,
      currentKin: args.currentKin,
      kinLoading: args.kinLoading,
      setKinConnectionState: args.setKinConnectionState,
      setKinLoading: args.setKinLoading,
      pendingKinInjectionBlocks: args.pendingKinInjectionBlocks,
      pendingKinInjectionIndex: args.pendingKinInjectionIndex,
      setKinMessages: args.setKinMessages,
      setKinInput: args.setKinInput,
      ingestProtocolMessage: args.ingestProtocolMessage,
      processMultipartTaskDoneText: (replyText) =>
        args.processMultipartTaskDoneText(replyText),
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      clearPendingKinInjection,
      onPendingKinAck: deps?.onPendingKinAck,
    });
  };

  const sendToKin = async () => {
    await sendKinMessage(args.kinInput.trim());
  };

  const sendLastGptToKinDraft = () => {
    const last = [...args.gptMessages].reverse().find((m) => m.role === "gpt");
    if (!last) return;

    args.setKinInput(last.text);
    if (args.isMobile) args.setActiveTab("kin");
  };

  const sendLatestGptContentToKin = async () => {
    await sendLatestGptContentToKinFlow({
      gptMessages: args.gptMessages,
      gptInput: args.gptInput,
      currentTaskSlot: args.currentTaskDraft.slot,
      currentTaskTitle: args.currentTaskDraft.title,
      approvedIntentPhrases: args.approvedIntentPhrases,
      resolveTransformIntent: ({ input, defaultMode, responseMode }) =>
        resolveTransformIntent({ input, defaultMode, responseMode }),
      resolveTaskIntent: resolveTaskIntentWithFallback,
      mergePendingIntentCandidates,
      startTask: args.taskProtocol.startTask,
      syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
      responseMode: toTransformResponseMode(args.responseMode),
      applyTaskUsage: args.applyTaskUsage,
      shouldTransformContent,
      transformTextWithIntent: ({ text, intent, responseMode }) =>
        transformTextWithIntent({ text, intent, responseMode }),
      setGptLoading: args.setGptLoading,
      setGptMessages: args.setGptMessages,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setKinInput: args.setKinInput,
      setGptInput: args.setGptInput,
      getTaskSlotLabel: args.getTaskSlotLabel,
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const sendCurrentTaskContentToKin = async () => {
    await sendCurrentTaskContentToKinFlow({
      gptInput: args.gptInput,
      getTaskBaseText: args.getTaskBaseText,
      currentTaskSlot: args.currentTaskDraft.slot,
      currentTaskTitle: args.currentTaskDraft.title,
      currentTaskInstruction: args.currentTaskDraft.userInstruction,
      approvedIntentPhrases: args.approvedIntentPhrases,
      looksLikeTaskInstruction,
      runStartKinTaskFromInput,
      resolveTransformIntent: ({ input, defaultMode, responseMode }) =>
        resolveTransformIntent({ input, defaultMode, responseMode }),
      resolveTaskIntent: resolveTaskIntentWithFallback,
      mergePendingIntentCandidates,
      startTask: args.taskProtocol.startTask,
      syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
      responseMode: toTransformResponseMode(args.responseMode),
      applyTaskUsage: args.applyTaskUsage,
      shouldTransformContent,
      transformTextWithIntent: ({ text, intent, responseMode }) =>
        transformTextWithIntent({ text, intent, responseMode }),
      setGptLoading: args.setGptLoading,
      setGptMessages: args.setGptMessages,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setKinInput: args.setKinInput,
      setGptInput: args.setGptInput,
      getTaskSlotLabel: args.getTaskSlotLabel,
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  return {
    clearPendingKinInjection,
    runStartKinTaskFromInput,
    sendKinMessage,
    sendToKin,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
  };
}
