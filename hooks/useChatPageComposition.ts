"use client";

import type { UseChatPageActionsArgs } from "@/hooks/chatPageActionTypes";
import type {
  ChatPageControllerGroups,
  UseChatPageControllerArgs,
} from "@/hooks/useChatPageController";
import type { useTaskProtocolProjection } from "@/hooks/useTaskProtocolProjection";
import type { BuildGptPanelArgs } from "@/lib/app/panelPropsBuilders";
import {
  resolvePendingInjectionProgress,
} from "@/lib/app/panelPropsBuilders";
import type { KinPanelProps } from "@/components/panels/kin/kinPanelTypes";
import type { TaskDraft } from "@/types/task";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchContext, SearchEngine } from "@/types/task";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import type { GptMemoryRuntime, GptMemorySettingsControls } from "@/lib/app/chatPageGptMemoryControls";
import type { ApprovedIntentPhrase, PendingIntentCandidate } from "@/lib/taskIntent";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";

type TaskProtocolView = ReturnType<typeof useTaskProtocolProjection>;

type ChatPageControllerCompositionArgs = {
  app: {
    currentKin: string | null;
    kinList: Array<{ id: string; label: string }>;
    isMobile: boolean;
    setActiveTab: React.Dispatch<React.SetStateAction<"kin" | "gpt">>;
    setKinConnectionState: React.Dispatch<
      React.SetStateAction<"idle" | "connected" | "error">
    >;
  };
  uiState: {
    gptInput: string;
    kinInput: string;
    gptLoading: boolean;
    kinLoading: boolean;
    ingestLoading: boolean;
    gptMessages: Message[];
    kinMessages: Message[];
    pendingKinInjectionBlocks: string[];
    pendingKinInjectionIndex: number;
    setKinInput: React.Dispatch<React.SetStateAction<string>>;
    setGptInput: React.Dispatch<React.SetStateAction<string>>;
    setKinMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setKinLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setGptLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setIngestLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setPendingKinInjectionBlocks: React.Dispatch<React.SetStateAction<string[]>>;
    setPendingKinInjectionIndex: React.Dispatch<React.SetStateAction<number>>;
  };
  task: {
    currentTaskDraft: TaskDraft;
    setCurrentTaskDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
    getTaskBaseText: () => string;
    getTaskLibraryItem: () => ReferenceLibraryItem | null;
    getResolvedTaskTitle: UseChatPageActionsArgs["getResolvedTaskTitle"];
    resolveTaskTitleFromDraft: UseChatPageActionsArgs["resolveTaskTitleFromDraft"];
    getTaskSlotLabel: () => string;
    syncTaskDraftFromProtocol: UseChatPageActionsArgs["syncTaskDraftFromProtocol"];
    applyPrefixedTaskFieldsFromText: UseChatPageActionsArgs["applyPrefixedTaskFieldsFromText"];
    getCurrentTaskCharConstraint: UseChatPageActionsArgs["getCurrentTaskCharConstraint"];
    resetCurrentTaskDraft: () => void;
    taskProtocol: UseChatPageActionsArgs["taskProtocol"];
    taskProtocolView: TaskProtocolView;
  };
  protocol: {
    approvedIntentPhrases: ApprovedIntentPhrase[];
    rejectedIntentCandidateSignatures: string[];
    pendingIntentCandidates: PendingIntentCandidate[];
    protocolPrompt: string;
    protocolRulebook: string;
    chatBridgeSettings: ChatBridgeSettings;
    setPendingIntentCandidates: UseChatPageActionsArgs["setPendingIntentCandidates"];
    setApprovedIntentPhrases: UseChatPageActionsArgs["setApprovedIntentPhrases"];
    setRejectedIntentCandidateSignatures: UseChatPageActionsArgs["setRejectedIntentCandidateSignatures"];
    setProtocolPrompt: React.Dispatch<React.SetStateAction<string>>;
    setProtocolRulebook: React.Dispatch<React.SetStateAction<string>>;
    promptDefaultKey: string;
    rulebookDefaultKey: string;
  };
  search: {
    lastSearchContext: SearchContext | null;
    searchMode: UseChatPageActionsArgs["searchMode"];
    searchEngines: SearchEngine[];
    searchLocation: string;
    processMultipartTaskDoneText: UseChatPageActionsArgs["processMultipartTaskDoneText"];
    recordSearchContext: UseChatPageActionsArgs["recordSearchContext"];
    getContinuationTokenForSeries: (seriesId: string) => string;
    getAskAiModeLinkForQuery: (query: string) => string;
    clearSearchHistory: () => void;
    deleteSearchHistoryItemBase: (rawResultId: string) => void;
  };
  services: {
    responseMode: UseChatPageActionsArgs["responseMode"];
    autoCopyFileIngestSysInfoToKin: boolean;
    gptMemoryRuntime: GptMemoryRuntime;
    setUploadKind: React.Dispatch<React.SetStateAction<UseChatPageActionsArgs["setUploadKind"] extends React.Dispatch<React.SetStateAction<infer T>> ? T : never>>;
    applySearchUsage: UseChatPageActionsArgs["applySearchUsage"];
    applyChatUsage: UseChatPageActionsArgs["applyChatUsage"];
    applySummaryUsage: UseChatPageActionsArgs["applySummaryUsage"];
    applyTaskUsage: UseChatPageActionsArgs["applyTaskUsage"];
    applyIngestUsage: UseChatPageActionsArgs["applyIngestUsage"];
    buildLibraryReferenceContext: () => string;
    referenceLibraryItems: ReferenceLibraryItem[];
    libraryIndexResponseCount: number;
    recordIngestedDocument: UseChatPageActionsArgs["recordIngestedDocument"];
    gptMemorySettingsControls: GptMemorySettingsControls;
    ingestProtocolMessage: UseChatPageActionsArgs["ingestProtocolMessage"];
  };
  reset: UseChatPageControllerArgs["panelReset"];
  automation: UseChatPageControllerArgs["protocolAutomation"];
};

