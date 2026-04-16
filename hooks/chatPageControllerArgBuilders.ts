import type {
  UseChatPageActionsArgs,
  UseFileIngestActionsArgs,
  UseGptMessageActionsArgs,
  UseKinTransferActionsArgs,
  UseTaskDraftActionsArgs,
  UseTaskProtocolActionsArgs,
} from "@/hooks/chatPageActionTypes";

export function buildGptMessageActionArgs(
  actions: UseChatPageActionsArgs
): UseGptMessageActionsArgs {
  return {
    applyChatUsage: actions.applyChatUsage,
    applyPrefixedTaskFieldsFromText: actions.applyPrefixedTaskFieldsFromText,
    applySearchUsage: actions.applySearchUsage,
    applySummaryUsage: actions.applySummaryUsage,
    buildLibraryReferenceContext: actions.buildLibraryReferenceContext,
    chatBridgeSettings: actions.chatBridgeSettings,
    currentTaskDraft: actions.currentTaskDraft,
    getAskAiModeLinkForQuery: actions.getAskAiModeLinkForQuery,
    getContinuationTokenForSeries: actions.getContinuationTokenForSeries,
    gptInput: actions.gptInput,
    gptLoading: actions.gptLoading,
    gptMemoryRuntime: actions.gptMemoryRuntime,
    ingestProtocolMessage: actions.ingestProtocolMessage,
    isMobile: actions.isMobile,
    kinMessages: actions.kinMessages,
    lastSearchContext: actions.lastSearchContext,
    libraryIndexResponseCount: actions.libraryIndexResponseCount,
    processMultipartTaskDoneText: actions.processMultipartTaskDoneText,
    recordIngestedDocument: actions.recordIngestedDocument,
    recordSearchContext: actions.recordSearchContext,
    referenceLibraryItems: actions.referenceLibraryItems,
    responseMode: actions.responseMode,
    searchEngines: actions.searchEngines,
    searchLocation: actions.searchLocation,
    searchMode: actions.searchMode,
    setActiveTab: actions.setActiveTab,
    setGptInput: actions.setGptInput,
    setGptLoading: actions.setGptLoading,
    setGptMessages: actions.setGptMessages,
    setKinInput: actions.setKinInput,
    setPendingKinInjectionBlocks: actions.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: actions.setPendingKinInjectionIndex,
    taskProtocol: actions.taskProtocol,
  };
}

export function buildKinTransferActionArgs(
  actions: UseChatPageActionsArgs
): UseKinTransferActionsArgs {
  return {
    applyTaskUsage: actions.applyTaskUsage,
    approvedIntentPhrases: actions.approvedIntentPhrases,
    currentKin: actions.currentKin,
    currentTaskDraft: actions.currentTaskDraft,
    getTaskBaseText: actions.getTaskBaseText,
    getTaskSlotLabel: actions.getTaskSlotLabel,
    gptInput: actions.gptInput,
    gptMessages: actions.gptMessages,
    ingestProtocolMessage: actions.ingestProtocolMessage,
    isMobile: actions.isMobile,
    kinInput: actions.kinInput,
    kinLoading: actions.kinLoading,
    pendingIntentCandidates: actions.pendingIntentCandidates,
    pendingKinInjectionBlocks: actions.pendingKinInjectionBlocks,
    pendingKinInjectionIndex: actions.pendingKinInjectionIndex,
    processMultipartTaskDoneText: actions.processMultipartTaskDoneText,
    rejectedIntentCandidateSignatures:
      actions.rejectedIntentCandidateSignatures,
    responseMode: actions.responseMode,
    setActiveTab: actions.setActiveTab,
    setGptInput: actions.setGptInput,
    setGptLoading: actions.setGptLoading,
    setGptMessages: actions.setGptMessages,
    setKinConnectionState: actions.setKinConnectionState,
    setKinInput: actions.setKinInput,
    setKinLoading: actions.setKinLoading,
    setKinMessages: actions.setKinMessages,
    setPendingIntentCandidates: actions.setPendingIntentCandidates,
    setPendingKinInjectionBlocks: actions.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: actions.setPendingKinInjectionIndex,
    syncTaskDraftFromProtocol: actions.syncTaskDraftFromProtocol,
    taskProtocol: actions.taskProtocol,
  };
}

