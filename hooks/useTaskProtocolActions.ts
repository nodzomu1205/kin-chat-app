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
import { getIntentCandidateSignature } from "@/lib/app/chatPageHelpers";
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

  const approveIntentCandidate = (candidateId: string) => {
    approveIntentCandidateFlow({
      candidateId,
      pendingIntentCandidates: args.pendingIntentCandidates,
      setApprovedIntentPhrases: args.setApprovedIntentPhrases,
      setPendingIntentCandidates: args.setPendingIntentCandidates,
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
