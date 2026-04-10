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
import { usePanelResetActions } from "@/hooks/usePanelResetActions";
import { useProtocolIntentSettings } from "@/hooks/useProtocolIntentSettings";
import { useTaskDraftHelpers } from "@/hooks/useTaskDraftHelpers";
import { useChatPageActions } from "@/hooks/useChatPageActions";
import { createSession, getSessions } from "@/lib/storage";
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
  extractPreferredKinTransferText,
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
import {
  buildTaskChatBridgeContext,
} from "@/lib/taskChatBridge";
import { buildUserResponseBlock, extractTaskProtocolEvents } from "@/lib/taskRuntimeProtocol";
import {
  buildTaskRequestAnswerDraft,
} from "@/lib/app/chatPageHelpers";
import { buildGptPanelProps, buildKinPanelProps } from "@/lib/app/panelPropsBuilders";
import { PROTOCOL_PROMPT_DEFAULT_KEY, PROTOCOL_RULEBOOK_DEFAULT_KEY } from "@/lib/app/chatPageStorageKeys";
import { containsSysProtocolBlock } from "@/lib/app/protocolAutomation";

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
  const [currentTaskDraft, setCurrentTaskDraft] = useState<TaskDraft>(
    createEmptyTaskDraft()
  );

  const isMobile = useResponsive(MOBILE_BREAKPOINT);
  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);
  const lastAutoSentKinInputRef = useRef("");
  const lastAutoSentGptInputRef = useRef("");
  const lastAutoCopiedKinMessageIdRef = useRef("");
  const lastAutoCopiedGptMessageIdRef = useRef("");

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

  const {
    gptState,
    setGptState,
    gptStateRef,
    getProvisionalMemory,
    handleGptMemory,
    resetGptForCurrentKin,
    ensureKinState,
    removeKinState,
    chatRecentLimit,
    memorySettings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings,
  } = useGptMemory(currentKin);

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
    searchReferenceCount,
    setSearchReferenceCount,
    autoSearchReferenceEnabled,
    setAutoSearchReferenceEnabled,
    searchReferenceMode,
    setSearchReferenceMode,
    getTaskSearchContext,
    moveSearchHistoryItem,
    recordSearchContext,
    getContinuationTokenForSeries,
    getAskAiModeLinkForQuery,
    clearSearchHistory,
    deleteSearchHistoryItem: deleteSearchHistoryItemBase,
    searchHistoryStorageMB,
    buildSearchReferenceContext,
    estimateSearchReferenceTokens,
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
    autoDocumentReferenceEnabled,
    setAutoDocumentReferenceEnabled,
    documentReferenceMode,
    setDocumentReferenceMode,
    documentReferenceCount,
    setDocumentReferenceCount,
    documentStorageMB,
    recordIngestedDocument,
    updateStoredDocument,
    deleteStoredDocument,
    moveStoredDocument,
    getStoredDocument,
    buildDocumentReferenceContext,
    estimateDocumentReferenceTokens,
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

  const [chatBridgeSettings] = useState<ChatBridgeSettings>({
    injectTaskContextOnReference: true,
    alwaysShowCurrentTaskInChatContext: false,
  });

  const ingestProtocolMessage = (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => {
    const events = extractTaskProtocolEvents(text);
    if (events.length === 0) return;
    taskProtocol.ingestProtocolEvents({ text, direction, events });
  };

  useEffect(() => {
    const sessions = getSessions();

    if (sessions.length === 0) {
      const newSession = createSession();
      setCurrentSessionId(newSession.id);
      return;
    }

    setCurrentSessionId(sessions[0].id);
  }, []);

  useEffect(() => {
    if (!currentKin) return;
    ensureKinState(currentKin);
  }, [currentKin, ensureKinState]);

  useEffect(() => {
    if (isMobile) {
      setActiveTab((prev) => (prev === "gpt" ? "gpt" : "kin"));
    }
  }, [isMobile]);

  const searchReferenceEstimatedTokens = estimateSearchReferenceTokens();
  const documentReferenceEstimatedTokens = estimateDocumentReferenceTokens();
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

  const loadStoredDocumentToGptInput = (documentId: string) => {
    const document = getStoredDocument(documentId);
    if (!document) return;
    setGptInput(document.text);
    if (isMobile) setActiveTab("gpt");
  };

  const downloadStoredDocument = (documentId: string) => {
    const document = getStoredDocument(documentId);
    if (!document || typeof window === "undefined") return;
    const blob = new Blob([document.text], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${document.filename.replace(/[^\w.-]+/g, "_") || "document"}.txt`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const {
    currentKinLabel,
    clearPendingKinInjection,
    runStartKinTaskFromInput,
    sendKinMessage,
    sendToKin,
    sendToGpt,
    startAskAiModeSearch,
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
    gptMessages,
    kinMessages,
      gptState,
      gptStateRef,
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
    setGptState,
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
    getProvisionalMemory,
    handleGptMemory,
    chatRecentLimit,
    buildSearchReferenceContext,
    buildDocumentReferenceContext,
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
    updateMemorySettings,
    resetMemorySettings,
    deleteSearchHistoryItemBase,
    ingestProtocolMessage,
    clearSearchHistory,
    promptDefaultKey: PROTOCOL_PROMPT_DEFAULT_KEY,
    rulebookDefaultKey: PROTOCOL_RULEBOOK_DEFAULT_KEY,
  });

  useEffect(() => {
    const trimmed = kinInput.trim();
    if (!autoBridgeSettings.autoSendKinSysInput || !trimmed || kinLoading) return;
    if (!containsSysProtocolBlock(trimmed)) return;
    if (lastAutoSentKinInputRef.current === trimmed) return;
    lastAutoSentKinInputRef.current = trimmed;
    void sendToKin();
  }, [autoBridgeSettings.autoSendKinSysInput, kinInput, kinLoading, sendToKin]);

  useEffect(() => {
    const trimmed = gptInput.trim();
    if (!autoBridgeSettings.autoSendGptSysInput || !trimmed || gptLoading) return;
    if (!containsSysProtocolBlock(trimmed)) return;
    if (lastAutoSentGptInputRef.current === trimmed) return;
    lastAutoSentGptInputRef.current = trimmed;
    void sendToGpt();
  }, [autoBridgeSettings.autoSendGptSysInput, gptInput, gptLoading, sendToGpt]);

  useEffect(() => {
    const latestKin = [...kinMessages].reverse().find((m) => m.role === "kin");
    if (!autoBridgeSettings.autoCopyKinSysResponseToGpt || !latestKin) return;
    if (!containsSysProtocolBlock(latestKin.text)) return;
    if (lastAutoCopiedKinMessageIdRef.current === latestKin.id) return;
    lastAutoCopiedKinMessageIdRef.current = latestKin.id;
    setGptInput(extractPreferredKinTransferText(latestKin.text));
    if (isMobile) setActiveTab("gpt");
  }, [
    autoBridgeSettings.autoCopyKinSysResponseToGpt,
    isMobile,
    kinMessages,
    setActiveTab,
    setGptInput,
  ]);

  useEffect(() => {
    const latestGpt = [...gptMessages].reverse().find((m) => m.role === "gpt");
    if (!autoBridgeSettings.autoCopyGptSysResponseToKin || !latestGpt) return;
    if (!containsSysProtocolBlock(latestGpt.text)) return;
    if (lastAutoCopiedGptMessageIdRef.current === latestGpt.id) return;
    lastAutoCopiedGptMessageIdRef.current = latestGpt.id;
    setKinInput(extractPreferredKinTransferText(latestGpt.text));
    if (isMobile) setActiveTab("kin");
  }, [
    autoBridgeSettings.autoCopyGptSysResponseToKin,
    gptMessages,
    isMobile,
    setActiveTab,
    setKinInput,
  ]);

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
        pendingInjectionCurrentPart:
          pendingKinInjectionBlocks.length > 0 ? pendingKinInjectionIndex + 1 : 0,
        pendingInjectionTotalParts: pendingKinInjectionBlocks.length,
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
        autoSearchReferenceEnabled,
        searchMode,
        searchEngines,
        searchLocation,
        searchReferenceMode,
        searchReferenceCount,
        searchHistoryLimit,
        searchHistoryStorageMB,
        searchReferenceEstimatedTokens,
        autoDocumentReferenceEnabled,
        documentReferenceMode,
        documentReferenceCount,
        documentStorageMB,
        documentReferenceEstimatedTokens,
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
          onChangeAutoSearchReferenceEnabled: setAutoSearchReferenceEnabled,
        onChangeSearchMode: setSearchMode,
        onChangeSearchEngines: setSearchEngines,
        onChangeSearchLocation: setSearchLocation,
        onChangeSearchReferenceMode: setSearchReferenceMode,
        onChangeSearchReferenceCount: (value) =>
          setSearchReferenceCount(Math.max(1, Math.min(10, Number(value) || 1))),
        onChangeSearchHistoryLimit: (value) =>
          setSearchHistoryLimit(Math.max(1, Math.min(100, Number(value) || 1))),
        onClearSearchHistory: clearSearchHistory,
        onChangeAutoDocumentReferenceEnabled: setAutoDocumentReferenceEnabled,
        onChangeDocumentReferenceMode: setDocumentReferenceMode,
        onChangeDocumentReferenceCount: (value) =>
          setDocumentReferenceCount(Math.max(1, Math.min(10, Number(value) || 1))),
        onChangeAutoLibraryReferenceEnabled: setAutoLibraryReferenceEnabled,
        onChangeLibraryReferenceMode: setLibraryReferenceMode,
          onChangeLibraryIndexResponseCount: (value) =>
            setLibraryIndexResponseCount(Math.max(1, Math.min(50, Number(value) || 1))),
          onChangeLibraryReferenceCount: (value) =>
            setLibraryReferenceCount(Math.max(0, Math.min(20, Number(value) || 0))),
          onChangeAutoSendKinSysInput: (value: boolean) =>
            updateAutoBridgeSettings({ autoSendKinSysInput: value }),
          onChangeAutoCopyKinSysResponseToGpt: (value: boolean) =>
            updateAutoBridgeSettings({ autoCopyKinSysResponseToGpt: value }),
          onChangeAutoSendGptSysInput: (value: boolean) =>
            updateAutoBridgeSettings({ autoSendGptSysInput: value }),
          onChangeAutoCopyGptSysResponseToKin: (value: boolean) =>
            updateAutoBridgeSettings({ autoCopyGptSysResponseToKin: value }),
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
        pendingInjectionCurrentPart:
          pendingKinInjectionBlocks.length > 0 ? pendingKinInjectionIndex + 1 : 0,
        pendingInjectionTotalParts: pendingKinInjectionBlocks.length,
        onSwitchPanel: () => setActiveTab("kin"),
        isMobile,
        taskProgressView: taskProtocol.progressView,
        pendingRequests: taskProtocol.runtime.pendingRequests,
        buildTaskRequestAnswerDraft,
        onPrepareTaskRequestAck: prepareTaskRequestAck,
        onPrepareTaskSync: prepareTaskSync,
        onStartKinTask: runStartKinTaskFromInput,
        onResetTaskContext: resetCurrentTaskDraft,
        currentTaskDraft,
        onChangeTaskTitle: (value) =>
          updateTaskDraftFields({
            title: value,
            taskName: value.trim() || currentTaskDraft.taskName,
          }),
        onChangeTaskUserInstruction: (value) =>
          updateTaskDraftFields({
            userInstruction: value,
          }),
        onChangeTaskBody: (value) =>
          updateTaskDraftFields({
            body: value,
            mergedText: value,
          }),
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
