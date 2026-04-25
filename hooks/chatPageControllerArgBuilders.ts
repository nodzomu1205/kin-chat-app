import type {
  ChatPageActionArgGroups,
  ChatPageIdentityArgs,
  ChatPageProtocolArgs,
  ChatPageSearchArgs,
  ChatPageServicesArgs,
  ChatPageTaskArgs,
  ChatPageUiStateArgs,
  UseFileIngestActionsArgs,
  UseGptMessageActionsArgs,
  UseKinTransferActionsArgs,
  UseTaskDraftActionsArgs,
  UseTaskProtocolActionsArgs,
} from "@/hooks/chatPageActionTypes";
import type { UseChatPageControllerArgs } from "@/hooks/useChatPageController";
import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";

export function buildChatPageControllerIdentityArgs(
  args: ChatPageWorkspaceViewArgs
): ChatPageIdentityArgs {
  return {
    currentKin: args.app.currentKin,
    kinList: args.app.kinList,
    isMobile: args.app.isMobile,
    setActivePanelTab: args.app.setActivePanelTab,
    focusKinPanel: args.app.focusKinPanel,
    focusGptPanel: args.app.focusGptPanel,
    setKinConnectionState: args.app.setKinConnectionState,
  };
}

export function buildChatPageControllerUiStateArgs(
  args: ChatPageWorkspaceViewArgs
): ChatPageUiStateArgs {
  return {
    gptInput: args.ui.gptInput,
    kinInput: args.ui.kinInput,
    gptLoading: args.ui.gptLoading,
    kinLoading: args.ui.kinLoading,
    ingestLoading: args.ui.ingestLoading,
    gptMessages: args.ui.gptMessages,
    kinMessages: args.ui.kinMessages,
    pendingKinInjectionBlocks: args.ui.pendingKinInjectionBlocks,
    pendingKinInjectionIndex: args.ui.pendingKinInjectionIndex,
    setKinInput: args.ui.setKinInput,
    setGptInput: args.ui.setGptInput,
    setKinMessages: args.ui.setKinMessages,
    setGptMessages: args.ui.setGptMessages,
    setKinLoading: args.ui.setKinLoading,
    setGptLoading: args.ui.setGptLoading,
    setIngestLoading: args.ui.setIngestLoading,
    setPendingKinInjectionBlocks: args.ui.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.ui.setPendingKinInjectionIndex,
  };
}

export function buildChatPageControllerTaskArgs(
  args: ChatPageWorkspaceViewArgs
): ChatPageTaskArgs {
  return {
    currentTaskDraft: args.task.currentTaskDraft,
    currentTaskIntentConstraints: args.task.taskProtocolView.currentTaskIntentConstraints,
    setCurrentTaskDraft: args.task.setCurrentTaskDraft,
    getTaskBaseText: args.task.getTaskBaseText,
    getTaskLibraryItem: args.task.getTaskLibraryItem,
    getResolvedTaskTitle: args.task.getResolvedTaskTitle,
    resolveTaskTitleFromDraft: args.task.resolveTaskTitleFromDraft,
    getTaskSlotLabel: args.task.getTaskSlotLabel,
    syncTaskDraftFromProtocol: args.task.syncTaskDraftFromProtocol,
    applyPrefixedTaskFieldsFromText: args.task.applyPrefixedTaskFieldsFromText,
    getCurrentTaskCharConstraint: args.task.getCurrentTaskCharConstraint,
    resetCurrentTaskDraft: args.task.resetCurrentTaskDraft,
  };
}

export function buildChatPageControllerProtocolArgs(
  args: ChatPageWorkspaceViewArgs
): ChatPageProtocolArgs {
  return {
    approvedIntentPhrases: args.protocol.approvedIntentPhrases,
    rejectedIntentCandidateSignatures: args.protocol.rejectedIntentCandidateSignatures,
    pendingIntentCandidates: args.protocol.pendingIntentCandidates,
    protocolPrompt: args.protocol.protocolPrompt,
    protocolRulebook: args.protocol.protocolRulebook,
    chatBridgeSettings: args.protocol.chatBridgeSettings,
    taskProtocol: args.task.taskProtocol,
    setPendingIntentCandidates: args.protocol.setPendingIntentCandidates,
    setApprovedIntentPhrases: args.protocol.setApprovedIntentPhrases,
    setRejectedIntentCandidateSignatures:
      args.protocol.setRejectedIntentCandidateSignatures,
    setProtocolPrompt: args.protocol.setProtocolPrompt,
    setProtocolRulebook: args.protocol.setProtocolRulebook,
    promptDefaultKey: args.protocol.promptDefaultKey,
    rulebookDefaultKey: args.protocol.rulebookDefaultKey,
  };
}

