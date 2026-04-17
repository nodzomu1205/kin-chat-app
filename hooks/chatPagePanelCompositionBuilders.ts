import type { ChatPageControllerGroups } from "@/hooks/useChatPageController";
import type {
  ChatPageGptPanelCompositionArgs,
  ChatPageKinPanelCompositionArgs,
  ChatPageWorkspaceViewArgs,
} from "@/hooks/chatPagePanelCompositionTypes";
import { buildStoredDocumentFromTaskDraft } from "@/lib/app/taskDraftLibrary";

type BuildChatPageWorkspaceGptPanelArgsOptions = {
  controller: ChatPageControllerGroups;
  onSaveTaskSnapshot: () => void;
};

export function buildChatPageWorkspaceKinPanelArgs(
  args: ChatPageWorkspaceViewArgs,
  controller: ChatPageControllerGroups
): ChatPageKinPanelCompositionArgs {
  return {
    app: {
      currentKin: args.app.currentKin,
      currentKinLabel: args.app.currentKinLabel,
      kinStatus: args.app.kinStatus,
      kinList: args.app.kinList,
      isMobile: args.app.isMobile,
    },
    taskProtocolView: args.task.taskProtocolView,
    controller,
    activeTabSetter: () => args.app.setActiveTab("gpt"),
    kinState: {
      kinIdInput: args.kin.kinIdInput,
      setKinIdInput: args.kin.setKinIdInput,
      kinNameInput: args.kin.kinNameInput,
      setKinNameInput: args.kin.setKinNameInput,
      currentKin: args.app.currentKin,
      kinMessages: args.ui.kinMessages,
      kinInput: args.ui.kinInput,
      setKinInput: args.ui.setKinInput,
      renameKin: args.kin.renameKin,
      kinBottomRef: args.ui.kinBottomRef,
      loading: args.ui.kinLoading,
      pendingInjectionBlocks: args.ui.pendingKinInjectionBlocks,
      pendingInjectionIndex: args.ui.pendingKinInjectionIndex,
    },
  };
}

