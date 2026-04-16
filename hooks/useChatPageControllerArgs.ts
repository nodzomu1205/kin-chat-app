"use client";

import type { UseChatPageControllerArgs } from "@/hooks/useChatPageController";
import type {
  ChatPageActionArgGroups,
  ChatPageIdentityArgs,
  ChatPageProtocolArgs,
  ChatPageSearchArgs,
  ChatPageServicesArgs,
  ChatPageTaskArgs,
  ChatPageUiStateArgs,
} from "@/hooks/chatPageActionTypes";
import type { ChatPageControllerCompositionArgs } from "@/hooks/chatPageCompositionTypes";

export function useChatPageControllerArgs(
  args: ChatPageControllerCompositionArgs
): UseChatPageControllerArgs {
  const identity: ChatPageIdentityArgs = {
    currentKin: args.app.currentKin,
    kinList: args.app.kinList,
    isMobile: args.app.isMobile,
    setActiveTab: args.app.setActiveTab,
    setKinConnectionState: args.app.setKinConnectionState,
  };

  const uiState: ChatPageUiStateArgs = {
    gptInput: args.uiState.gptInput,
    kinInput: args.uiState.kinInput,
    gptLoading: args.uiState.gptLoading,
    kinLoading: args.uiState.kinLoading,
    ingestLoading: args.uiState.ingestLoading,
    gptMessages: args.uiState.gptMessages,
    kinMessages: args.uiState.kinMessages,
    pendingKinInjectionBlocks: args.uiState.pendingKinInjectionBlocks,
    pendingKinInjectionIndex: args.uiState.pendingKinInjectionIndex,
    setKinInput: args.uiState.setKinInput,
    setGptInput: args.uiState.setGptInput,
    setKinMessages: args.uiState.setKinMessages,
    setGptMessages: args.uiState.setGptMessages,
    setKinLoading: args.uiState.setKinLoading,
    setGptLoading: args.uiState.setGptLoading,
    setIngestLoading: args.uiState.setIngestLoading,
    setPendingKinInjectionBlocks: args.uiState.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.uiState.setPendingKinInjectionIndex,
  };

  const task: ChatPageTaskArgs = {
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

  const protocol: ChatPageProtocolArgs = {
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

  const search: ChatPageSearchArgs = {
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

  const services: ChatPageServicesArgs = {
    responseMode: args.services.responseMode,
    autoCopyFileIngestSysInfoToKin: args.services.autoCopyFileIngestSysInfoToKin,
    gptMemoryRuntime: args.services.gptMemoryRuntime,
    setUploadKind: args.services.setUploadKind,
    applySearchUsage: args.services.applySearchUsage,
    applyChatUsage: args.services.applyChatUsage,
    applySummaryUsage: args.services.applySummaryUsage,
    applyTaskUsage: args.services.applyTaskUsage,
    applyIngestUsage: args.services.applyIngestUsage,
    buildLibraryReferenceContext: args.services.buildLibraryReferenceContext,
    referenceLibraryItems: args.services.referenceLibraryItems,
    libraryIndexResponseCount: args.services.libraryIndexResponseCount,
    recordIngestedDocument: args.services.recordIngestedDocument,
    gptMemorySettingsControls: args.services.gptMemorySettingsControls,
    ingestProtocolMessage: args.services.ingestProtocolMessage,
  };
  const actions: ChatPageActionArgGroups = {
    identity,
    uiState,
    task,
    protocol,
    search,
    services,
  };

  return {
    actions,
    protocolAutomation: args.automation,
    panelReset: args.reset,
  };
}
