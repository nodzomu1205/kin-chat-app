import type { KinPanelProps } from "@/components/panels/kin/kinPanelTypes";
import type { GptPanelProps } from "@/components/panels/gpt/gptPanelTypes";
import type { TaskDraft } from "@/types/task";

type PendingInjectionState = {
  blocks: string[];
  index: number;
};

type UpdateTaskDraftFields = (patch: Partial<TaskDraft>) => void;

type BuildKinPanelArgs = Omit<
  KinPanelProps,
  "pendingInjectionCurrentPart" | "pendingInjectionTotalParts"
> & {
  pendingInjection: PendingInjectionState;
};

type BuildGptPanelArgs = Omit<
  GptPanelProps,
  | "onAnswerTaskRequest"
  | "pendingInjectionCurrentPart"
  | "pendingInjectionTotalParts"
  | "onChangeTaskTitle"
  | "onChangeTaskUserInstruction"
  | "onChangeTaskBody"
> & {
  pendingInjection: PendingInjectionState;
  updateTaskDraftFields: UpdateTaskDraftFields;
  pendingRequests: Array<{ id: string; actionId: string; body: string }>;
  buildTaskRequestAnswerDraft: (
    requestId: string,
    requestBody?: string | null
  ) => string;
  setGptInput: (value: string) => void;
};

export function resolvePendingInjectionProgress({
  blocks,
  index,
}: PendingInjectionState) {
  return {
    currentPart: blocks.length > 0 ? index + 1 : 0,
    totalParts: blocks.length,
  };
}

export function clampPanelCount(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value) || min));
}

export function buildKinPanelProps(args: BuildKinPanelArgs): KinPanelProps {
  const { pendingInjection: pendingInjectionState, ...panelArgs } = args;
  const pendingInjection = resolvePendingInjectionProgress(pendingInjectionState);

  return {
    ...panelArgs,
    pendingInjectionCurrentPart: pendingInjection.currentPart,
    pendingInjectionTotalParts: pendingInjection.totalParts,
  };
}

