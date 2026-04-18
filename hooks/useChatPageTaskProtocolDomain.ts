import { usePendingMemoryRuleQueue } from "@/hooks/usePendingMemoryRuleQueue";
import { useGptMemory } from "@/hooks/useGptMemory";
import { useMemoryInterpreterSettings } from "@/hooks/useMemoryInterpreterSettings";
import { useMemoryRuleActions } from "@/hooks/useMemoryRuleActions";
import { useProtocolIntentSettings } from "@/hooks/useProtocolIntentSettings";
import { useTaskDraftHelpers } from "@/hooks/useTaskDraftHelpers";
import { useTaskProtocolProjection } from "@/hooks/useTaskProtocolProjection";
import { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";
import {
  buildChatPageGptMemoryRuntime,
  buildChatPageGptMemorySettingsControls,
} from "@/lib/app/chatPageGptMemoryControls";
import type { Message } from "@/types/chat";
import type { TaskDraft } from "@/types/task";

type UseChatPageTaskProtocolDomainArgs = {
  currentKin: string | null;
  currentTaskDraft: TaskDraft;
  gptMessages: Message[];
  setCurrentTaskDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
  deleteSearchHistoryItemBase: (rawResultId: string) => void;
};

export function useChatPageTaskProtocolDomain(
  args: UseChatPageTaskProtocolDomainArgs
) {
  const {
    memoryInterpreterSettings,
    setMemoryInterpreterSettings,
    pendingMemoryRuleCandidates,
    setPendingMemoryRuleCandidates,
    approvedMemoryRules,
    setApprovedMemoryRules,
    rejectedMemoryRuleCandidateSignatures,
    setRejectedMemoryRuleCandidateSignatures,
  } = useMemoryInterpreterSettings();

  const { enqueuePendingMemoryRuleCandidates } = usePendingMemoryRuleQueue({
    approvedMemoryRules,
    setPendingMemoryRuleCandidates,
  });

  const {
    gptState,
    setGptState,
    gptStateRef,
    handleGptMemory,
    resetGptForCurrentKin,
    reapplyCurrentMemoryWithApprovedCandidate,
    reapplyCurrentMemoryWithRejectedCandidate,
    persistCurrentGptState,
    clearTaskScopedMemory,
    ensureKinState,
    removeKinState,
    chatRecentLimit,
    memorySettings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings,
  } = useGptMemory(args.currentKin, {
    memoryInterpreterSettings,
    approvedMemoryRules,
    rejectedMemoryRuleCandidateSignatures,
    onAddPendingMemoryRuleCandidates: enqueuePendingMemoryRuleCandidates,
  });

  const gptMemoryRuntime = buildChatPageGptMemoryRuntime({
    gptStateRef,
    setGptState,
    persistCurrentGptState,
    handleGptMemory,
    chatRecentLimit,
    clearTaskScopedMemory,
    resetGptForCurrentKin,
  });

  const {
    pendingIntentCandidates,
    setPendingIntentCandidates,
    approvedIntentPhrases,
    setApprovedIntentPhrases,
    rejectedIntentCandidateSignatures,
    setRejectedIntentCandidateSignatures,
    protocolPrompt,
    setProtocolPrompt,
    protocolRulebook,
    setProtocolRulebook,
  } = useProtocolIntentSettings();

  const taskProtocol = useKinTaskProtocol();
  const taskProtocolView = useTaskProtocolProjection(taskProtocol);

  const {
    updateMemoryInterpreterSettings,
    updateMemoryRuleCandidate,
    approveMemoryRuleCandidate,
    rejectMemoryRuleCandidate,
    deleteApprovedMemoryRule,
  } = useMemoryRuleActions({
    setMemoryInterpreterSettings,
    pendingMemoryRuleCandidates,
    approvedMemoryRules,
    setPendingMemoryRuleCandidates,
    setApprovedMemoryRules,
    setRejectedMemoryRuleCandidateSignatures,
    onApproveCandidateApplied: async (candidate, nextApprovedRules) => {
      await reapplyCurrentMemoryWithApprovedCandidate(
        candidate,
        nextApprovedRules
      );
    },
    onRejectCandidateApplied: async (candidate, nextRejectedSignatures) => {
      await reapplyCurrentMemoryWithRejectedCandidate(
        candidate,
        nextRejectedSignatures
      );
    },
  });

  const {
    deleteSearchHistoryItem,
    resetCurrentTaskDraft,
    getCurrentTaskCharConstraint,
    updateTaskDraftFields,
    applyPrefixedTaskFieldsFromText,
    getTaskSlotLabel,
    getResolvedTaskTitle,
    resolveTaskTitleFromDraft,
    getTaskBaseText,
    syncTaskDraftFromProtocol,
  } = useTaskDraftHelpers({
    currentTaskDraft: args.currentTaskDraft,
    gptMessages: args.gptMessages,
    setCurrentTaskDraft: args.setCurrentTaskDraft,
    resetTaskProtocolRuntime: taskProtocolView.resetRuntime,
    clearTaskScopedMemory: gptMemoryRuntime.clearTaskScopedMemory,
    deleteSearchHistoryItemBase: args.deleteSearchHistoryItemBase,
    currentTaskIntentConstraints: taskProtocolView.currentTaskIntentConstraints,
  });

  const gptMemorySettingsControls = buildChatPageGptMemorySettingsControls({
    updateMemorySettings,
    resetMemorySettings,
  });

  return {
    memoryInterpreterSettings,
    pendingMemoryRuleCandidates,
    approvedMemoryRules,
    gptState,
    resetGptForCurrentKin,
    ensureKinState,
    removeKinState,
    memorySettings,
    defaultMemorySettings,
    pendingIntentCandidates,
    setPendingIntentCandidates,
    approvedIntentPhrases,
    setApprovedIntentPhrases,
    rejectedIntentCandidateSignatures,
    setRejectedIntentCandidateSignatures,
    protocolPrompt,
    setProtocolPrompt,
    protocolRulebook,
    setProtocolRulebook,
    taskProtocol,
    taskProtocolView,
    updateMemoryInterpreterSettings,
    updateMemoryRuleCandidate,
    approveMemoryRuleCandidate,
    rejectMemoryRuleCandidate,
    deleteApprovedMemoryRule,
    deleteSearchHistoryItem,
    resetCurrentTaskDraft,
    getCurrentTaskCharConstraint,
    updateTaskDraftFields,
    applyPrefixedTaskFieldsFromText,
    getTaskSlotLabel,
    getResolvedTaskTitle,
    resolveTaskTitleFromDraft,
    getTaskBaseText,
    syncTaskDraftFromProtocol,
    gptMemoryRuntime,
    gptMemorySettingsControls,
  };
}
