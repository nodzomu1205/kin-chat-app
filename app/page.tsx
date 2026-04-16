"use client";

import { useEffect, useRef, useState } from "react";
import ChatPanelsLayout from "@/components/ChatPanelsLayout";
import KinPanel from "@/components/panels/kin/KinPanel";
import GptPanel from "@/components/panels/gpt/GptPanel";
import { useKinManager } from "@/hooks/useKinManager";
import { useGptMemory } from "@/hooks/useGptMemory";
import { useResponsive } from "@/hooks/useResponsive";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import { useAutoBridgeSettings } from "@/hooks/useAutoBridgeSettings";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import {
  useSearchHistory,
} from "@/hooks/useSearchHistory";
import { useMultipartAssemblies } from "@/hooks/useMultipartAssemblies";
import { useStoredDocuments } from "@/hooks/useStoredDocuments";
import { useReferenceLibrary } from "@/hooks/useReferenceLibrary";
import { useMultipartUiActions } from "@/hooks/useMultipartUiActions";
import { useProtocolIntentSettings } from "@/hooks/useProtocolIntentSettings";
import { useMemoryInterpreterSettings } from "@/hooks/useMemoryInterpreterSettings";
import { useMemoryRuleActions } from "@/hooks/useMemoryRuleActions";
import { useChatPageLifecycle } from "@/hooks/useChatPageLifecycle";
import { useStoredDocumentUiActions } from "@/hooks/useStoredDocumentUiActions";
import { useTaskDraftHelpers } from "@/hooks/useTaskDraftHelpers";
import { useTaskDraftWorkspace } from "@/hooks/useTaskDraftWorkspace";
import { useTaskProtocolProjection } from "@/hooks/useTaskProtocolProjection";
import { useArchiveCompletedTaskResults } from "@/hooks/useArchiveCompletedTaskResults";
import { useChatPageController } from "@/hooks/useChatPageController";
import { usePendingMemoryRuleQueue } from "@/hooks/usePendingMemoryRuleQueue";
import {
  useChatPageControllerComposition,
  useChatPagePanelComposition,
} from "@/hooks/useChatPageComposition";
import type { Message } from "@/types/chat";
import type { TaskCharConstraint } from "@/lib/app/multipartAssemblyFlow";
import { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import {
  buildTaskRequestAnswerDraft,
} from "@/lib/app/chatPageHelpers";
import {
  buildGptPanelProps,
} from "@/lib/app/panelPropsBuilders";
import { buildStoredDocumentFromTaskDraft } from "@/lib/app/taskDraftLibrary";
import { PROTOCOL_PROMPT_DEFAULT_KEY, PROTOCOL_RULEBOOK_DEFAULT_KEY } from "@/lib/app/chatPageStorageKeys";
import {
  buildChatPageGptMemoryRuntime,
  buildChatPageGptMemorySettingsControls,
} from "@/lib/app/chatPageGptMemoryControls";

type MobileTab = "kin" | "gpt";

const MOBILE_BREAKPOINT = 1180;

export default function ChatApp() {
  const [kinMessages, setKinMessages] = useState<Message[]>([]);
  const [gptMessages, setGptMessages] = useState<Message[]>([]);
  const [kinInput, setKinInput] = useState("");
  const [gptInput, setGptInput] = useState("");
  const [kinLoading, setKinLoading] = useState(false);
  const [gptLoading, setGptLoading] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [pendingKinInjectionBlocks, setPendingKinInjectionBlocks] = useState<
    string[]
  >([]);
  const [pendingKinInjectionIndex, setPendingKinInjectionIndex] = useState(0);
  const [, setCurrentSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MobileTab>("kin");

  const isMobile = useResponsive(MOBILE_BREAKPOINT);
  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);
  const {
    taskDrafts,
    activeTaskDraftIndex,
    currentTaskDraft,
    setCurrentTaskDraft,
    selectPreviousTaskDraft,
    selectNextTaskDraft,
  } = useTaskDraftWorkspace();

  useAutoScroll(kinBottomRef, [kinMessages, kinLoading]);
  useAutoScroll(gptBottomRef, [gptMessages, gptLoading]);

  const {
    responseMode,
    setResponseMode,
    uploadKind,
    setUploadKind,
    ingestMode,
    setIngestMode,
    imageDetail,
    setImageDetail,
    compactCharLimit,
    setCompactCharLimit,
    simpleImageCharLimit,
    setSimpleImageCharLimit,
    postIngestAction,
    setPostIngestAction,
    fileReadPolicy,
    setFileReadPolicy,
  } = usePersistedGptOptions();
  const { autoBridgeSettings, updateAutoBridgeSettings } = useAutoBridgeSettings();
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

  const {
    tokenStats,
    applyChatUsage,
    applySummaryUsage,
    applySearchUsage,
    applyTaskUsage,
    applyIngestUsage,
    resetTokenStats,
  } = useTokenTracking();

  const {
    kinIdInput,
    setKinIdInput,
    kinNameInput,
    setKinNameInput,
    kinList,
    currentKin,
    kinStatus,
    setKinConnectionState,
    connectKin,
    switchKin,
    disconnectKin,
    removeKin,
    renameKin,
  } = useKinManager();
  const currentKinDisplayLabel =
    kinList.find((kin) => kin.id === currentKin)?.label ?? null;
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
  } = useGptMemory(currentKin, {
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
    lastSearchContext,
    searchHistory,
    selectedTaskSearchResultId,
    setSelectedTaskSearchResultId,
    searchMode,
    setSearchMode,
    searchEngines,
    setSearchEngines,
    searchLocation,
    setSearchLocation,
    sourceDisplayCount,
    setSourceDisplayCount,
    moveSearchHistoryItem,
    recordSearchContext,
    getContinuationTokenForSeries,
    getAskAiModeLinkForQuery,
    clearSearchHistory,
    deleteSearchHistoryItem: deleteSearchHistoryItemBase,
    searchHistoryStorageMB,
  } = useSearchHistory();
    const {
      multipartAssemblies,
      setMultipartAssemblies,
      deleteMultipartAssembly,
      loadMultipartAssemblyText,
      getMultipartAssembly,
      multipartStorageMB,
    } = useMultipartAssemblies();
  const {
    allDocuments,
    documentStorageMB,
    recordIngestedDocument,
    updateStoredDocument,
    deleteStoredDocument,
    moveStoredDocument,
    getStoredDocument,
  } = useStoredDocuments(multipartAssemblies);
  const {
    libraryItems,
    selectedTaskLibraryItemId,
    setSelectedTaskLibraryItemId,
    autoLibraryReferenceEnabled,
    setAutoLibraryReferenceEnabled,
    libraryReferenceMode,
    setLibraryReferenceMode,
    libraryIndexResponseCount,
    setLibraryIndexResponseCount,
    libraryReferenceCount,
    setLibraryReferenceCount,
    libraryStorageMB,
    setLibraryItemModeOverride,
    moveLibraryItem,
    getTaskLibraryItem,
    buildLibraryReferenceContext,
    estimateLibraryReferenceTokens,
  } = useReferenceLibrary({
      storedDocuments: allDocuments,
      searchHistory,
      searchHistoryStorageMB,
      documentStorageMB,
    multipartStorageMB,
    sourceDisplayCount,
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

  const [chatBridgeSettings] = useState<ChatBridgeSettings>({
    injectTaskContextOnReference: true,
    alwaysShowCurrentTaskInChatContext: false,
  });

  useChatPageLifecycle({
    currentKin,
    ensureKinState,
    isMobile,
    setActiveTab,
    setCurrentSessionId,
  });

  const libraryReferenceEstimatedTokens = estimateLibraryReferenceTokens();

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
    currentTaskDraft,
    gptMessages,
    setCurrentTaskDraft,
    resetTaskProtocolRuntime: taskProtocolView.resetRuntime,
    clearTaskScopedMemory: gptMemoryRuntime.clearTaskScopedMemory,
    deleteSearchHistoryItemBase,
    currentTaskIntentConstraints: taskProtocolView.currentTaskIntentConstraints,
  });

  const {
    processMultipartTaskDoneText,
    loadMultipartAssemblyToGptInput,
    downloadMultipartAssembly,
  } = useMultipartUiActions({
    multipartAssemblies,
    setMultipartAssemblies,
    currentTaskId: taskProtocolView.currentTaskId,
    currentTaskTitle: taskProtocolView.currentTaskTitle,
    currentKinLabel: currentKinDisplayLabel,
    getCurrentTaskCharConstraint: () =>
      getCurrentTaskCharConstraint() as TaskCharConstraint | null,
    setKinInput,
    setGptMessages,
    setFinalizeReviewed: taskProtocolView.setFinalizeReviewed,
    isMobile,
    setActiveTab,
    loadMultipartAssemblyText,
    getMultipartAssembly,
    setGptInput,
  });

  const { loadStoredDocumentToGptInput, downloadStoredDocument } =
    useStoredDocumentUiActions({
      getStoredDocument,
      setGptInput,
      isMobile,
      setActiveTab,
    });

  useArchiveCompletedTaskResults({
    documents: allDocuments,
    progressViews: taskProtocolView.progressViews,
    archiveTask: taskProtocolView.onClearTaskProgress,
  });

  const handleSaveTaskSnapshot = () => {
    const nextDocument = buildStoredDocumentFromTaskDraft(currentTaskDraft);
    if (!nextDocument) return;
    recordIngestedDocument(nextDocument);
  };

  const gptMemorySettingsControls = buildChatPageGptMemorySettingsControls({
    updateMemorySettings,
    resetMemorySettings,
  });

  const chatPageControllerArgs = useChatPageControllerComposition({
    app: {
      currentKin,
      kinList,
      isMobile,
      setActiveTab,
      setKinConnectionState,
    },
    uiState: {
      gptInput,
      kinInput,
      gptLoading,
      kinLoading,
      ingestLoading,
      gptMessages,
      kinMessages,
      pendingKinInjectionBlocks,
      pendingKinInjectionIndex,
      setKinInput,
      setGptInput,
      setKinMessages,
      setGptMessages,
      setKinLoading,
      setGptLoading,
      setIngestLoading,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
    },
    task: {
      currentTaskDraft,
      setCurrentTaskDraft,
      getTaskBaseText,
      getTaskLibraryItem,
      getResolvedTaskTitle,
      resolveTaskTitleFromDraft,
      getTaskSlotLabel,
      syncTaskDraftFromProtocol,
      applyPrefixedTaskFieldsFromText,
      getCurrentTaskCharConstraint,
      resetCurrentTaskDraft,
      taskProtocol,
      taskProtocolView,
    },
    protocol: {
      approvedIntentPhrases,
      rejectedIntentCandidateSignatures,
      pendingIntentCandidates,
      protocolPrompt,
      protocolRulebook,
      chatBridgeSettings,
      setPendingIntentCandidates,
      setApprovedIntentPhrases,
      setRejectedIntentCandidateSignatures,
      setProtocolPrompt,
      setProtocolRulebook,
      promptDefaultKey: PROTOCOL_PROMPT_DEFAULT_KEY,
      rulebookDefaultKey: PROTOCOL_RULEBOOK_DEFAULT_KEY,
    },
    search: {
      lastSearchContext,
      searchMode,
      searchEngines,
      searchLocation,
      processMultipartTaskDoneText,
      recordSearchContext,
      getContinuationTokenForSeries,
      getAskAiModeLinkForQuery,
      clearSearchHistory,
      deleteSearchHistoryItemBase,
    },
    services: {
      responseMode,
      autoCopyFileIngestSysInfoToKin:
        autoBridgeSettings.autoCopyFileIngestSysInfoToKin,
      gptMemoryRuntime,
      setUploadKind,
      applySearchUsage,
      applyChatUsage,
      applySummaryUsage,
      applyTaskUsage,
      applyIngestUsage,
      buildLibraryReferenceContext,
      referenceLibraryItems: libraryItems,
      libraryIndexResponseCount,
      recordIngestedDocument,
      gptMemorySettingsControls,
      ingestProtocolMessage: taskProtocolView.ingestProtocolMessage,
    },
    automation: {
      autoBridgeSettings,
      kinInput,
      gptInput,
      kinLoading,
      gptLoading,
      kinMessages,
      gptMessages,
      setGptInput,
      setKinInput,
      isMobile,
      setActiveTab,
    },
    reset: {
      setKinMessages,
      setGptMessages,
      resetTokenStats,
      resetCurrentTaskDraft,
      isMobile,
      setActiveTab,
      connectKin,
      switchKin,
      disconnectKin,
      removeKinState,
      removeKin,
      resetGptForCurrentKin,
    },
  });

  const { kin, gpt, task, protocol, memory, panel } =
    useChatPageController(chatPageControllerArgs);

  const { kinPanelProps, gptPanelArgs } = useChatPagePanelComposition({
    app: {
      currentKin,
      currentKinLabel: currentKinDisplayLabel,
      kinStatus,
      kinList,
      isMobile,
      activeTabSetter: () => setActiveTab("kin"),
    },
    kinState: {
      kinIdInput,
      setKinIdInput,
      kinNameInput,
      setKinNameInput,
      currentKin,
      kinMessages,
      kinInput,
      setKinInput,
      renameKin,
      kinBottomRef,
      loading: kinLoading,
      pendingInjectionBlocks: pendingKinInjectionBlocks,
      pendingInjectionIndex: pendingKinInjectionIndex,
    },
    gptState: {
      gptState,
      gptMessages,
      gptInput,
      setGptInput,
      gptBottomRef,
      loading: gptLoading,
      ingestLoading,
    },
    task: {
      currentTaskDraft,
      taskDraftCount: taskDrafts.length,
      activeTaskDraftIndex,
      taskProtocolView,
      resetCurrentTaskDraft,
      updateTaskDraftFields,
      pendingRequests: taskProtocolView.pendingRequests,
      buildTaskRequestAnswerDraft,
      onSaveTaskSnapshot: handleSaveTaskSnapshot,
      onSelectPreviousTaskDraft: selectPreviousTaskDraft,
      onSelectNextTaskDraft: selectNextTaskDraft,
    },
    references: {
      lastSearchContext,
      searchHistory,
      selectedTaskSearchResultId,
      multipartAssemblies,
      storedDocuments: allDocuments,
      referenceLibraryItems: libraryItems,
      selectedTaskLibraryItemId,
      onSelectTaskSearchResult: setSelectedTaskSearchResultId,
      onMoveSearchHistoryItem: moveSearchHistoryItem,
      onDeleteSearchHistoryItem: deleteSearchHistoryItem,
      onLoadMultipartAssemblyToGptInput: loadMultipartAssemblyToGptInput,
      onDownloadMultipartAssembly: downloadMultipartAssembly,
      onDeleteMultipartAssembly: deleteMultipartAssembly,
      onLoadStoredDocumentToGptInput: loadStoredDocumentToGptInput,
      onDownloadStoredDocument: downloadStoredDocument,
      onDeleteStoredDocument: deleteStoredDocument,
      onMoveStoredDocument: moveStoredDocument,
      onMoveLibraryItem: moveLibraryItem,
      onSelectTaskLibraryItem: setSelectedTaskLibraryItemId,
      onChangeLibraryItemMode: setLibraryItemModeOverride,
      onSaveStoredDocument: updateStoredDocument,
    },
    settings: {
      memorySettings,
      defaultMemorySettings,
      tokenStats,
      responseMode,
      uploadKind,
      ingestMode,
      imageDetail,
      postIngestAction,
      fileReadPolicy,
      compactCharLimit,
      simpleImageCharLimit,
      ingestLoading,
      canInjectFile: !gptLoading && !ingestLoading,
      searchMode,
      searchEngines,
      searchLocation,
      sourceDisplayCount,
      autoLibraryReferenceEnabled,
      libraryReferenceMode,
      libraryIndexResponseCount,
      libraryReferenceCount,
      libraryStorageMB,
      libraryReferenceEstimatedTokens,
      autoSendKinSysInput: autoBridgeSettings.autoSendKinSysInput,
      autoCopyKinSysResponseToGpt:
        autoBridgeSettings.autoCopyKinSysResponseToGpt,
      autoSendGptSysInput: autoBridgeSettings.autoSendGptSysInput,
      autoCopyGptSysResponseToKin:
        autoBridgeSettings.autoCopyGptSysResponseToKin,
      autoCopyFileIngestSysInfoToKin:
        autoBridgeSettings.autoCopyFileIngestSysInfoToKin,
      onChangeResponseMode: setResponseMode,
      onChangeUploadKind: setUploadKind,
      onChangeIngestMode: setIngestMode,
      onChangeImageDetail: setImageDetail,
      onChangeCompactCharLimit: setCompactCharLimit,
      onChangeSimpleImageCharLimit: setSimpleImageCharLimit,
      onChangePostIngestAction: setPostIngestAction,
      onChangeFileReadPolicy: setFileReadPolicy,
      onChangeSearchMode: setSearchMode,
      onChangeSearchEngines: setSearchEngines,
      onChangeSearchLocation: setSearchLocation,
      onChangeSourceDisplayCount: setSourceDisplayCount,
      onChangeAutoLibraryReferenceEnabled: setAutoLibraryReferenceEnabled,
      onChangeLibraryReferenceMode: setLibraryReferenceMode,
      onChangeLibraryIndexResponseCount: setLibraryIndexResponseCount,
      onChangeLibraryReferenceCount: setLibraryReferenceCount,
      onChangeAutoSendKinSysInput: (value: boolean) =>
        updateAutoBridgeSettings({ autoSendKinSysInput: value }),
      onChangeAutoCopyKinSysResponseToGpt: (value: boolean) =>
        updateAutoBridgeSettings({ autoCopyKinSysResponseToGpt: value }),
      onChangeAutoSendGptSysInput: (value: boolean) =>
        updateAutoBridgeSettings({ autoSendGptSysInput: value }),
      onChangeAutoCopyGptSysResponseToKin: (value: boolean) =>
        updateAutoBridgeSettings({ autoCopyGptSysResponseToKin: value }),
      onChangeAutoCopyFileIngestSysInfoToKin: (value: boolean) =>
        updateAutoBridgeSettings({ autoCopyFileIngestSysInfoToKin: value }),
      onChangeMemoryInterpreterSettings: updateMemoryInterpreterSettings,
    },
    protocolState: {
      protocolPrompt,
      protocolRulebook,
      pendingIntentCandidates,
      approvedIntentPhrases,
      onChangeProtocolPrompt: setProtocolPrompt,
      onChangeProtocolRulebook: setProtocolRulebook,
    },
    memoryState: {
      memoryInterpreterSettings,
      pendingMemoryRuleCandidates,
      approvedMemoryRules,
      onApproveMemoryRuleCandidate: approveMemoryRuleCandidate,
      onRejectMemoryRuleCandidate: rejectMemoryRuleCandidate,
      onUpdateMemoryRuleCandidate: updateMemoryRuleCandidate,
      onDeleteApprovedMemoryRule: deleteApprovedMemoryRule,
    },
    controller: { kin, gpt, task, protocol, memory, panel },
  });

  const kinPanel = <KinPanel {...kinPanelProps} />;
  const gptPanel = <GptPanel {...buildGptPanelProps(gptPanelArgs)} />;

  return (
    <div
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        backgroundPosition: "top left",
        overflow: "visible",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: isMobile ? 0 : 12,
          padding: isMobile ? 0 : 12,
          overflow: "visible",
        }}
      >
        <ChatPanelsLayout
          isMobile={isMobile}
          activeTab={activeTab}
          kinPanel={kinPanel}
          gptPanel={gptPanel}
        />
      </div>
    </div>
  );
}
