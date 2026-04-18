import type {
  ChatPageActionArgGroups,
  UseFileIngestActionsArgs,
  UseGptMessageActionsArgs,
  UseKinTransferActionsArgs,
  UseTaskDraftActionsArgs,
  UseTaskProtocolActionsArgs,
} from "@/hooks/chatPageActionTypes";

export function buildGptMessageActionArgs(
  groups: ChatPageActionArgGroups
): UseGptMessageActionsArgs {
  return {
    applyChatUsage: groups.services.applyChatUsage,
    applyPrefixedTaskFieldsFromText: groups.task.applyPrefixedTaskFieldsFromText,
    applySearchUsage: groups.services.applySearchUsage,
    applySummaryUsage: groups.services.applySummaryUsage,
    buildLibraryReferenceContext: groups.services.buildLibraryReferenceContext,
    chatBridgeSettings: groups.protocol.chatBridgeSettings,
    currentTaskDraft: groups.task.currentTaskDraft,
    getAskAiModeLinkForQuery: groups.search.getAskAiModeLinkForQuery,
    getContinuationTokenForSeries: groups.search.getContinuationTokenForSeries,
    gptInput: groups.uiState.gptInput,
    gptLoading: groups.uiState.gptLoading,
    gptMemoryRuntime: groups.services.gptMemoryRuntime,
    focusGptPanel: groups.identity.focusGptPanel,
    focusKinPanel: groups.identity.focusKinPanel,
    ingestProtocolMessage: groups.services.ingestProtocolMessage,
    kinMessages: groups.uiState.kinMessages,
    lastSearchContext: groups.search.lastSearchContext,
    libraryIndexResponseCount: groups.services.libraryIndexResponseCount,
    processMultipartTaskDoneText: groups.search.processMultipartTaskDoneText,
    recordIngestedDocument: groups.services.recordIngestedDocument,
    recordSearchContext: groups.search.recordSearchContext,
    referenceLibraryItems: groups.services.referenceLibraryItems,
    responseMode: groups.services.responseMode,
    searchEngines: groups.search.searchEngines,
    searchLocation: groups.search.searchLocation,
    searchMode: groups.search.searchMode,
    setGptInput: groups.uiState.setGptInput,
    setGptLoading: groups.uiState.setGptLoading,
    setGptMessages: groups.uiState.setGptMessages,
    setKinInput: groups.uiState.setKinInput,
    setPendingKinInjectionBlocks: groups.uiState.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: groups.uiState.setPendingKinInjectionIndex,
    taskProtocol: groups.protocol.taskProtocol,
  };
}

export function buildKinTransferActionArgs(
  groups: ChatPageActionArgGroups
): UseKinTransferActionsArgs {
  return {
    applyTaskUsage: groups.services.applyTaskUsage,
    approvedIntentPhrases: groups.protocol.approvedIntentPhrases,
    currentKin: groups.identity.currentKin,
    currentTaskDraft: groups.task.currentTaskDraft,
    getTaskBaseText: groups.task.getTaskBaseText,
    getTaskSlotLabel: groups.task.getTaskSlotLabel,
    gptInput: groups.uiState.gptInput,
    gptMessages: groups.uiState.gptMessages,
    focusKinPanel: groups.identity.focusKinPanel,
    ingestProtocolMessage: groups.services.ingestProtocolMessage,
    isMobile: groups.identity.isMobile,
    kinInput: groups.uiState.kinInput,
    kinLoading: groups.uiState.kinLoading,
    pendingIntentCandidates: groups.protocol.pendingIntentCandidates,
    pendingKinInjectionBlocks: groups.uiState.pendingKinInjectionBlocks,
    pendingKinInjectionIndex: groups.uiState.pendingKinInjectionIndex,
    processMultipartTaskDoneText: groups.search.processMultipartTaskDoneText,
    rejectedIntentCandidateSignatures:
      groups.protocol.rejectedIntentCandidateSignatures,
    responseMode: groups.services.responseMode,
    setGptInput: groups.uiState.setGptInput,
    setGptLoading: groups.uiState.setGptLoading,
    setGptMessages: groups.uiState.setGptMessages,
    setKinConnectionState: groups.identity.setKinConnectionState,
    setKinInput: groups.uiState.setKinInput,
    setKinLoading: groups.uiState.setKinLoading,
    setKinMessages: groups.uiState.setKinMessages,
    setPendingIntentCandidates: groups.protocol.setPendingIntentCandidates,
    setPendingKinInjectionBlocks: groups.uiState.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: groups.uiState.setPendingKinInjectionIndex,
    syncTaskDraftFromProtocol: groups.task.syncTaskDraftFromProtocol,
    taskProtocol: groups.protocol.taskProtocol,
  };
}