export function buildTaskDraftActionArgs(
  actions: UseChatPageActionsArgs
): UseTaskDraftActionsArgs {
  return {
    applyPrefixedTaskFieldsFromText: actions.applyPrefixedTaskFieldsFromText,
    applySummaryUsage: actions.applySummaryUsage,
    applyTaskUsage: actions.applyTaskUsage,
    currentTaskDraft: actions.currentTaskDraft,
    getResolvedTaskTitle: actions.getResolvedTaskTitle,
    getTaskBaseText: actions.getTaskBaseText,
    getTaskLibraryItem: actions.getTaskLibraryItem,
    gptInput: actions.gptInput,
    gptLoading: actions.gptLoading,
    gptMemoryRuntime: actions.gptMemoryRuntime,
    gptMessages: actions.gptMessages,
    lastSearchContext: actions.lastSearchContext,
    setCurrentTaskDraft: actions.setCurrentTaskDraft,
    setGptInput: actions.setGptInput,
    setGptLoading: actions.setGptLoading,
    setGptMessages: actions.setGptMessages,
  };
}

export function buildTaskProtocolActionArgs(
  actions: UseChatPageActionsArgs
): UseTaskProtocolActionsArgs {
  return {
    applyTaskUsage: actions.applyTaskUsage,
    approvedIntentPhrases: actions.approvedIntentPhrases,
    currentTaskDraft: actions.currentTaskDraft,
    isMobile: actions.isMobile,
    pendingIntentCandidates: actions.pendingIntentCandidates,
    promptDefaultKey: actions.promptDefaultKey,
    protocolPrompt: actions.protocolPrompt,
    protocolRulebook: actions.protocolRulebook,
    responseMode: actions.responseMode,
    rulebookDefaultKey: actions.rulebookDefaultKey,
    setActiveTab: actions.setActiveTab,
    setApprovedIntentPhrases: actions.setApprovedIntentPhrases,
    setGptMessages: actions.setGptMessages,
    setKinInput: actions.setKinInput,
    setPendingIntentCandidates: actions.setPendingIntentCandidates,
    setPendingKinInjectionBlocks: actions.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: actions.setPendingKinInjectionIndex,
    setProtocolPrompt: actions.setProtocolPrompt,
    setProtocolRulebook: actions.setProtocolRulebook,
    setRejectedIntentCandidateSignatures:
      actions.setRejectedIntentCandidateSignatures,
    syncTaskDraftFromProtocol: actions.syncTaskDraftFromProtocol,
    taskProtocol: actions.taskProtocol,
  };
}

export function buildFileIngestActionArgs(
  actions: UseChatPageActionsArgs
): UseFileIngestActionsArgs {
  return {
    applyIngestUsage: actions.applyIngestUsage,
    applyTaskUsage: actions.applyTaskUsage,
    autoCopyFileIngestSysInfoToKin:
      actions.autoCopyFileIngestSysInfoToKin,
    currentTaskDraft: actions.currentTaskDraft,
    getResolvedTaskTitle: actions.getResolvedTaskTitle,
    getTaskBaseText: actions.getTaskBaseText,
    gptInput: actions.gptInput,
    gptMemoryRuntime: actions.gptMemoryRuntime,
    ingestLoading: actions.ingestLoading,
    isMobile: actions.isMobile,
    recordIngestedDocument: actions.recordIngestedDocument,
    resolveTaskTitleFromDraft: actions.resolveTaskTitleFromDraft,
    responseMode: actions.responseMode,
    setActiveTab: actions.setActiveTab,
    setCurrentTaskDraft: actions.setCurrentTaskDraft,
    setGptInput: actions.setGptInput,
    setGptMessages: actions.setGptMessages,
    setIngestLoading: actions.setIngestLoading,
    setKinInput: actions.setKinInput,
    setPendingKinInjectionBlocks: actions.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: actions.setPendingKinInjectionIndex,
    setUploadKind: actions.setUploadKind,
  };
}
