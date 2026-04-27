import {
  sendCurrentTaskContentToKinFlow,
  sendLatestGptContentToKinFlow,
} from "@/lib/app/task-runtime/kinTransferFlows";
import { runSendKinMessageFlow } from "@/lib/app/kin-protocol/sendToKinFlow";
import { applyCompiledTaskPromptToKinInput } from "@/lib/app/task-support/kinTaskInjection";
import { generateId } from "@/lib/shared/uuid";
import {
  runRegisterTaskDraftFlow,
  runStartKinTaskFlow,
} from "@/lib/app/task-runtime/kinTaskFlow";
import {
  buildRegisterTaskDraftFlowArgs,
  buildSendCurrentTaskContentToKinFlowArgs,
  buildSendLatestGptContentToKinFlowArgs,
  buildStartKinTaskFlowArgs,
  createPendingIntentCandidateMerger,
} from "@/lib/app/task-runtime/taskRuntimeActionBuilders";
import type { UseKinTransferActionsArgs } from "@/hooks/chatPageActionTypes";
import { findLatestTransferableGptMessage } from "@/lib/app/task-support/latestGptMessage";
import type { RegisteredTask } from "@/lib/app/task-registration/taskRegistration";
import { extractTaskIdFromOutboundText } from "@/lib/app/kin-protocol/sendToKinFlowState";
import { extractTaskProtocolEvents } from "@/lib/task/taskRuntimeProtocol";

function findRegisteredTaskForOutboundSysTask(
  tasks: RegisteredTask[],
  text: string
) {
  const taskId = extractTaskIdFromOutboundText(text);
  if (taskId) {
    const normalizedTaskId = taskId.replace(/^#/, "").trim();
    const matched = tasks.find((task) => {
      const registeredTaskId = (task.draft.taskId || task.id)
        .replace(/^#/, "")
        .trim();
      return registeredTaskId === normalizedTaskId;
    });
    if (matched) return matched;
  }
  return tasks.find((task) => {
    const compiledTaskPrompt = (task.draft.kinTaskText || task.draft.body).trim();
    return compiledTaskPrompt && text.includes(compiledTaskPrompt.slice(0, 80));
  });
}

export function useKinTransferActions(
  args: UseKinTransferActionsArgs,
  deps?: { onPendingKinAck?: () => void | Promise<void> }
) {
  const clearPendingKinInjection = () => {
    args.setPendingKinInjectionBlocks([]);
    args.setPendingKinInjectionIndex(0);
    args.setPendingKinInjectionPurpose?.("none");
  };

  const mergePendingIntentCandidates = createPendingIntentCandidateMerger(args);

  const runStartKinTaskFromInput = async () => {
    await runStartKinTaskFlow(
      buildStartKinTaskFlowArgs(args, mergePendingIntentCandidates)
    );
  };

  const registerTaskDraftFromInput = async () => {
    await runRegisterTaskDraftFlow(
      buildRegisterTaskDraftFlowArgs(args, mergePendingIntentCandidates)
    );
  };

  const registerTaskDraftFromProposal = async (proposalText: string) => {
    await runRegisterTaskDraftFlow({
      ...buildRegisterTaskDraftFlowArgs(args, mergePendingIntentCandidates),
      rawInput: proposalText,
    });
  };

  const handleSysTaskSent = async (text: string) => {
    const registeredTask = findRegisteredTaskForOutboundSysTask(
      args.registeredTasks,
      text
    );
    if (!registeredTask) return;
    args.taskProtocol.startRegisteredTaskRuntime?.(registeredTask);
    args.applyRegisteredTaskRuntimeSettings?.(registeredTask);
  };

  const handleKinReplyProtocols = async (replyText: string) => {
    const proposal = extractTaskProtocolEvents(replyText).find(
      (event) => event.type === "task_proposal"
    );
    if (!proposal) return;
    await registerTaskDraftFromProposal(
      proposal.body || proposal.summary || replyText
    );
  };

  const startRegisteredTask = (task: RegisteredTask) => {
    const compiledTaskPrompt = (task.draft.kinTaskText || task.draft.body).trim();
    if (!compiledTaskPrompt) return;

    const injection = applyCompiledTaskPromptToKinInput({
      compiledTaskPrompt,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setPendingKinInjectionPurpose: args.setPendingKinInjectionPurpose,
      setKinInput: args.setKinInput,
    });
    args.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text:
          injection.partCount > 1
            ? `Registered task set to Kin input and split into ${injection.partCount} Kin parts.`
            : "Registered task set to Kin input.",
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      },
    ]);
    args.focusKinPanel();
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
      pendingKinInjectionPurpose: args.pendingKinInjectionPurpose,
      setKinMessages: args.setKinMessages,
      setKinInput: args.setKinInput,
      ingestProtocolMessage: args.ingestProtocolMessage,
      processMultipartTaskDoneText: (replyText) =>
        args.processMultipartTaskDoneText(replyText),
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      clearPendingKinInjection,
      onPendingKinAck: deps?.onPendingKinAck,
      onSysTaskSent: handleSysTaskSent,
      onKinReply: handleKinReplyProtocols,
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
    registerTaskDraftFromInput,
    runStartKinTaskFromInput,
    startRegisteredTask,
    sendKinMessage,
    sendToKin,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
  };
}