export function buildTaskDraftActionArgs(
  groups: ChatPageActionArgGroups
): UseTaskDraftActionsArgs {
  return {
    applyPrefixedTaskFieldsFromText: groups.task.applyPrefixedTaskFieldsFromText,
    applySummaryUsage: groups.services.applySummaryUsage,
    applyTaskUsage: groups.services.applyTaskUsage,
    currentTaskDraft: groups.task.currentTaskDraft,
    getResolvedTaskTitle: groups.task.getResolvedTaskTitle,
    getTaskBaseText: groups.task.getTaskBaseText,
    getTaskLibraryItem: groups.task.getTaskLibraryItem,
    gptInput: groups.uiState.gptInput,
    gptLoading: groups.uiState.gptLoading,
    gptMemoryRuntime: groups.services.gptMemoryRuntime,
    gptMessages: groups.uiState.gptMessages,
    lastSearchContext: groups.search.lastSearchContext,
    setCurrentTaskDraft: groups.task.setCurrentTaskDraft,
    setGptInput: groups.uiState.setGptInput,
    setGptLoading: groups.uiState.setGptLoading,
    setGptMessages: groups.uiState.setGptMessages,
  };
}

export function buildTaskProtocolActionArgs(
  groups: ChatPageActionArgGroups
): UseTaskProtocolActionsArgs {
  return {
    applyTaskUsage: groups.services.applyTaskUsage,
    approvedIntentPhrases: groups.protocol.approvedIntentPhrases,
    currentTaskDraft: groups.task.currentTaskDraft,
    focusKinPanel: groups.identity.focusKinPanel,
    pendingIntentCandidates: groups.protocol.pendingIntentCandidates,
    promptDefaultKey: groups.protocol.promptDefaultKey,
    protocolPrompt: groups.protocol.protocolPrompt,
    protocolRulebook: groups.protocol.protocolRulebook,
    responseMode: groups.services.responseMode,
    rulebookDefaultKey: groups.protocol.rulebookDefaultKey,
    setApprovedIntentPhrases: groups.protocol.setApprovedIntentPhrases,
    setGptMessages: groups.uiState.setGptMessages,
    setKinInput: groups.uiState.setKinInput,
    setPendingIntentCandidates: groups.protocol.setPendingIntentCandidates,
    setPendingKinInjectionBlocks: groups.uiState.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: groups.uiState.setPendingKinInjectionIndex,
    setProtocolPrompt: groups.protocol.setProtocolPrompt,
    setProtocolRulebook: groups.protocol.setProtocolRulebook,
    setRejectedIntentCandidateSignatures:
      groups.protocol.setRejectedIntentCandidateSignatures,
    syncTaskDraftFromProtocol: groups.task.syncTaskDraftFromProtocol,
    taskProtocol: groups.protocol.taskProtocol,
  };
}

export function buildFileIngestActionArgs(
  groups: ChatPageActionArgGroups
): UseFileIngestActionsArgs {
  return {
    applyIngestUsage: groups.services.applyIngestUsage,
    applySummaryUsage: groups.services.applySummaryUsage,
    applyTaskUsage: groups.services.applyTaskUsage,
    autoCopyFileIngestSysInfoToKin:
      groups.services.autoCopyFileIngestSysInfoToKin,
    autoGenerateFileImportSummary:
      groups.services.autoGenerateFileImportSummary,
    currentTaskDraft: groups.task.currentTaskDraft,
    getResolvedTaskTitle: groups.task.getResolvedTaskTitle,
    getTaskBaseText: groups.task.getTaskBaseText,
    gptInput: groups.uiState.gptInput,
    gptMemoryRuntime: groups.services.gptMemoryRuntime,
    focusKinPanel: groups.identity.focusKinPanel,
    ingestLoading: groups.uiState.ingestLoading,
    recordIngestedDocument: groups.services.recordIngestedDocument,
    resolveTaskTitleFromDraft: groups.task.resolveTaskTitleFromDraft,
    responseMode: groups.services.responseMode,
    setCurrentTaskDraft: groups.task.setCurrentTaskDraft,
    setGptInput: groups.uiState.setGptInput,
    setGptMessages: groups.uiState.setGptMessages,
    setIngestLoading: groups.uiState.setIngestLoading,
    setKinInput: groups.uiState.setKinInput,
    setPendingKinInjectionBlocks: groups.uiState.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: groups.uiState.setPendingKinInjectionIndex,
    setUploadKind: groups.services.setUploadKind,
  };
}