export function buildGptPanelProps(args: BuildGptPanelArgs): GptPanelProps {
  const {
    pendingInjection: pendingInjectionState,
    updateTaskDraftFields,
    pendingRequests,
    buildTaskRequestAnswerDraft,
    ...panelArgs
  } = args;
  const pendingInjection = resolvePendingInjectionProgress(pendingInjectionState);
  const onChangeTaskTitle = (value: string) =>
    updateTaskDraftFields({
      title: value,
      taskName: value.trim() || panelArgs.currentTaskDraft.taskName,
    });
  const onChangeTaskUserInstruction = (value: string) =>
    updateTaskDraftFields({
      userInstruction: value,
    });
  const onChangeTaskBody = (value: string) =>
    updateTaskDraftFields({
      body: value,
      mergedText: value,
    });
  const onAnswerTaskRequest = (requestId: string) => {
    const request =
      pendingRequests.find(
        (item) => item.id === requestId || item.actionId === requestId
      ) || null;
    panelArgs.setGptInput(buildTaskRequestAnswerDraft(requestId, request?.body));
  };
  const onChangeSourceDisplayCount = (value: number) =>
    panelArgs.onChangeSourceDisplayCount(clampPanelCount(value, 1, 20));
  const onChangeLibraryIndexResponseCount = (value: number) =>
    panelArgs.onChangeLibraryIndexResponseCount(clampPanelCount(value, 1, 50));
  const onChangeLibraryReferenceCount = (value: number) =>
    panelArgs.onChangeLibraryReferenceCount(clampPanelCount(value, 0, 20));

  return {
    ...panelArgs,
    pendingInjectionCurrentPart: pendingInjection.currentPart,
    pendingInjectionTotalParts: pendingInjection.totalParts,
    onChangeTaskTitle,
    onChangeTaskUserInstruction,
    onChangeTaskBody,
    onChangeSourceDisplayCount,
    onChangeLibraryIndexResponseCount,
    onChangeLibraryReferenceCount,
    header: {
      currentKin: panelArgs.currentKin,
      currentKinLabel: panelArgs.currentKinLabel,
      kinStatus: panelArgs.kinStatus,
      isMobile: panelArgs.isMobile,
      onSwitchPanel: panelArgs.onSwitchPanel,
    },
    chat: {
      gptState: panelArgs.gptState,
      gptMessages: panelArgs.gptMessages,
      gptInput: panelArgs.gptInput,
      setGptInput: panelArgs.setGptInput,
      sendToGpt: panelArgs.sendToGpt,
      resetGptForCurrentKin: panelArgs.resetGptForCurrentKin,
      loading: panelArgs.loading,
      gptBottomRef: panelArgs.gptBottomRef,
    },
    task: {
      currentTaskDraft: panelArgs.currentTaskDraft,
      taskDraftCount: panelArgs.taskDraftCount,
      activeTaskDraftIndex: panelArgs.activeTaskDraftIndex,
      taskProgressView: panelArgs.taskProgressView,
      taskProgressCount: panelArgs.taskProgressCount,
      activeTaskProgressIndex: panelArgs.activeTaskProgressIndex,
      pendingInjectionCurrentPart: pendingInjection.currentPart,
      pendingInjectionTotalParts: pendingInjection.totalParts,
      runPrepTaskFromInput: panelArgs.runPrepTaskFromInput,
      runDeepenTaskFromLast: panelArgs.runDeepenTaskFromLast,
      runUpdateTaskFromInput: panelArgs.runUpdateTaskFromInput,
      runUpdateTaskFromLastGptMessage: panelArgs.runUpdateTaskFromLastGptMessage,
      runAttachSearchResultToTask: panelArgs.runAttachSearchResultToTask,
      sendLatestGptContentToKin: panelArgs.sendLatestGptContentToKin,
      sendCurrentTaskContentToKin: panelArgs.sendCurrentTaskContentToKin,
      receiveLastKinResponseToGptInput: panelArgs.receiveLastKinResponseToGptInput,
      sendLastGptToKinDraft: panelArgs.sendLastGptToKinDraft,
      onChangeTaskTitle,
      onChangeTaskUserInstruction,
      onChangeTaskBody,
      onSaveTaskSnapshot: panelArgs.onSaveTaskSnapshot,
      onSelectPreviousTaskDraft: panelArgs.onSelectPreviousTaskDraft,
      onSelectNextTaskDraft: panelArgs.onSelectNextTaskDraft,
      onAnswerTaskRequest,
      onPrepareTaskRequestAck: panelArgs.onPrepareTaskRequestAck,
      onPrepareTaskSync: panelArgs.onPrepareTaskSync,
      onPrepareTaskSuspend: panelArgs.onPrepareTaskSuspend,
      onUpdateTaskProgressCounts: panelArgs.onUpdateTaskProgressCounts,
      onSelectPreviousTaskProgress: panelArgs.onSelectPreviousTaskProgress,
      onSelectNextTaskProgress: panelArgs.onSelectNextTaskProgress,
      onStartKinTask: panelArgs.onStartKinTask,
      onResetTaskContext: panelArgs.onResetTaskContext,
    },
    protocol: {
      protocolPrompt: panelArgs.protocolPrompt,
      protocolRulebook: panelArgs.protocolRulebook,
      pendingIntentCandidates: panelArgs.pendingIntentCandidates,
      approvedIntentPhrases: panelArgs.approvedIntentPhrases,
      onChangeProtocolPrompt: panelArgs.onChangeProtocolPrompt,
      onChangeProtocolRulebook: panelArgs.onChangeProtocolRulebook,
      onResetProtocolDefaults: panelArgs.onResetProtocolDefaults,
      onSaveProtocolDefaults: panelArgs.onSaveProtocolDefaults,
      onSetProtocolRulebookToKinDraft: panelArgs.onSetProtocolRulebookToKinDraft,
      onSendProtocolRulebookToKin: panelArgs.onSendProtocolRulebookToKin,
      onUpdateIntentCandidate: panelArgs.onUpdateIntentCandidate,
      onApproveIntentCandidate: panelArgs.onApproveIntentCandidate,
      onRejectIntentCandidate: panelArgs.onRejectIntentCandidate,
      onUpdateApprovedIntentPhrase: panelArgs.onUpdateApprovedIntentPhrase,
      onDeleteApprovedIntentPhrase: panelArgs.onDeleteApprovedIntentPhrase,
    },
    references: {
      lastSearchContext: panelArgs.lastSearchContext,
      searchHistory: panelArgs.searchHistory,
      selectedTaskSearchResultId: panelArgs.selectedTaskSearchResultId,
      multipartAssemblies: panelArgs.multipartAssemblies,
      storedDocuments: panelArgs.storedDocuments,
      referenceLibraryItems: panelArgs.referenceLibraryItems,
      selectedTaskLibraryItemId: panelArgs.selectedTaskLibraryItemId,
      onSelectTaskSearchResult: panelArgs.onSelectTaskSearchResult,
      onMoveSearchHistoryItem: panelArgs.onMoveSearchHistoryItem,
      onDeleteSearchHistoryItem: panelArgs.onDeleteSearchHistoryItem,
      onLoadMultipartAssemblyToGptInput: panelArgs.onLoadMultipartAssemblyToGptInput,
      onDownloadMultipartAssembly: panelArgs.onDownloadMultipartAssembly,
      onDeleteMultipartAssembly: panelArgs.onDeleteMultipartAssembly,
      onLoadStoredDocumentToGptInput: panelArgs.onLoadStoredDocumentToGptInput,
      onDownloadStoredDocument: panelArgs.onDownloadStoredDocument,
      onDeleteStoredDocument: panelArgs.onDeleteStoredDocument,
      onMoveStoredDocument: panelArgs.onMoveStoredDocument,
      onMoveLibraryItem: panelArgs.onMoveLibraryItem,
      onSelectTaskLibraryItem: panelArgs.onSelectTaskLibraryItem,
      onChangeLibraryItemMode: panelArgs.onChangeLibraryItemMode,
      onStartAskAiModeSearch: panelArgs.onStartAskAiModeSearch,
      onImportYouTubeTranscript: panelArgs.onImportYouTubeTranscript,
      onSendYouTubeTranscriptToKin: panelArgs.onSendYouTubeTranscriptToKin,
      onSaveStoredDocument: panelArgs.onSaveStoredDocument,
    },
    settings: {
      memorySettings: panelArgs.memorySettings,
      defaultMemorySettings: panelArgs.defaultMemorySettings,
      tokenStats: panelArgs.tokenStats,
      responseMode: panelArgs.responseMode,
      uploadKind: panelArgs.uploadKind,
      ingestMode: panelArgs.ingestMode,
      imageDetail: panelArgs.imageDetail,
      postIngestAction: panelArgs.postIngestAction,
      fileReadPolicy: panelArgs.fileReadPolicy,
      compactCharLimit: panelArgs.compactCharLimit,
      simpleImageCharLimit: panelArgs.simpleImageCharLimit,
      ingestLoading: panelArgs.ingestLoading,
      canInjectFile: panelArgs.canInjectFile,
      searchMode: panelArgs.searchMode,
      searchEngines: panelArgs.searchEngines,
      searchLocation: panelArgs.searchLocation,
      sourceDisplayCount: panelArgs.sourceDisplayCount,
      autoLibraryReferenceEnabled: panelArgs.autoLibraryReferenceEnabled,
      libraryReferenceMode: panelArgs.libraryReferenceMode,
      libraryIndexResponseCount: panelArgs.libraryIndexResponseCount,
      libraryReferenceCount: panelArgs.libraryReferenceCount,
      libraryStorageMB: panelArgs.libraryStorageMB,
      libraryReferenceEstimatedTokens: panelArgs.libraryReferenceEstimatedTokens,
      autoSendKinSysInput: panelArgs.autoSendKinSysInput,
      autoCopyKinSysResponseToGpt: panelArgs.autoCopyKinSysResponseToGpt,
      autoSendGptSysInput: panelArgs.autoSendGptSysInput,
      autoCopyGptSysResponseToKin: panelArgs.autoCopyGptSysResponseToKin,
      autoCopyFileIngestSysInfoToKin: panelArgs.autoCopyFileIngestSysInfoToKin,
      memoryInterpreterSettings: panelArgs.memoryInterpreterSettings,
      pendingMemoryRuleCandidates: panelArgs.pendingMemoryRuleCandidates,
      approvedMemoryRules: panelArgs.approvedMemoryRules,
      onSaveMemorySettings: panelArgs.onSaveMemorySettings,
      onResetMemorySettings: panelArgs.onResetMemorySettings,
      onChangeResponseMode: panelArgs.onChangeResponseMode,
      onChangeUploadKind: panelArgs.onChangeUploadKind,
      onChangeIngestMode: panelArgs.onChangeIngestMode,
      onChangeImageDetail: panelArgs.onChangeImageDetail,
      onChangeCompactCharLimit: panelArgs.onChangeCompactCharLimit,
      onChangeSimpleImageCharLimit: panelArgs.onChangeSimpleImageCharLimit,
      onChangePostIngestAction: panelArgs.onChangePostIngestAction,
      onChangeFileReadPolicy: panelArgs.onChangeFileReadPolicy,
      onChangeSearchMode: panelArgs.onChangeSearchMode,
      onChangeSearchEngines: panelArgs.onChangeSearchEngines,
      onChangeSearchLocation: panelArgs.onChangeSearchLocation,
      onChangeSourceDisplayCount,
      onChangeAutoLibraryReferenceEnabled: panelArgs.onChangeAutoLibraryReferenceEnabled,
      onChangeLibraryReferenceMode: panelArgs.onChangeLibraryReferenceMode,
      onChangeLibraryIndexResponseCount,
      onChangeLibraryReferenceCount,
      onChangeAutoSendKinSysInput: panelArgs.onChangeAutoSendKinSysInput,
      onChangeAutoCopyKinSysResponseToGpt: panelArgs.onChangeAutoCopyKinSysResponseToGpt,
      onChangeAutoSendGptSysInput: panelArgs.onChangeAutoSendGptSysInput,
      onChangeAutoCopyGptSysResponseToKin: panelArgs.onChangeAutoCopyGptSysResponseToKin,
      onChangeAutoCopyFileIngestSysInfoToKin:
        panelArgs.onChangeAutoCopyFileIngestSysInfoToKin,
      onChangeMemoryInterpreterSettings: panelArgs.onChangeMemoryInterpreterSettings,
      onApproveMemoryRuleCandidate: panelArgs.onApproveMemoryRuleCandidate,
      onRejectMemoryRuleCandidate: panelArgs.onRejectMemoryRuleCandidate,
      onDeleteApprovedMemoryRule: panelArgs.onDeleteApprovedMemoryRule,
    },
    onAnswerTaskRequest,
  };
}
