import {
  approveIntentCandidateFlow,
  prepareTaskRequestAckFlow,
  prepareTaskSyncFlow,
  rejectIntentCandidateFlow,
  resetProtocolDefaultsFlow,
  saveProtocolDefaultsFlow,
  sendProtocolRulebookToKinFlow,
  setProtocolRulebookToKinDraftFlow,
} from "@/lib/app/miscUiFlows";
import {
  buildPendingKinInjectionBlocks,
  DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
} from "@/lib/app/kinMultipart";
import { getIntentCandidateSignature } from "@/lib/app/chatPageHelpers";
import { resolveTaskIntentWithFallback } from "@/lib/taskIntent";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import type { UseChatPageActionsArgs } from "@/hooks/useChatPageActions";

export function useTaskProtocolActions(
  args: UseChatPageActionsArgs,
  deps: { sendKinMessage: (text: string) => Promise<void> }
) {
  const prepareTaskRequestAck = (requestId: string) => {
    prepareTaskRequestAckFlow({
      requestId,
      prepareWaitingAckMessage: args.taskProtocol.prepareWaitingAckMessage,
      setKinInput: args.setKinInput,
      appendGptMessage: (message) =>
        args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const prepareTaskSync = (note: string) => {
    prepareTaskSyncFlow({
      note,
      prepareTaskSyncMessage: args.taskProtocol.prepareTaskSyncMessage,
      setKinInput: args.setKinInput,
      appendGptMessage: (message) =>
        args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const resetProtocolDefaults = () => {
    resetProtocolDefaultsFlow({
      promptDefaultKey: args.promptDefaultKey,
      rulebookDefaultKey: args.rulebookDefaultKey,
      setProtocolPrompt: args.setProtocolPrompt,
      setProtocolRulebook: args.setProtocolRulebook,
    });
  };

  const saveProtocolDefaults = () => {
    saveProtocolDefaultsFlow({
      protocolPrompt: args.protocolPrompt,
      protocolRulebook: args.protocolRulebook,
      promptDefaultKey: args.promptDefaultKey,
      rulebookDefaultKey: args.rulebookDefaultKey,
      appendGptMessage: (message) =>
        args.setGptMessages((prev) => [...prev, message]),
    });
  };

  const approveIntentCandidate = async (candidateId: string) => {
    const candidate = args.pendingIntentCandidates.find(
      (item) => item.id === candidateId
    );
    if (!candidate) return;

    const exists = args.approvedIntentPhrases.some(
      (item) =>
        item.kind === candidate.kind &&
        item.phrase === candidate.phrase &&
        item.count === candidate.count &&
        item.rule === candidate.rule &&
        item.charLimit === candidate.charLimit
    );

    const nextApprovedIntentPhrases = exists
      ? args.approvedIntentPhrases
      : [
          {
            id: `approved-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            phrase: candidate.phrase,
            kind: candidate.kind,
            count: candidate.count,
            rule: candidate.rule,
            charLimit: candidate.charLimit,
            createdAt: new Date().toISOString(),
          },
          ...args.approvedIntentPhrases,
        ].slice(0, 100);

    approveIntentCandidateFlow({
      candidateId,
      pendingIntentCandidates: args.pendingIntentCandidates,
      setApprovedIntentPhrases: args.setApprovedIntentPhrases,
      setPendingIntentCandidates: args.setPendingIntentCandidates,
    });

    const sourceInstruction =
      args.currentTaskDraft.userInstruction?.trim() ||
      args.taskProtocol.runtime.currentTaskIntent?.goal?.trim() ||
      "";

    if (
      !sourceInstruction ||
      !args.taskProtocol.runtime.currentTaskId ||
      !args.taskProtocol.replaceCurrentTaskIntent
    ) {
      return;
    }

    const resolved = await resolveTaskIntentWithFallback({
      input: sourceInstruction,
      approvedPhrases: nextApprovedIntentPhrases,
      responseMode: args.responseMode === "creative" ? "creative" : "strict",
    });

    args.applyTaskUsage(resolved.usage);

    const replaced = args.taskProtocol.replaceCurrentTaskIntent({
      intent: resolved.intent,
      title:
        args.taskProtocol.runtime.currentTaskTitle || args.currentTaskDraft.title,
      originalInstruction: sourceInstruction,
    });

    if (!replaced) return;

    args.syncTaskDraftFromProtocol({
      taskId: replaced.taskId,
      title: replaced.title,
      goal: resolved.intent.goal,
      compiledTaskPrompt: replaced.compiledTaskPrompt,
    });
    const blocks = buildPendingKinInjectionBlocks(replaced.compiledTaskPrompt, {
      noticeLines: DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
    });
    args.setPendingKinInjectionBlocks(blocks.length > 1 ? blocks : []);
    args.setPendingKinInjectionIndex(0);
    args.setKinInput(blocks[0] ?? replaced.compiledTaskPrompt);
  };

  const updateIntentCandidate = (
    candidateId: string,
    patch: Partial<PendingIntentCandidate>
  ) => {
    args.setPendingIntentCandidates((prev) =>
      prev.map((item) =>
        item.id === candidateId
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const rejectIntentCandidate = (candidateId: string) => {
    rejectIntentCandidateFlow({
      candidateId,
      pendingIntentCandidates: args.pendingIntentCandidates,
      getIntentCandidateSignature,
      setRejectedIntentCandidateSignatures:
        args.setRejectedIntentCandidateSignatures,
      setPendingIntentCandidates: args.setPendingIntentCandidates,
    });
  };

  const updateApprovedIntentPhrase = (
    phraseId: string,
    patch: Partial<ApprovedIntentPhrase>
  ) => {
    args.setApprovedIntentPhrases((prev) =>
      prev.map((item) =>
        item.id === phraseId
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const deleteApprovedIntentPhrase = (phraseId: string) => {
    args.setApprovedIntentPhrases((prev) =>
      prev.filter((item) => item.id !== phraseId)
    );
  };

  const setProtocolRulebookToKinDraft = () => {
    setProtocolRulebookToKinDraftFlow({
      protocolRulebook: args.protocolRulebook,
      setKinInput: args.setKinInput,
      appendGptMessage: (message) =>
        args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  const sendProtocolRulebookToKin = async () => {
    await sendProtocolRulebookToKinFlow({
      protocolRulebook: args.protocolRulebook,
      sendKinMessage: deps.sendKinMessage,
      appendGptMessage: (message) =>
        args.setGptMessages((prev) => [...prev, message]),
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  return {
    prepareTaskRequestAck,
    prepareTaskSync,
    resetProtocolDefaults,
    saveProtocolDefaults,
    approveIntentCandidate,
    updateIntentCandidate,
    rejectIntentCandidate,
    updateApprovedIntentPhrase,
    deleteApprovedIntentPhrase,
    setProtocolRulebookToKinDraft,
    sendProtocolRulebookToKin,
  };
}