export function useChatPageControllerComposition(
  args: ChatPageControllerCompositionArgs
): UseChatPageControllerArgs {
  const actions: UseChatPageActionsArgs = {
    currentKin: args.app.currentKin,
    kinList: args.app.kinList,
    isMobile: args.app.isMobile,
    setActiveTab: args.app.setActiveTab,
    setKinConnectionState: args.app.setKinConnectionState,
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

  return {
    actions,
    protocolAutomation: args.automation,
    panelReset: args.reset,
  };
}

type ChatPagePanelCompositionArgs = {
  app: {
    currentKin: string | null;
    currentKinLabel: string | null;
    kinStatus: string;
    kinList: KinPanelProps["kinList"];
    isMobile: boolean;
    activeTabSetter: () => void;
  };
  kinState: {
    kinIdInput: string;
    setKinIdInput: (value: string) => void;
    kinNameInput: string;
    setKinNameInput: (value: string) => void;
    currentKin: string | null;
    kinMessages: Message[];
    kinInput: string;
    setKinInput: (value: string) => void;
    renameKin: KinPanelProps["renameKin"];
    kinBottomRef: KinPanelProps["kinBottomRef"];
    loading: boolean;
    pendingInjectionBlocks: string[];
    pendingInjectionIndex: number;
  };
  gptState: {
    gptState: BuildGptPanelArgs["chat"]["gptState"];
    gptMessages: Message[];
    gptInput: string;
    setGptInput: BuildGptPanelArgs["chat"]["setGptInput"];
    gptBottomRef: BuildGptPanelArgs["chat"]["gptBottomRef"];
    loading: boolean;
    ingestLoading: boolean;
  };
  task: {
    currentTaskDraft: TaskDraft;
    taskDraftCount: number;
    activeTaskDraftIndex: number;
    taskProtocolView: TaskProtocolView;
    resetCurrentTaskDraft: () => void;
    updateTaskDraftFields: BuildGptPanelArgs["task"]["updateTaskDraftFields"];
    pendingRequests: BuildGptPanelArgs["task"]["pendingRequests"];
    buildTaskRequestAnswerDraft: BuildGptPanelArgs["task"]["buildTaskRequestAnswerDraft"];
    onSaveTaskSnapshot: () => void;
    onSelectPreviousTaskDraft?: () => void;
    onSelectNextTaskDraft?: () => void;
  };
  references: {
    lastSearchContext: SearchContext | null;
    searchHistory: SearchContext[];
    selectedTaskSearchResultId: string;
    multipartAssemblies: BuildGptPanelArgs["references"]["multipartAssemblies"];
    storedDocuments: StoredDocument[];
    referenceLibraryItems: ReferenceLibraryItem[];
    selectedTaskLibraryItemId: string;
    onSelectTaskSearchResult: (rawResultId: string) => void;
    onMoveSearchHistoryItem: BuildGptPanelArgs["references"]["onMoveSearchHistoryItem"];
    onDeleteSearchHistoryItem: BuildGptPanelArgs["references"]["onDeleteSearchHistoryItem"];
    onLoadMultipartAssemblyToGptInput: BuildGptPanelArgs["references"]["onLoadMultipartAssemblyToGptInput"];
    onDownloadMultipartAssembly: BuildGptPanelArgs["references"]["onDownloadMultipartAssembly"];
    onDeleteMultipartAssembly: BuildGptPanelArgs["references"]["onDeleteMultipartAssembly"];
    onLoadStoredDocumentToGptInput: BuildGptPanelArgs["references"]["onLoadStoredDocumentToGptInput"];
    onDownloadStoredDocument: BuildGptPanelArgs["references"]["onDownloadStoredDocument"];
    onDeleteStoredDocument: BuildGptPanelArgs["references"]["onDeleteStoredDocument"];
    onMoveStoredDocument: BuildGptPanelArgs["references"]["onMoveStoredDocument"];
    onMoveLibraryItem: BuildGptPanelArgs["references"]["onMoveLibraryItem"];
    onSelectTaskLibraryItem: (itemId: string) => void;
    onChangeLibraryItemMode: BuildGptPanelArgs["references"]["onChangeLibraryItemMode"];
    onSaveStoredDocument: BuildGptPanelArgs["references"]["onSaveStoredDocument"];
  };
  settings: Omit<
    BuildGptPanelArgs["settings"],
    | "onSaveMemorySettings"
    | "onResetMemorySettings"
    | "memoryInterpreterSettings"
    | "pendingMemoryRuleCandidates"
    | "approvedMemoryRules"
    | "onApproveMemoryRuleCandidate"
    | "onRejectMemoryRuleCandidate"
    | "onUpdateMemoryRuleCandidate"
    | "onDeleteApprovedMemoryRule"
  >;
  protocolState: {
    protocolPrompt: string;
    protocolRulebook: string;
    pendingIntentCandidates: PendingIntentCandidate[];
    approvedIntentPhrases: ApprovedIntentPhrase[];
    onChangeProtocolPrompt: (value: string) => void;
    onChangeProtocolRulebook: (value: string) => void;
  };
  memoryState: {
    memoryInterpreterSettings: MemoryInterpreterSettings;
    pendingMemoryRuleCandidates: PendingMemoryRuleCandidate[];
    approvedMemoryRules: ApprovedMemoryRule[];
    onApproveMemoryRuleCandidate: (candidateId: string) => void;
    onRejectMemoryRuleCandidate: (candidateId: string) => void;
    onUpdateMemoryRuleCandidate: (
      candidateId: string,
      patch: Partial<PendingMemoryRuleCandidate>
    ) => void;
    onDeleteApprovedMemoryRule: (ruleId: string) => void;
  };
  controller: ChatPageControllerGroups;
};

export function useChatPagePanelComposition(
  args: ChatPagePanelCompositionArgs
): {
  kinPanelProps: KinPanelProps;
  gptPanelArgs: BuildGptPanelArgs;
} {
  const pendingInjectionState = {
    blocks: args.kinState.pendingInjectionBlocks,
    index: args.kinState.pendingInjectionIndex,
  };
  const pendingInjectionProgress =
    resolvePendingInjectionProgress(pendingInjectionState);

  return {
    kinPanelProps: {
      kinIdInput: args.kinState.kinIdInput,
      setKinIdInput: args.kinState.setKinIdInput,
      kinNameInput: args.kinState.kinNameInput,
      setKinNameInput: args.kinState.setKinNameInput,
      connectKin: args.controller.panel.handleConnectKin,
      disconnectKin: args.controller.panel.handleDisconnectKin,
      kinStatus: args.app.kinStatus as KinPanelProps["kinStatus"],
      currentKin: args.kinState.currentKin,
      currentKinLabel: args.app.currentKinLabel,
      kinList: args.app.kinList,
      switchKin: args.controller.panel.handleSwitchKin,
      removeKin: args.controller.panel.handleRemoveKin,
      renameKin: args.kinState.renameKin,
      kinMessages: args.kinState.kinMessages,
      kinInput: args.kinState.kinInput,
      setKinInput: args.kinState.setKinInput,
      sendToKin: args.controller.kin.sendToKin,
      sendLastKinToGptDraft: args.controller.kin.sendLastKinToGptDraft,
      resetKinMessages: args.controller.panel.resetKinMessages,
      pendingInjectionCurrentPart: pendingInjectionProgress.currentPart,
      pendingInjectionTotalParts: pendingInjectionProgress.totalParts,
      kinBottomRef: args.kinState.kinBottomRef,
      isMobile: args.app.isMobile,
      onSwitchPanel: args.app.activeTabSetter,
      loading: args.kinState.loading,
    },
    gptPanelArgs: {
      header: {
        currentKin: args.app.currentKin,
        currentKinLabel: args.app.currentKinLabel,
        kinStatus: args.app.kinStatus,
        isMobile: args.app.isMobile,
        onSwitchPanel: args.app.activeTabSetter,
      },
      chat: {
        gptState: args.gptState.gptState,
        gptMessages: args.gptState.gptMessages,
        gptInput: args.gptState.gptInput,
        setGptInput: args.gptState.setGptInput,
        sendToGpt: args.controller.gpt.sendToGpt,
        injectFileToKinDraft: args.controller.gpt.injectFileToKinDraft,
        resetGptForCurrentKin: args.controller.panel.handleResetGpt,
        loading: args.gptState.loading,
        gptBottomRef: args.gptState.gptBottomRef,
      },
      task: {
        currentTaskDraft: args.task.currentTaskDraft,
        taskDraftCount: args.task.taskDraftCount,
        activeTaskDraftIndex: args.task.activeTaskDraftIndex,
        taskProgressView: args.task.taskProtocolView.progressView,
        taskProgressCount: args.task.taskProtocolView.progressViews.length,
        activeTaskProgressIndex: args.task.taskProtocolView.activeProgressIndex,
        runPrepTaskFromInput: args.controller.task.runPrepTaskFromInput,
        runDeepenTaskFromLast: args.controller.task.runDeepenTaskFromLast,
        runUpdateTaskFromInput: args.controller.task.runUpdateTaskFromInput,
        runUpdateTaskFromLastGptMessage:
          args.controller.task.runUpdateTaskFromLastGptMessage,
        runAttachSearchResultToTask:
          args.controller.task.runAttachSearchResultToTask,
        sendLatestGptContentToKin: args.controller.kin.sendLatestGptContentToKin,
        sendCurrentTaskContentToKin: args.controller.kin.sendCurrentTaskContentToKin,
        receiveLastKinResponseToGptInput:
          args.controller.gpt.receiveLastKinResponseToGptInput,
        sendLastGptToKinDraft: args.controller.kin.sendLastGptToKinDraft,
        onSaveTaskSnapshot: args.task.onSaveTaskSnapshot,
        onSelectPreviousTaskDraft: args.task.onSelectPreviousTaskDraft,
        onSelectNextTaskDraft: args.task.onSelectNextTaskDraft,
        onPrepareTaskRequestAck: args.controller.task.prepareTaskRequestAck,
        onPrepareTaskSync: args.controller.task.prepareTaskSync,
        onPrepareTaskSuspend: args.controller.task.prepareTaskSuspend,
        onUpdateTaskProgressCounts:
          args.task.taskProtocolView.onUpdateTaskProgressCounts,
        onClearTaskProgress: args.task.taskProtocolView.onClearTaskProgress,
        onSelectPreviousTaskProgress:
          args.task.taskProtocolView.onSelectPreviousTaskProgress,
        onSelectNextTaskProgress:
          args.task.taskProtocolView.onSelectNextTaskProgress,
        onStartKinTask: args.controller.kin.runStartKinTaskFromInput,
        onResetTaskContext: args.task.resetCurrentTaskDraft,
        pendingInjection: pendingInjectionState,
        updateTaskDraftFields: args.task.updateTaskDraftFields,
        pendingRequests: args.task.pendingRequests,
        buildTaskRequestAnswerDraft: args.task.buildTaskRequestAnswerDraft,
      },
      protocol: {
        protocolPrompt: args.protocolState.protocolPrompt,
        protocolRulebook: args.protocolState.protocolRulebook,
        pendingIntentCandidates: args.protocolState.pendingIntentCandidates,
        approvedIntentPhrases: args.protocolState.approvedIntentPhrases,
        onChangeProtocolPrompt: args.protocolState.onChangeProtocolPrompt,
        onChangeProtocolRulebook: args.protocolState.onChangeProtocolRulebook,
        onResetProtocolDefaults: args.controller.protocol.resetProtocolDefaults,
        onSaveProtocolDefaults: args.controller.protocol.saveProtocolDefaults,
        onSetProtocolRulebookToKinDraft:
          args.controller.protocol.setProtocolRulebookToKinDraft,
        onSendProtocolRulebookToKin:
          args.controller.protocol.sendProtocolRulebookToKin,
        onUpdateIntentCandidate: args.controller.protocol.updateIntentCandidate,
        onApproveIntentCandidate: args.controller.protocol.approveIntentCandidate,
        onRejectIntentCandidate: args.controller.protocol.rejectIntentCandidate,
        onUpdateApprovedIntentPhrase:
          args.controller.protocol.updateApprovedIntentPhrase,
        onDeleteApprovedIntentPhrase:
          args.controller.protocol.deleteApprovedIntentPhrase,
      },
      references: {
        lastSearchContext: args.references.lastSearchContext,
        searchHistory: args.references.searchHistory,
        selectedTaskSearchResultId: args.references.selectedTaskSearchResultId,
        multipartAssemblies: args.references.multipartAssemblies,
        storedDocuments: args.references.storedDocuments,
        referenceLibraryItems: args.references.referenceLibraryItems,
        selectedTaskLibraryItemId: args.references.selectedTaskLibraryItemId,
        onSelectTaskSearchResult: args.references.onSelectTaskSearchResult,
        onMoveSearchHistoryItem: args.references.onMoveSearchHistoryItem,
        onDeleteSearchHistoryItem: args.references.onDeleteSearchHistoryItem,
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
        onStartAskAiModeSearch: args.controller.gpt.startAskAiModeSearch,
        onImportYouTubeTranscript: args.controller.gpt.importYouTubeTranscript,
        onSendYouTubeTranscriptToKin:
          args.controller.gpt.sendYouTubeTranscriptToKin,
        onSaveStoredDocument: args.references.onSaveStoredDocument,
      },
      settings: {
        ...args.settings,
        memoryInterpreterSettings: args.memoryState.memoryInterpreterSettings,
        pendingMemoryRuleCandidates:
          args.memoryState.pendingMemoryRuleCandidates,
        approvedMemoryRules: args.memoryState.approvedMemoryRules,
        onSaveMemorySettings: args.controller.memory.handleSaveMemorySettings,
        onResetMemorySettings: args.controller.memory.handleResetMemorySettings,
        onApproveMemoryRuleCandidate:
          args.memoryState.onApproveMemoryRuleCandidate,
        onRejectMemoryRuleCandidate: args.memoryState.onRejectMemoryRuleCandidate,
        onUpdateMemoryRuleCandidate: args.memoryState.onUpdateMemoryRuleCandidate,
        onDeleteApprovedMemoryRule: args.memoryState.onDeleteApprovedMemoryRule,
      },
    },
  };
}
