"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { usePanelResetActions } from "@/hooks/usePanelResetActions";
import { useProtocolIntentSettings } from "@/hooks/useProtocolIntentSettings";
import { useMemoryInterpreterSettings } from "@/hooks/useMemoryInterpreterSettings";
import { useMemoryRuleActions } from "@/hooks/useMemoryRuleActions";
import { useProtocolAutomationEffects } from "@/hooks/useProtocolAutomationEffects";
import { useChatPageLifecycle } from "@/hooks/useChatPageLifecycle";
import { useStoredDocumentUiActions } from "@/hooks/useStoredDocumentUiActions";
import { useTaskDraftHelpers } from "@/hooks/useTaskDraftHelpers";
import { useChatPageActions } from "@/hooks/useChatPageActions";
import type { MemorySettings } from "@/lib/memory";
import type { Message } from "@/types/chat";
import { generateId } from "@/lib/uuid";
import {
  buildPrepInputFromIngestResult,
  buildMergedTaskInput,
  buildTaskStructuredInput,
  buildTaskInput,
  formatTaskResultText,
  resolveUploadKindFromFile,
  runAutoDeepenTask,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import type { TaskCharConstraint } from "@/lib/app/multipartAssemblyFlow";
import type {
  GptInstructionMode,
  PostIngestAction,
} from "@/components/panels/gpt/gptPanelTypes";
import type { TaskDraft } from "@/types/task";
import { createEmptyTaskDraft } from "@/types/task";
import {
  createTaskSource,
  resetTaskDraft,
} from "@/lib/app/taskDraftHelpers";
import { resolveDraftTitle } from "@/lib/app/contextNaming";
import { parseTaskInput } from "@/lib/taskInputParser";
import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
  formatTaskSlot,
} from "@/lib/app/kinStructuredProtocol";
import {
  buildKinDirectiveLines,
  splitTextIntoKinChunks,
} from "@/lib/app/transformIntent";
import { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import {
  type PendingIntentCandidate,
} from "@/lib/taskIntent";
import { mergePendingMemoryRuleCandidates } from "@/lib/app/memoryRuleCandidateQueue";
import {
  buildTaskChatBridgeContext,
} from "@/lib/taskChatBridge";
import { buildUserResponseBlock } from "@/lib/taskRuntimeProtocol";
import {
  buildTaskRequestAnswerDraft,
} from "@/lib/app/chatPageHelpers";
import { buildGptPanelProps, buildKinPanelProps } from "@/lib/app/panelPropsBuilders";
import { buildStoredDocumentFromTaskDraft } from "@/lib/app/taskDraftLibrary";
import {
  appendTaskDraftSlot,
  createTaskDraftSlot,
  normalizeTaskDraftSlots,
  updateTaskDraftAtIndex,
} from "@/lib/app/taskDraftCollection";
import { PROTOCOL_PROMPT_DEFAULT_KEY, PROTOCOL_RULEBOOK_DEFAULT_KEY } from "@/lib/app/chatPageStorageKeys";
import { createProtocolEventIngestor } from "@/lib/app/protocolEventIngest";
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
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([
    createTaskDraftSlot(1),
  ]);
  const [activeTaskDraftIndex, setActiveTaskDraftIndex] = useState(0);

  const isMobile = useResponsive(MOBILE_BREAKPOINT);
  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);
  const currentTaskDraft =
    taskDrafts[activeTaskDraftIndex] || taskDrafts[0] || createEmptyTaskDraft();

  const setCurrentTaskDraft = useCallback<
    React.Dispatch<React.SetStateAction<TaskDraft>>
  >(
    (updater) => {
      setTaskDrafts((prev) =>
        updateTaskDraftAtIndex(prev, activeTaskDraftIndex, updater)
      );
    },
    [activeTaskDraftIndex]
  );

  const selectPreviousTaskDraft = useCallback(() => {
    setActiveTaskDraftIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const selectNextTaskDraft = useCallback(() => {
    setTaskDrafts((prev) => {
      const normalizedDrafts = normalizeTaskDraftSlots(prev);
      return activeTaskDraftIndex >= normalizedDrafts.length - 1
        ? appendTaskDraftSlot(normalizedDrafts)
        : normalizedDrafts;
    });
    setActiveTaskDraftIndex((prev) => prev + 1);
  }, [activeTaskDraftIndex]);

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

  const {
    gptState,
    setGptState,
    gptStateRef,
    handleGptMemory,
    resetGptForCurrentKin,
    reapplyCurrentMemoryWithApprovedRules,
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
    onAddPendingMemoryRuleCandidates: (candidates, approvedMemoryRulesOverride) => {
      setPendingMemoryRuleCandidates((prev) =>
        mergePendingMemoryRuleCandidates({
          prev,
          candidates,
          approvedMemoryRules: approvedMemoryRulesOverride ?? approvedMemoryRules,
        })
      );
    },
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
    searchHistoryLimit,
    setSearchHistoryLimit,
    searchMode,
    setSearchMode,
    searchEngines,
    setSearchEngines,
    searchLocation,
    setSearchLocation,
    sourceDisplayCount,
    setSourceDisplayCount,
    getTaskSearchContext,
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

  const ingestProtocolMessage = createProtocolEventIngestor(
    taskProtocol.ingestProtocolEvents
  );

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
    resetTaskProtocolRuntime: taskProtocol.resetRuntime,
    clearTaskScopedMemory: gptMemoryRuntime.clearTaskScopedMemory,
    deleteSearchHistoryItemBase,
    currentTaskIntentConstraints: taskProtocol.runtime.currentTaskIntent?.constraints || [],
  });

  const {
    processMultipartTaskDoneText,
    loadMultipartAssemblyToGptInput,
    downloadMultipartAssembly,
  } = useMultipartUiActions({
    multipartAssemblies,
    setMultipartAssemblies,
    currentTaskId: taskProtocol.runtime.currentTaskId || undefined,
    currentTaskTitle: taskProtocol.runtime.currentTaskTitle || undefined,
    currentKinLabel: currentKinDisplayLabel,
    getCurrentTaskCharConstraint: () => getCurrentTaskCharConstraint() as TaskCharConstraint | null,
    setKinInput,
    setGptMessages,
    setFinalizeReviewed: taskProtocol.setFinalizeReviewed,
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

  useEffect(() => {
    const completedTaskIds = allDocuments
      .filter(
        (document) =>
          document.artifactType === "task_result" && !!document.taskId
      )
      .map((document) => document.taskId as string);

    if (completedTaskIds.length === 0) return;

    const activeTaskIds = new Set(
      taskProtocol.progressViews
        .map((view) => view.taskId)
        .filter((taskId): taskId is string => !!taskId)
    );

    completedTaskIds.forEach((taskId) => {
      if (activeTaskIds.has(taskId)) {
        taskProtocol.archiveTask(taskId);
      }
    });
  }, [allDocuments, taskProtocol]);

  const handleSaveTaskSnapshot = () => {
    const nextDocument = buildStoredDocumentFromTaskDraft(currentTaskDraft);
    if (!nextDocument) return;
    recordIngestedDocument(nextDocument);
  };

  const {
    currentKinLabel,
    clearPendingKinInjection,
    runStartKinTaskFromInput,
    sendKinMessage,
    sendToKin,
    sendToGpt,
    startAskAiModeSearch,
    importYouTubeTranscript,
    sendYouTubeTranscriptToKin,
    runPrepTaskFromInput,
    runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask,
    runDeepenTaskFromLast,
    sendLastKinToGptDraft,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
    receiveLastKinResponseToGptInput,
    injectFileToKinDraft,
    prepareTaskRequestAck,
    prepareTaskSync,
    prepareTaskSuspend,
    resetProtocolDefaults,
    saveProtocolDefaults,
    approveIntentCandidate,
    updateIntentCandidate,
    rejectIntentCandidate,
    updateApprovedIntentPhrase,
    deleteApprovedIntentPhrase,
    setProtocolRulebookToKinDraft,
    sendProtocolRulebookToKin,
    handleSaveMemorySettings,
    handleResetMemorySettings,
  } = useChatPageActions({
    gptInput,
    kinInput,
    gptLoading,
    kinLoading,
    ingestLoading,
    currentKin,
    kinList,
    currentTaskDraft,
    currentTaskIntentConstraints: taskProtocol.runtime.currentTaskIntent?.constraints || [],
    approvedIntentPhrases,
    rejectedIntentCandidateSignatures,
    pendingIntentCandidates,
    protocolPrompt,
    protocolRulebook,
    responseMode,
    chatBridgeSettings,
    autoCopyFileIngestSysInfoToKin:
      autoBridgeSettings.autoCopyFileIngestSysInfoToKin,
    gptMessages,
    kinMessages,
      gptMemoryRuntime,
      lastSearchContext,
      searchMode,
      searchEngines,
      searchLocation,
      pendingKinInjectionBlocks,
    pendingKinInjectionIndex,
    isMobile,
    setActiveTab,
    taskProtocol,
    setKinInput,
    setGptInput,
    setKinMessages,
    setGptMessages,
    setKinLoading,
    setGptLoading,
    setIngestLoading,
    setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex,
    setCurrentTaskDraft,
    setUploadKind,
    setPendingIntentCandidates,
    setApprovedIntentPhrases,
    setRejectedIntentCandidateSignatures,
    setProtocolPrompt,
    setProtocolRulebook,
    setKinConnectionState,
    processMultipartTaskDoneText,
    recordSearchContext,
    getContinuationTokenForSeries,
    getAskAiModeLinkForQuery,
    applySearchUsage,
    applyChatUsage,
    applySummaryUsage,
    applyTaskUsage,
    applyIngestUsage,
    buildLibraryReferenceContext,
    referenceLibraryItems: libraryItems,
    libraryIndexResponseCount,
    recordIngestedDocument,
    getTaskLibraryItem,
    getTaskBaseText,
    getResolvedTaskTitle,
    resolveTaskTitleFromDraft,
    getTaskSlotLabel,
    syncTaskDraftFromProtocol,
    applyPrefixedTaskFieldsFromText,
    getCurrentTaskCharConstraint,
    resetCurrentTaskDraft,
    gptMemorySettingsControls: buildChatPageGptMemorySettingsControls({
      updateMemorySettings,
      resetMemorySettings,
    }),
    deleteSearchHistoryItemBase,
    ingestProtocolMessage,
    clearSearchHistory,
    promptDefaultKey: PROTOCOL_PROMPT_DEFAULT_KEY,
    rulebookDefaultKey: PROTOCOL_RULEBOOK_DEFAULT_KEY,
  });

  useProtocolAutomationEffects({
    autoBridgeSettings,
    kinInput,
    gptInput,
    kinLoading,
    gptLoading,
    kinMessages,
    gptMessages,
    sendToKin,
    sendToGpt,
    setGptInput,
    setKinInput,
    isMobile,
    setActiveTab,
  });

  const {
    handleConnectKin,
    handleSwitchKin,
    handleDisconnectKin,
    handleRemoveKin,
    resetKinMessages,
    handleResetGpt,
  } = usePanelResetActions({
    setKinMessages,
    setGptMessages,
    resetTokenStats,
    clearPendingKinInjection,
    resetCurrentTaskDraft,
    isMobile,
    setActiveTab,
    connectKin,
    switchKin,
    disconnectKin,
    removeKinState,
    removeKin,
    resetGptForCurrentKin,
  });



  const kinPanel = (
    <KinPanel
      {...buildKinPanelProps({
        kinIdInput,
        setKinIdInput,
        kinNameInput,
        setKinNameInput,
        connectKin: handleConnectKin,
        disconnectKin: handleDisconnectKin,
        kinStatus,
        currentKin,
        currentKinLabel,
        kinList,
        switchKin: handleSwitchKin,
        removeKin: handleRemoveKin,
        renameKin,
        kinMessages,
        kinInput,
        setKinInput,
        sendToKin,
        sendLastKinToGptDraft: sendLastKinToGptDraft,
        resetKinMessages,
        pendingInjection: {
          blocks: pendingKinInjectionBlocks,
          index: pendingKinInjectionIndex,
        },
        kinBottomRef,
        isMobile,
        onSwitchPanel: () => setActiveTab("gpt"),
        loading: kinLoading,
      })}
    />
  );

  const gptPanel = (
    <GptPanel
        {...buildGptPanelProps({
          currentKin,
          currentKinLabel,
          kinStatus,
          gptState,
          gptMessages,
        gptInput,
        setGptInput,
        sendToGpt,
        runPrepTaskFromInput,
        runDeepenTaskFromLast,
        runUpdateTaskFromInput,
        runUpdateTaskFromLastGptMessage,
        runAttachSearchResultToTask,
        sendLatestGptContentToKin,
        sendCurrentTaskContentToKin,
        receiveLastKinResponseToGptInput,
        resetGptForCurrentKin: handleResetGpt,
        sendLastGptToKinDraft,
        injectFileToKinDraft,
        canInjectFile: !gptLoading && !ingestLoading,
        loading: gptLoading,
        ingestLoading,
        gptBottomRef,
        memorySettings,
        defaultMemorySettings,
        onSaveMemorySettings: handleSaveMemorySettings,
        onResetMemorySettings: handleResetMemorySettings,
        tokenStats,
        responseMode,
        onChangeResponseMode: setResponseMode,
        uploadKind,
        ingestMode,
        imageDetail,
        compactCharLimit,
        simpleImageCharLimit,
        postIngestAction,
        fileReadPolicy,
        onChangeUploadKind: setUploadKind,
        onChangeIngestMode: setIngestMode,
        onChangeImageDetail: setImageDetail,
        onChangeCompactCharLimit: setCompactCharLimit,
        onChangeSimpleImageCharLimit: setSimpleImageCharLimit,
        onChangePostIngestAction: setPostIngestAction,
        onChangeFileReadPolicy: setFileReadPolicy,
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
        memoryInterpreterSettings,
        pendingMemoryRuleCandidates,
        approvedMemoryRules,
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
        onApproveMemoryRuleCandidate: approveMemoryRuleCandidate,
        onRejectMemoryRuleCandidate: rejectMemoryRuleCandidate,
        onUpdateMemoryRuleCandidate: updateMemoryRuleCandidate,
        onDeleteApprovedMemoryRule: deleteApprovedMemoryRule,
        onDeleteSearchHistoryItem: deleteSearchHistoryItem,
        pendingIntentCandidates,
        approvedIntentPhrases,
        multipartAssemblies,
        storedDocuments: allDocuments,
        referenceLibraryItems: libraryItems,
        selectedTaskLibraryItemId,
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
        onStartAskAiModeSearch: startAskAiModeSearch,
        onImportYouTubeTranscript: importYouTubeTranscript,
        onSendYouTubeTranscriptToKin: sendYouTubeTranscriptToKin,
        onSaveStoredDocument: updateStoredDocument,
        onUpdateIntentCandidate: updateIntentCandidate,
        onApproveIntentCandidate: approveIntentCandidate,
        onRejectIntentCandidate: rejectIntentCandidate,
        onUpdateApprovedIntentPhrase: updateApprovedIntentPhrase,
        onDeleteApprovedIntentPhrase: deleteApprovedIntentPhrase,
        lastSearchContext,
        searchHistory,
        selectedTaskSearchResultId,
        onSelectTaskSearchResult: setSelectedTaskSearchResultId,
        onMoveSearchHistoryItem: moveSearchHistoryItem,
        pendingInjection: {
          blocks: pendingKinInjectionBlocks,
          index: pendingKinInjectionIndex,
        },
        onSwitchPanel: () => setActiveTab("kin"),
        isMobile,
        taskProgressView: taskProtocol.progressView,
        taskProgressCount: taskProtocol.progressViews.length,
        activeTaskProgressIndex: taskProtocol.activeProgressIndex,
        pendingRequests: taskProtocol.runtime.pendingRequests,
        buildTaskRequestAnswerDraft,
        onPrepareTaskRequestAck: prepareTaskRequestAck,
        onPrepareTaskSync: prepareTaskSync,
        onPrepareTaskSuspend: prepareTaskSuspend,
        onUpdateTaskProgressCounts: taskProtocol.updateRequirementProgressCounts,
        onSelectPreviousTaskProgress: taskProtocol.selectPreviousProgressView,
        onSelectNextTaskProgress: taskProtocol.selectNextProgressView,
        onStartKinTask: runStartKinTaskFromInput,
        onResetTaskContext: resetCurrentTaskDraft,
        onSaveTaskSnapshot: handleSaveTaskSnapshot,
        taskDraftCount: taskDrafts.length,
        activeTaskDraftIndex,
        onSelectPreviousTaskDraft: selectPreviousTaskDraft,
        onSelectNextTaskDraft: selectNextTaskDraft,
        currentTaskDraft,
        updateTaskDraftFields,
        protocolPrompt,
        protocolRulebook,
        onChangeProtocolPrompt: setProtocolPrompt,
        onChangeProtocolRulebook: setProtocolRulebook,
        onResetProtocolDefaults: resetProtocolDefaults,
        onSaveProtocolDefaults: saveProtocolDefaults,
        onSetProtocolRulebookToKinDraft: setProtocolRulebookToKinDraft,
        onSendProtocolRulebookToKin: sendProtocolRulebookToKin,
      })}
    />
  );

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
