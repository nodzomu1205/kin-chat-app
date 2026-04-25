import {
  approveIntentCandidateFlow,
  prepareTaskRequestAckFlow,
  prepareTaskSuspendFlow,
  prepareTaskSyncFlow,
  rejectIntentCandidateFlow,
  resetProtocolDefaultsFlow,
  saveProtocolDefaultsFlow,
  sendProtocolRulebookToKinFlow,
  setProtocolRulebookToKinDraftFlow,
} from "@/lib/app/miscUiFlows";
import { getIntentCandidateSignature } from "@/lib/app/chatPageHelpers";
import { buildAppendGptMessage, buildTaskProtocolIntentSyncArgs } from "@/lib/app/task-runtime/taskRuntimeActionBuilders";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntentPhraseState";
import {
  buildNextApprovedIntentPhrasesOnApprove,
  buildNextApprovedIntentPhrasesOnDelete,
  buildNextApprovedIntentPhrasesOnUpdate,
} from "@/lib/taskIntentPhraseState";
import { syncApprovedIntentPhrasesToCurrentTaskFlow } from "@/lib/app/task-runtime/currentTaskIntentRefresh";
import type { UseTaskProtocolActionsArgs } from "@/hooks/chatPageActionTypes";

export function useTaskProtocolActions(
  args: UseTaskProtocolActionsArgs,
  deps: { sendKinMessage: (text: string) => Promise<void> }
) {
  const appendGptMessage = buildAppendGptMessage(args.setGptMessages);

  const syncApprovedIntentPhrasesToCurrentTask = (
    approvedIntentPhrases: ApprovedIntentPhrase[]
  ) =>
    syncApprovedIntentPhrasesToCurrentTaskFlow(
      buildTaskProtocolIntentSyncArgs(args, approvedIntentPhrases)
    );

  const prepareTaskRequestAck = (requestId: string) => {
    prepareTaskRequestAckFlow({
      requestId,
      prepareWaitingAckMessage: args.taskProtocol.prepareWaitingAckMessage,
      setKinInput: args.setKinInput,
      appendGptMessage,
      setActiveTabToKin: args.focusKinPanel,
    });
  };

  const prepareTaskSync = (note: string) => {
    prepareTaskSyncFlow({
      note,
      prepareTaskSyncMessage: args.taskProtocol.prepareTaskSyncMessage,
      setKinInput: args.setKinInput,
      appendGptMessage,
      setActiveTabToKin: args.focusKinPanel,
    });
  };

  const prepareTaskSuspend = (note: string) => {
    prepareTaskSuspendFlow({
      note,
      prepareTaskSuspendMessage: args.taskProtocol.prepareTaskSuspendMessage,
      setKinInput: args.setKinInput,
      appendGptMessage,
      setActiveTabToKin: args.focusKinPanel,
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
      appendGptMessage,
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

    await syncApprovedIntentPhrasesToCurrentTask(nextApprovedIntentPhrases);
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
    });
    args.setApprovedIntentPhrases(nextApprovedIntentPhrases);
    void syncApprovedIntentPhrasesToCurrentTask(nextApprovedIntentPhrases);
  };

  const deleteApprovedIntentPhrase = (phraseId: string) => {
    const nextApprovedIntentPhrases = buildNextApprovedIntentPhrasesOnDelete({
      approvedIntentPhrases: args.approvedIntentPhrases,
      phraseId,
    });
    args.setApprovedIntentPhrases(nextApprovedIntentPhrases);
    void syncApprovedIntentPhrasesToCurrentTask(nextApprovedIntentPhrases);
  };

  const setProtocolRulebookToKinDraft = () => {
    setProtocolRulebookToKinDraftFlow({
      protocolRulebook: args.protocolRulebook,
      setKinInput: args.setKinInput,
      appendGptMessage,
      setActiveTabToKin: args.focusKinPanel,
    });
  };

  const sendProtocolRulebookToKin = async () => {
    await sendProtocolRulebookToKinFlow({
      protocolRulebook: args.protocolRulebook,
      sendKinMessage: deps.sendKinMessage,
      appendGptMessage,
      setActiveTabToKin: args.focusKinPanel,
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
