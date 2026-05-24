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
import {
  buildContinueTaskAfterMultipartReceiptBlock,
  extractTaskIdFromOutboundText,
  resolvePendingKinInjectionAction,
  shouldPromptKinToContinueAfterPendingInfoDelivery,
} from "@/lib/app/kin-protocol/sendToKinFlowState";
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

export function resolveKinSendTargets(args: {
  currentKin: string | null;
  selectedKinIds: string[];
  kinList: Array<{ id: string; label: string }>;
}) {
  const selectedTargets = args.selectedKinIds
    .map((id) => args.kinList.find((item) => item.id === id))
    .filter((item): item is { id: string; label: string } => Boolean(item));

  if (selectedTargets.length > 0) return selectedTargets;
  const current = args.currentKin
    ? args.kinList.find((item) => item.id === args.currentKin)
    : null;
  return current ? [current] : [];
}

function resolveCurrentKinTarget(args: {
  currentKin: string | null;
  kinList: Array<{ id: string; label: string }>;
}) {
  if (!args.currentKin) return null;
  return args.kinList.find((item) => item.id === args.currentKin) ?? null;
}

export function isTaskTargetedProtocolText(text: string) {
  return /<<SYS_(?:TASK|TASK_CONFIRM|USER_RESPONSE|GPT_RESPONSE|SEARCH_RESPONSE|YOUTUBE_TRANSCRIPT_RESPONSE|LIBRARY_DATA_RESPONSE|LIBRARY_IMAGE_DATA_RESPONSE|DRAFT_PREPARATION_RESPONSE|DRAFT_MODIFICATION_RESPONSE|PPT_DESIGN_RESPONSE|FILE_SAVING_RESPONSE)>>/i.test(
    text
  );
}

function isTaskMultipartPurpose(purpose: UseKinTransferActionsArgs["pendingKinInjectionPurpose"]) {
  return purpose === "task_context";
}

export async function applyMultiKinPendingInjectionAction(args: {
  text: string;
  replies: string[];
  pendingKinInjectionBlocks: string[];
  pendingKinInjectionIndex: number;
  pendingKinInjectionPurpose?: UseKinTransferActionsArgs["pendingKinInjectionPurpose"];
  setPendingKinInjectionIndex: UseKinTransferActionsArgs["setPendingKinInjectionIndex"];
  setKinInput: UseKinTransferActionsArgs["setKinInput"];
  clearPendingKinInjection: () => void;
  onPendingKinAck?: () => void | Promise<void>;
}) {
  if (args.pendingKinInjectionBlocks.length === 0 || args.replies.length === 0) {
    return;
  }

  const currentPendingBlock =
    args.pendingKinInjectionBlocks[args.pendingKinInjectionIndex] ?? null;
  const actions = args.replies.map((replyText) =>
    resolvePendingKinInjectionAction({
      text: args.text,
      currentPendingBlock,
      replyText,
      pendingKinInjectionIndex: args.pendingKinInjectionIndex,
      pendingKinInjectionBlocks: args.pendingKinInjectionBlocks,
    })
  );
  if (actions.some((action) => action.type === "none")) return;

  const firstAction = actions[0];
  if (firstAction.type === "advance") {
    args.setPendingKinInjectionIndex(firstAction.nextIndex);
    args.setKinInput(firstAction.nextInput);
    return;
  }

  if (firstAction.type === "complete") {
    args.clearPendingKinInjection();
    const shouldContinueTask = args.pendingKinInjectionPurpose === "task_context";
    if (shouldContinueTask) {
      await args.onPendingKinAck?.();
    }
    if (
      shouldContinueTask &&
      firstAction.finalReplyNeedsTaskContinuation &&
      args.replies.every((replyText) =>
        shouldPromptKinToContinueAfterPendingInfoDelivery(replyText)
      )
    ) {
      args.setKinInput(buildContinueTaskAfterMultipartReceiptBlock());
    }
  }
}

function appendKinTargetSendFailure(args: {
  targetLabel: string;
  setKinMessages: UseKinTransferActionsArgs["setKinMessages"];
}) {
  args.setKinMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "kin",
      text: "Kin did not return a usable response.",
      meta: { speakerLabel: args.targetLabel },
    },
  ]);
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
    const allTargets = resolveKinSendTargets({
      currentKin: args.currentKin,
      selectedKinIds: args.selectedKinIds,
      kinList: args.kinList,
    });
    const taskTarget = resolveCurrentKinTarget({
      currentKin: args.currentKin,
      kinList: args.kinList,
    });
    const shouldUseTaskTarget =
      isTaskTargetedProtocolText(text) ||
      isTaskMultipartPurpose(args.pendingKinInjectionPurpose);
    const sendTargets = shouldUseTaskTarget
      ? taskTarget
        ? [taskTarget]
        : []
      : allTargets;
    if (sendTargets.length === 0) return;

    if (sendTargets.length === 1) {
      await runSendKinMessageFlow({
        text,
        currentKin: sendTargets[0].id,
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
        kinSpeakerLabel: sendTargets[0].label,
      });
      return;
    }

    if (!text.trim() || args.kinLoading) return;
    args.setKinLoading(true);
    args.setKinMessages((prev) => [
      ...prev,
      { id: generateId(), role: "user", text },
    ]);
    args.setKinInput("");
    args.ingestProtocolMessage(text, "user_to_kin");
    try {
      const sendOne = async (target: { id: string; label: string }) => {
        const reply = await runSendKinMessageFlow({
            text,
            currentKin: target.id,
            kinLoading: false,
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
            kinSpeakerLabel: target.label,
            manageLoading: false,
            managePendingInjection: false,
            appendUserMessage: false,
        });
        if (!reply && args.pendingKinInjectionBlocks.length > 0) {
          appendKinTargetSendFailure({
            targetLabel: target.label,
            setKinMessages: args.setKinMessages,
          });
        }
        return reply;
      };
      const replies =
        args.pendingKinInjectionBlocks.length > 0
          ? []
          : await Promise.all(sendTargets.map(sendOne));

      if (args.pendingKinInjectionBlocks.length > 0) {
        for (const target of sendTargets) {
          replies.push(await sendOne(target));
        }
      }
      await applyMultiKinPendingInjectionAction({
        text,
        replies,
        pendingKinInjectionBlocks: args.pendingKinInjectionBlocks,
        pendingKinInjectionIndex: args.pendingKinInjectionIndex,
        pendingKinInjectionPurpose: args.pendingKinInjectionPurpose,
        setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
        setKinInput: args.setKinInput,
        clearPendingKinInjection,
        onPendingKinAck: deps?.onPendingKinAck,
      });
    } finally {
      args.setKinLoading(false);
    }
  };

  const sendKinToKinMessage = async (
    kinId: string,
    text: string,
    speakerLabel: string
  ) => {
    const reply = await runSendKinMessageFlow({
      text,
      currentKin: kinId,
      kinLoading: args.kinLoading,
      setKinConnectionState: args.setKinConnectionState,
      setKinLoading: args.setKinLoading,
      pendingKinInjectionBlocks: [],
      pendingKinInjectionIndex: 0,
      pendingKinInjectionPurpose: "none",
      setKinMessages: args.setKinMessages,
      setKinInput: args.setKinInput,
      ingestProtocolMessage: args.ingestProtocolMessage,
      processMultipartTaskDoneText: (replyText) =>
        args.processMultipartTaskDoneText(replyText),
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      clearPendingKinInjection,
      onKinReply: handleKinReplyProtocols,
      kinSpeakerLabel: speakerLabel,
    });
    return reply;
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
    sendKinToKinMessage,
    sendToKin,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
  };
}
