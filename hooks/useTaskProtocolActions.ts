import {
  approveIntentCandidateFlow,
  buildNextApprovedIntentPhrasesOnApprove,
  buildNextApprovedIntentPhrasesOnDelete,
  buildNextApprovedIntentPhrasesOnUpdate,
  prepareTaskRequestAckFlow,
  prepareTaskSuspendFlow,
  prepareTaskSyncFlow,
  rejectIntentCandidateFlow,
  resetProtocolDefaultsFlow,
  saveProtocolDefaultsFlow,
  sendProtocolRulebookToKinFlow,
  setProtocolRulebookToKinDraftFlow,
  syncApprovedIntentPhrasesToCurrentTaskFlow,
} from "@/lib/app/miscUiFlows";
import { getIntentCandidateSignature } from "@/lib/app/chatPageHelpers";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import { parseIntentCandidateDraftText } from "@/lib/taskIntent";
import type { UseTaskProtocolActionsArgs } from "@/hooks/chatPageActionTypes";

export function useTaskProtocolActions(
  args: UseTaskProtocolActionsArgs,
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

  const prepareTaskSuspend = (note: string) => {
    prepareTaskSuspendFlow({
      note,
      prepareTaskSuspendMessage: args.taskProtocol.prepareTaskSuspendMessage,
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

    const nextApprovedIntentPhrases = buildNextApprovedIntentPhrasesOnApprove({
      pendingIntentCandidates: args.pendingIntentCandidates,
      approvedIntentPhrases: args.approvedIntentPhrases,
      candidateId,
    });

    approveIntentCandidateFlow({
      candidateId,
      pendingIntentCandidates: args.pendingIntentCandidates,
      setApprovedIntentPhrases: args.setApprovedIntentPhrases,
      setPendingIntentCandidates: args.setPendingIntentCandidates,
    });

    await syncApprovedIntentPhrasesToCurrentTaskFlow({
      approvedIntentPhrases: nextApprovedIntentPhrases,
      sourceInstruction:
        args.currentTaskDraft.userInstruction?.trim() ||
        args.taskProtocol.runtime.currentTaskIntent?.goal?.trim() ||
        "",
      currentTaskId: args.taskProtocol.runtime.currentTaskId,
      currentTaskTitle: args.taskProtocol.runtime.currentTaskTitle,
      currentTaskDraftTitle: args.currentTaskDraft.title,
      responseMode: args.responseMode === "creative" ? "creative" : "strict",
      applyTaskUsage: args.applyTaskUsage,
      replaceCurrentTaskIntent: args.taskProtocol.replaceCurrentTaskIntent,
      syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setKinInput: args.setKinInput,
    });
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
    const nextApprovedIntentPhrases = buildNextApprovedIntentPhrasesOnUpdate({
      approvedIntentPhrases: args.approvedIntentPhrases,
      phraseId,
      patch,
    }).map((item) =>
      item.id === phraseId && typeof item.draftText === "string"
        ? {
            ...item,
            ...parseIntentCandidateDraftText(item.draftText, item as PendingIntentCandidate),
          }
        : item
    );
    args.setApprovedIntentPhrases(nextApprovedIntentPhrases);
    void syncApprovedIntentPhrasesToCurrentTaskFlow({
      approvedIntentPhrases: nextApprovedIntentPhrases,
      sourceInstruction:
        args.currentTaskDraft.userInstruction?.trim() ||
        args.taskProtocol.runtime.currentTaskIntent?.goal?.trim() ||
        "",
      currentTaskId: args.taskProtocol.runtime.currentTaskId,
      currentTaskTitle: args.taskProtocol.runtime.currentTaskTitle,
      currentTaskDraftTitle: args.currentTaskDraft.title,
      responseMode: args.responseMode === "creative" ? "creative" : "strict",
      applyTaskUsage: args.applyTaskUsage,
      replaceCurrentTaskIntent: args.taskProtocol.replaceCurrentTaskIntent,
      syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setKinInput: args.setKinInput,
    });
  };

  const deleteApprovedIntentPhrase = (phraseId: string) => {
    const nextApprovedIntentPhrases = buildNextApprovedIntentPhrasesOnDelete({
      approvedIntentPhrases: args.approvedIntentPhrases,
      phraseId,
    });
    args.setApprovedIntentPhrases(nextApprovedIntentPhrases);
    void syncApprovedIntentPhrasesToCurrentTaskFlow({
      approvedIntentPhrases: nextApprovedIntentPhrases,
      sourceInstruction:
        args.currentTaskDraft.userInstruction?.trim() ||
        args.taskProtocol.runtime.currentTaskIntent?.goal?.trim() ||
        "",
      currentTaskId: args.taskProtocol.runtime.currentTaskId,
      currentTaskTitle: args.taskProtocol.runtime.currentTaskTitle,
      currentTaskDraftTitle: args.currentTaskDraft.title,
      responseMode: args.responseMode === "creative" ? "creative" : "strict",
      applyTaskUsage: args.applyTaskUsage,
      replaceCurrentTaskIntent: args.taskProtocol.replaceCurrentTaskIntent,
      syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setKinInput: args.setKinInput,
    });
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
    prepareTaskSuspend,
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
