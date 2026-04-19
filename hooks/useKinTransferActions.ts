import {
  sendCurrentTaskContentToKinFlow,
  sendLatestGptContentToKinFlow,
} from "@/lib/app/kinTransferFlows";
import { runSendKinMessageFlow } from "@/lib/app/sendToKinFlow";
import { runStartKinTaskFlow } from "@/lib/app/kinTaskFlow";
import {
  buildSendCurrentTaskContentToKinFlowArgs,
  buildSendLatestGptContentToKinFlowArgs,
  buildStartKinTaskFlowArgs,
  createPendingIntentCandidateMerger,
} from "@/lib/app/taskRuntimeActionBuilders";
import type { UseKinTransferActionsArgs } from "@/hooks/chatPageActionTypes";
import { findLatestTransferableGptMessage } from "@/lib/app/latestGptMessage";

export function useKinTransferActions(
  args: UseKinTransferActionsArgs,
  deps?: { onPendingKinAck?: () => void | Promise<void> }
) {
  const clearPendingKinInjection = () => {
    args.setPendingKinInjectionBlocks([]);
    args.setPendingKinInjectionIndex(0);
  };

  const mergePendingIntentCandidates = createPendingIntentCandidateMerger(args);

  const runStartKinTaskFromInput = async () => {
    await runStartKinTaskFlow(
      buildStartKinTaskFlowArgs(args, mergePendingIntentCandidates)
    );
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
    const last = findLatestTransferableGptMessage(args.gptMessages);
    if (!last) return;

    args.setKinInput(last.text);
    args.focusKinPanel();
  };

  const sendLatestGptContentToKin = async () => {
    await sendLatestGptContentToKinFlow(
      buildSendLatestGptContentToKinFlowArgs(args, mergePendingIntentCandidates)
    );
  };

  const sendCurrentTaskContentToKin = async () => {
    await sendCurrentTaskContentToKinFlow(
      buildSendCurrentTaskContentToKinFlowArgs(
        args,
        mergePendingIntentCandidates,
        runStartKinTaskFromInput
      )
    );
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