export function buildChatPageWorkspaceGptPanelArgs(
  args: ChatPageWorkspaceViewArgs,
  options: BuildChatPageWorkspaceGptPanelArgsOptions
): ChatPageGptPanelCompositionArgs {
  return {
    app: {
      currentKin: args.app.currentKin,
      currentKinLabel: args.app.currentKinLabel,
      kinStatus: args.app.kinStatus,
      kinList: args.app.kinList,
      isMobile: args.app.isMobile,
    },
    taskProtocolView: args.task.taskProtocolView,
    controller: options.controller,
    activeTabSetter: () => args.app.setActiveTab("kin"),
    pendingInjection: {
      blocks: args.ui.pendingKinInjectionBlocks,
      index: args.ui.pendingKinInjectionIndex,
    },
    gptState: {
      gptState: args.gpt.gptState,
      gptMessages: args.ui.gptMessages,
      gptInput: args.ui.gptInput,
      setGptInput: args.ui.setGptInput,
      gptBottomRef: args.ui.gptBottomRef,
      loading: args.ui.gptLoading,
      ingestLoading: args.ui.ingestLoading,
    },
    task: {
      currentTaskDraft: args.task.currentTaskDraft,
      taskDraftCount: args.task.taskDraftCount,
      activeTaskDraftIndex: args.task.activeTaskDraftIndex,
      resetCurrentTaskDraft: args.task.resetCurrentTaskDraft,
      updateTaskDraftFields: args.task.updateTaskDraftFields,
      pendingRequests: args.task.taskProtocolView.pendingRequests,
      buildTaskRequestAnswerDraft: args.task.buildTaskRequestAnswerDraft,
      onSaveTaskSnapshot: options.onSaveTaskSnapshot,
      onSelectPreviousTaskDraft: args.task.onSelectPreviousTaskDraft,
      onSelectNextTaskDraft: args.task.onSelectNextTaskDraft,
    },
    references: {
      lastSearchContext: args.search.lastSearchContext,
      searchHistory: args.search.searchHistory,
      selectedTaskSearchResultId: args.search.selectedTaskSearchResultId,
      multipartAssemblies: args.references.multipartAssemblies,
      storedDocuments: args.references.storedDocuments,
      referenceLibraryItems: args.references.referenceLibraryItems,
      selectedTaskLibraryItemId: args.references.selectedTaskLibraryItemId,
      onSelectTaskSearchResult: args.search.onSelectTaskSearchResult,
      onMoveSearchHistoryItem: args.search.onMoveSearchHistoryItem,
      onDeleteSearchHistoryItem: args.search.onDeleteSearchHistoryItem,
      onLoadMultipartAssemblyToGptInput:
        args.references.onLoadMultipartAssemblyToGptInput,
      onDownloadMultipartAssembly: args.references.onDownloadMultipartAssembly,
      onDeleteMultipartAssembly: args.references.onDeleteMultipartAssembly,
      onLoadStoredDocumentToGptInput:
        args.references.onLoadStoredDocumentToGptInput,
      onDownloadStoredDocument: args.references.onDownloadStoredDocument,
      onDeleteStoredDocument: args.references.onDeleteStoredDocument,
      onMoveStoredDocument: args.references.onMoveStoredDocument,
      onMoveLibraryItem: args.references.onMoveLibraryItem,
      onSelectTaskLibraryItem: args.references.onSelectTaskLibraryItem,
      onChangeLibraryItemMode: args.references.onChangeLibraryItemMode,
      onSaveStoredDocument: args.references.onSaveStoredDocument,
    },
    settings: {
      memorySettings: args.memory.memorySettings,
      defaultMemorySettings: args.gpt.defaultMemorySettings,
      tokenStats: args.memory.tokenStats,
      responseMode: args.gpt.responseMode,
      uploadKind: args.gpt.uploadKind,
      ingestMode: args.gpt.ingestMode,
      imageDetail: args.gpt.imageDetail,
      postIngestAction: args.gpt.postIngestAction,
      fileReadPolicy: args.gpt.fileReadPolicy,
      compactCharLimit: args.gpt.compactCharLimit,
      simpleImageCharLimit: args.gpt.simpleImageCharLimit,
      ingestLoading: args.ui.ingestLoading,
      canInjectFile: !args.ui.gptLoading && !args.ui.ingestLoading,
      searchMode: args.search.searchMode,
      searchEngines: args.search.searchEngines,
      searchLocation: args.search.searchLocation,
      sourceDisplayCount: args.search.sourceDisplayCount,
      autoLibraryReferenceEnabled: args.references.autoLibraryReferenceEnabled,
      libraryReferenceMode: args.references.libraryReferenceMode,
      libraryIndexResponseCount: args.references.libraryIndexResponseCount,
      libraryReferenceCount: args.references.libraryReferenceCount,
      libraryStorageMB: args.references.libraryStorageMB,
      libraryReferenceEstimatedTokens:
        args.references.libraryReferenceEstimatedTokens,
      autoSendKinSysInput: args.bridge.autoBridgeSettings.autoSendKinSysInput,
      autoCopyKinSysResponseToGpt:
        args.bridge.autoBridgeSettings.autoCopyKinSysResponseToGpt,
      autoSendGptSysInput: args.bridge.autoBridgeSettings.autoSendGptSysInput,
      autoCopyGptSysResponseToKin:
        args.bridge.autoBridgeSettings.autoCopyGptSysResponseToKin,
      autoCopyFileIngestSysInfoToKin:
        args.bridge.autoBridgeSettings.autoCopyFileIngestSysInfoToKin,
      onChangeResponseMode: args.gpt.onChangeResponseMode,
      onChangeUploadKind: args.gpt.onChangeUploadKind,
      onChangeIngestMode: args.gpt.onChangeIngestMode,
      onChangeImageDetail: args.gpt.onChangeImageDetail,
      onChangeCompactCharLimit: args.gpt.onChangeCompactCharLimit,
      onChangeSimpleImageCharLimit: args.gpt.onChangeSimpleImageCharLimit,
      onChangePostIngestAction: args.gpt.onChangePostIngestAction,
      onChangeFileReadPolicy: args.gpt.onChangeFileReadPolicy,
      onChangeSearchMode: args.search.onChangeSearchMode,
      onChangeSearchEngines: args.search.onChangeSearchEngines,
      onChangeSearchLocation: args.search.onChangeSearchLocation,
      onChangeSourceDisplayCount: args.search.onChangeSourceDisplayCount,
      onChangeAutoLibraryReferenceEnabled:
        args.references.onChangeAutoLibraryReferenceEnabled,
      onChangeLibraryReferenceMode:
        args.references.onChangeLibraryReferenceMode,
      onChangeLibraryIndexResponseCount:
        args.references.onChangeLibraryIndexResponseCount,
      onChangeLibraryReferenceCount:
        args.references.onChangeLibraryReferenceCount,
      onChangeAutoSendKinSysInput: args.bridge.onChangeAutoSendKinSysInput,
      onChangeAutoCopyKinSysResponseToGpt:
        args.bridge.onChangeAutoCopyKinSysResponseToGpt,
      onChangeAutoSendGptSysInput: args.bridge.onChangeAutoSendGptSysInput,
      onChangeAutoCopyGptSysResponseToKin:
        args.bridge.onChangeAutoCopyGptSysResponseToKin,
      onChangeAutoCopyFileIngestSysInfoToKin:
        args.bridge.onChangeAutoCopyFileIngestSysInfoToKin,
      onChangeMemoryInterpreterSettings:
        args.memory.onChangeMemoryInterpreterSettings,
    },
    protocolState: {
      protocolPrompt: args.protocol.protocolPrompt,
      protocolRulebook: args.protocol.protocolRulebook,
      pendingIntentCandidates: args.protocol.pendingIntentCandidates,
      approvedIntentPhrases: args.protocol.approvedIntentPhrases,
      onChangeProtocolPrompt: args.protocol.onChangeProtocolPrompt,
      onChangeProtocolRulebook: args.protocol.onChangeProtocolRulebook,
    },
    memoryState: {
      memoryInterpreterSettings: args.memory.memoryInterpreterSettings,
      pendingMemoryRuleCandidates: args.memory.pendingMemoryRuleCandidates,
      approvedMemoryRules: args.memory.approvedMemoryRules,
      onApproveMemoryRuleCandidate: args.memory.onApproveMemoryRuleCandidate,
      onRejectMemoryRuleCandidate: args.memory.onRejectMemoryRuleCandidate,
      onUpdateMemoryRuleCandidate: args.memory.onUpdateMemoryRuleCandidate,
      onDeleteApprovedMemoryRule: args.memory.onDeleteApprovedMemoryRule,
    },
  };
}

export function buildChatPageTaskSnapshotDocument(
  args: Pick<ChatPageWorkspaceViewArgs, "task">
) {
  return buildStoredDocumentFromTaskDraft(args.task.currentTaskDraft);
}