export function buildChatPageControllerSearchArgs(
  args: ChatPageWorkspaceViewArgs
): ChatPageSearchArgs {
  return {
    lastSearchContext: args.search.lastSearchContext,
    searchMode: args.search.searchMode,
    searchEngines: args.search.searchEngines,
    searchLocation: args.search.searchLocation,
    processMultipartTaskDoneText: args.search.processMultipartTaskDoneText,
    recordSearchContext: args.search.recordSearchContext,
    getContinuationTokenForSeries: args.search.getContinuationTokenForSeries,
    getAskAiModeLinkForQuery: args.search.getAskAiModeLinkForQuery,
    clearSearchHistory: args.search.clearSearchHistory,
    deleteSearchHistoryItemBase: args.search.deleteSearchHistoryItemBase,
  };
}

export function buildChatPageControllerServicesArgs(
  args: ChatPageWorkspaceViewArgs
): ChatPageServicesArgs {
  return {
    responseMode: args.gpt.responseMode,
    autoCopyFileIngestSysInfoToKin:
      args.bridge.autoBridgeSettings.autoCopyFileIngestSysInfoToKin,
    autoGenerateFileImportSummary: args.gpt.driveImportAutoSummary,
    gptMemoryRuntime: args.gpt.gptMemoryRuntime,
    setUploadKind: args.gpt.onChangeUploadKind,
    applySearchUsage: args.usage.applySearchUsage,
    applyChatUsage: args.usage.applyChatUsage,
    applyCompressionUsage: args.usage.applyCompressionUsage,
    applyTaskUsage: args.usage.applyTaskUsage,
    applyIngestUsage: args.usage.applyIngestUsage,
    buildLibraryReferenceContext: args.references.buildLibraryReferenceContext,
    referenceLibraryItems: args.references.referenceLibraryItems,
    libraryIndexResponseCount: args.references.libraryIndexResponseCount,
    recordIngestedDocument: args.usage.recordIngestedDocument,
    gptMemorySettingsControls: args.gpt.gptMemorySettingsControls,
    ingestProtocolMessage: args.task.taskProtocolView.ingestProtocolMessage,
  };
}

export function buildChatPageProtocolAutomationArgs(
  args: ChatPageWorkspaceViewArgs
): UseChatPageControllerArgs["protocolAutomation"] {
  return {
    autoBridgeSettings: args.bridge.autoBridgeSettings,
    kinInput: args.ui.kinInput,
    gptInput: args.ui.gptInput,
    kinLoading: args.ui.kinLoading,
    gptLoading: args.ui.gptLoading,
    kinMessages: args.ui.kinMessages,
    gptMessages: args.ui.gptMessages,
    setGptInput: args.ui.setGptInput,
    setKinInput: args.ui.setKinInput,
    focusKinPanel: args.app.focusKinPanel,
    focusGptPanel: args.app.focusGptPanel,
  };
}

export function buildChatPagePanelResetArgs(
  args: ChatPageWorkspaceViewArgs
): UseChatPageControllerArgs["panelReset"] {
  return {
    setKinMessages: args.ui.setKinMessages,
    setGptMessages: args.ui.setGptMessages,
    resetTokenStats: args.reset.resetTokenStats,
    resetCurrentTaskDraft: args.task.resetCurrentTaskDraft,
    focusKinPanel: args.app.focusKinPanel,
    connectKin: args.reset.connectKin,
    switchKin: args.reset.switchKin,
    disconnectKin: args.reset.disconnectKin,
    removeKinState: args.reset.removeKinState,
    removeKin: args.reset.removeKin,
    resetGptForCurrentKin: args.gpt.resetGptForCurrentKin,
  };
}

export function buildGptMessageActionArgs(
  groups: ChatPageActionArgGroups
): UseGptMessageActionsArgs {
  return {
    applyChatUsage: groups.services.applyChatUsage,
    applyPrefixedTaskFieldsFromText: groups.task.applyPrefixedTaskFieldsFromText,
    applySearchUsage: groups.services.applySearchUsage,
    applyCompressionUsage: groups.services.applyCompressionUsage,
    applyIngestUsage: groups.services.applyIngestUsage,
    autoGenerateFileImportSummary: groups.services.autoGenerateFileImportSummary,
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
    applyChatUsage: groups.services.applyChatUsage,
    applyPrefixedTaskFieldsFromText: groups.task.applyPrefixedTaskFieldsFromText,
    applyCompressionUsage: groups.services.applyCompressionUsage,
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
    autoCopyFileIngestSysInfoToKin:
      groups.services.autoCopyFileIngestSysInfoToKin,
    autoGenerateFileImportSummary:
      groups.services.autoGenerateFileImportSummary,
    currentTaskDraft: groups.task.currentTaskDraft,
    getResolvedTaskTitle: groups.task.getResolvedTaskTitle,
    getTaskBaseText: groups.task.getTaskBaseText,
    gptMemoryRuntime: groups.services.gptMemoryRuntime,
    focusKinPanel: groups.identity.focusKinPanel,
    ingestLoading: groups.uiState.ingestLoading,
    recordIngestedDocument: groups.services.recordIngestedDocument,
    resolveTaskTitleFromDraft: groups.task.resolveTaskTitleFromDraft,
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

