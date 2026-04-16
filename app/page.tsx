"use client";

import { useEffect, useRef, useState } from "react";
import ChatPanelsLayout from "@/components/ChatPanelsLayout";
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
import { usePendingMemoryRuleQueue } from "@/hooks/usePendingMemoryRuleQueue";
import { useChatPageWorkspaceView } from "@/hooks/useChatPageWorkspaceView";
import type { Message } from "@/types/chat";
import type { TaskCharConstraint } from "@/lib/app/multipartAssemblyFlow";
import { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import {
  buildTaskRequestAnswerDraft,
} from "@/lib/app/chatPageHelpers";
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

  const gptMemorySettingsControls = buildChatPageGptMemorySettingsControls({
    updateMemorySettings,
    resetMemorySettings,
  });

  const { kinPanel, gptPanel } = useChatPageWorkspaceView({
    app: {
      currentKin,
      currentKinLabel: currentKinDisplayLabel,
      kinStatus,
      kinList,
      isMobile,
      setActiveTab,
      setKinConnectionState,
    },
    ui: {
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
      kinBottomRef,
      gptBottomRef,
    },
    task: {
      currentTaskDraft,
      setCurrentTaskDraft,
      taskDraftCount: taskDrafts.length,
      activeTaskDraftIndex,
      getTaskBaseText,
      getTaskLibraryItem,
      getResolvedTaskTitle,
      resolveTaskTitleFromDraft,
      getTaskSlotLabel,
      syncTaskDraftFromProtocol,
      applyPrefixedTaskFieldsFromText,
      getCurrentTaskCharConstraint,
      resetCurrentTaskDraft,
      updateTaskDraftFields,
      buildTaskRequestAnswerDraft,
      onSelectPreviousTaskDraft: selectPreviousTaskDraft,
      onSelectNextTaskDraft: selectNextTaskDraft,
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
      onChangeProtocolPrompt: setProtocolPrompt,
      onChangeProtocolRulebook: setProtocolRulebook,
      promptDefaultKey: PROTOCOL_PROMPT_DEFAULT_KEY,
      rulebookDefaultKey: PROTOCOL_RULEBOOK_DEFAULT_KEY,
    },
    search: {
      lastSearchContext,
      searchHistory,
      selectedTaskSearchResultId,
      searchMode,
      searchEngines,
      searchLocation,
      processMultipartTaskDoneText,
      recordSearchContext,
      getContinuationTokenForSeries,
      getAskAiModeLinkForQuery,
      clearSearchHistory,
      deleteSearchHistoryItemBase,
      onMoveSearchHistoryItem: moveSearchHistoryItem,
      onSelectTaskSearchResult: setSelectedTaskSearchResultId,
      onDeleteSearchHistoryItem: deleteSearchHistoryItem,
      sourceDisplayCount,
      onChangeSearchMode: setSearchMode,
      onChangeSearchEngines: setSearchEngines,
      onChangeSearchLocation: setSearchLocation,
      onChangeSourceDisplayCount: setSourceDisplayCount,
    },
    references: {
      multipartAssemblies,
      storedDocuments: allDocuments,
      referenceLibraryItems: libraryItems,
      selectedTaskLibraryItemId,
      onDeleteMultipartAssembly: deleteMultipartAssembly,
      onLoadMultipartAssemblyToGptInput: loadMultipartAssemblyToGptInput,
      onDownloadMultipartAssembly: downloadMultipartAssembly,
      onLoadStoredDocumentToGptInput: loadStoredDocumentToGptInput,
      onDownloadStoredDocument: downloadStoredDocument,
      onDeleteStoredDocument: deleteStoredDocument,
      onMoveStoredDocument: moveStoredDocument,
      onMoveLibraryItem: moveLibraryItem,
      onSelectTaskLibraryItem: setSelectedTaskLibraryItemId,
      onChangeLibraryItemMode: setLibraryItemModeOverride,
      onSaveStoredDocument: updateStoredDocument,
      buildLibraryReferenceContext,
      autoLibraryReferenceEnabled,
      onChangeAutoLibraryReferenceEnabled: setAutoLibraryReferenceEnabled,
      libraryReferenceMode,
      onChangeLibraryReferenceMode: setLibraryReferenceMode,
      libraryIndexResponseCount,
      onChangeLibraryIndexResponseCount: setLibraryIndexResponseCount,
      libraryReferenceCount,
      onChangeLibraryReferenceCount: setLibraryReferenceCount,
      libraryStorageMB,
      libraryReferenceEstimatedTokens,
    },
    gpt: {
      gptState,
      resetGptForCurrentKin,
      gptMemoryRuntime,
      responseMode,
      onChangeResponseMode: setResponseMode,
      uploadKind,
      onChangeUploadKind: setUploadKind,
      ingestMode,
      onChangeIngestMode: setIngestMode,
      imageDetail,
      onChangeImageDetail: setImageDetail,
      compactCharLimit,
      onChangeCompactCharLimit: setCompactCharLimit,
      simpleImageCharLimit,
      onChangeSimpleImageCharLimit: setSimpleImageCharLimit,
      postIngestAction,
      onChangePostIngestAction: setPostIngestAction,
      fileReadPolicy,
      onChangeFileReadPolicy: setFileReadPolicy,
      defaultMemorySettings,
      gptMemorySettingsControls,
    },
    bridge: {
      autoBridgeSettings,
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
    },
    memory: {
      tokenStats,
      memorySettings,
      memoryInterpreterSettings,
      pendingMemoryRuleCandidates,
      approvedMemoryRules,
      onChangeMemoryInterpreterSettings: updateMemoryInterpreterSettings,
      onApproveMemoryRuleCandidate: approveMemoryRuleCandidate,
      onRejectMemoryRuleCandidate: rejectMemoryRuleCandidate,
      onUpdateMemoryRuleCandidate: updateMemoryRuleCandidate,
      onDeleteApprovedMemoryRule: deleteApprovedMemoryRule,
    },
    usage: {
      applySearchUsage,
      applyChatUsage,
      applySummaryUsage,
      applyTaskUsage,
      applyIngestUsage,
      recordIngestedDocument,
    },
    kin: {
      kinIdInput,
      setKinIdInput,
      kinNameInput,
      setKinNameInput,
      renameKin,
    },
    reset: {
      resetTokenStats,
      connectKin,
      switchKin,
      disconnectKin,
      removeKinState,
      removeKin,
    },
  });

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
