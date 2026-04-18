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
import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";

export function useChatPageControllerArgs(
  args: ChatPageWorkspaceViewArgs
): UseChatPageControllerArgs {
  const identity: ChatPageIdentityArgs = {
    currentKin: args.app.currentKin,
    kinList: args.app.kinList,
    isMobile: args.app.isMobile,
    setActivePanelTab: args.app.setActivePanelTab,
    focusKinPanel: args.app.focusKinPanel,
    focusGptPanel: args.app.focusGptPanel,
    setKinConnectionState: args.app.setKinConnectionState,
  };

  const uiState: ChatPageUiStateArgs = {
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
    responseMode: args.gpt.responseMode,
    autoCopyFileIngestSysInfoToKin:
      args.bridge.autoBridgeSettings.autoCopyFileIngestSysInfoToKin,
    autoGenerateFileImportSummary: args.gpt.driveImportAutoSummary,
    gptMemoryRuntime: args.gpt.gptMemoryRuntime,
    setUploadKind: args.gpt.onChangeUploadKind,
    applySearchUsage: args.usage.applySearchUsage,
    applyChatUsage: args.usage.applyChatUsage,
    applySummaryUsage: args.usage.applySummaryUsage,
    applyTaskUsage: args.usage.applyTaskUsage,
    applyIngestUsage: args.usage.applyIngestUsage,
    buildLibraryReferenceContext: args.references.buildLibraryReferenceContext,
    referenceLibraryItems: args.references.referenceLibraryItems,
    libraryIndexResponseCount: args.references.libraryIndexResponseCount,
    recordIngestedDocument: args.usage.recordIngestedDocument,
    gptMemorySettingsControls: args.gpt.gptMemorySettingsControls,
    ingestProtocolMessage: args.task.taskProtocolView.ingestProtocolMessage,
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
    protocolAutomation: {
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
    },
    panelReset: {
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
    },
  };
}
