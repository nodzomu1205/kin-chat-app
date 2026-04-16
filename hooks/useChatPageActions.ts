import type React from "react";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchContext, SearchEngine, SearchMode, TaskDraft } from "@/types/task";
import type {
  ResponseMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { ApprovedIntentPhrase, PendingIntentCandidate } from "@/lib/taskIntent";
import type { TaskCharConstraint } from "@/lib/app/multipartAssemblyFlow";
import { normalizeUsage } from "@/lib/tokenStats";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import type { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";
import { useTaskDraftActions } from "@/hooks/useTaskDraftActions";
import { useKinTransferActions } from "@/hooks/useKinTransferActions";
import { useGptMessageActions } from "@/hooks/useGptMessageActions";
import { useTaskProtocolActions } from "@/hooks/useTaskProtocolActions";
import { useFileIngestActions } from "@/hooks/useFileIngestActions";
import type {
  GptMemoryRuntime,
  GptMemorySettingsControls,
} from "@/lib/app/chatPageGptMemoryControls";
import type { MemoryTopicAdjudication } from "@/lib/app/memoryTopicAdjudication";
import type { ParsedTaskInput } from "@/lib/taskInputParser";
import type { MemorySettings } from "@/lib/memory";

type TaskProtocolController = ReturnType<typeof useKinTaskProtocol>;

export type MemoryUpdateOptions = {
  topicAdjudication?: MemoryTopicAdjudication;
  currentTaskTitleOverride?: string;
  lastUserIntent?: string;
  activeDocument?: Record<string, unknown> | null;
  previousCommittedTopic?: string;
};

export type ChatPageIdentityArgs = {
  currentKin: string | null;
  kinList: Array<{ id: string; label: string }>;
  isMobile: boolean;
  setActiveTab: React.Dispatch<React.SetStateAction<"kin" | "gpt">>;
  setKinConnectionState: React.Dispatch<
    React.SetStateAction<"idle" | "connected" | "error">
  >;
};

export type ChatPageUiStateArgs = {
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

export type ChatPageTaskArgs = {
  currentTaskDraft: TaskDraft;
  currentTaskIntentConstraints: string[];
  setCurrentTaskDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
  getTaskBaseText: () => string;
  getTaskLibraryItem: () => ReferenceLibraryItem | null;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
  resolveTaskTitleFromDraft: (
    draft: TaskDraft,
    params: {
      explicitTitle?: string;
      freeText?: string;
      searchQuery?: string;
      fallback?: string;
    }
  ) => string;
  getTaskSlotLabel: () => string;
  syncTaskDraftFromProtocol: (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
  }) => void;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedTaskInput;
  getCurrentTaskCharConstraint: () => TaskCharConstraint | null;
  resetCurrentTaskDraft: () => void;
};

export type ChatPageProtocolArgs = {
  approvedIntentPhrases: ApprovedIntentPhrase[];
  rejectedIntentCandidateSignatures: string[];
  pendingIntentCandidates: PendingIntentCandidate[];
  protocolPrompt: string;
  protocolRulebook: string;
  chatBridgeSettings: ChatBridgeSettings;
  taskProtocol: TaskProtocolController;
  setPendingIntentCandidates: React.Dispatch<
    React.SetStateAction<PendingIntentCandidate[]>
  >;
  setApprovedIntentPhrases: React.Dispatch<
    React.SetStateAction<ApprovedIntentPhrase[]>
  >;
  setRejectedIntentCandidateSignatures: React.Dispatch<
    React.SetStateAction<string[]>
  >;
  setProtocolPrompt: React.Dispatch<React.SetStateAction<string>>;
  setProtocolRulebook: React.Dispatch<React.SetStateAction<string>>;
  promptDefaultKey: string;
  rulebookDefaultKey: string;
};

export type ChatPageSearchArgs = {
  lastSearchContext: SearchContext | null;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  recordSearchContext: (ctx: {
    mode?: SearchMode;
    engines?: SearchEngine[];
    location?: string;
    seriesId?: string;
    continuationToken?: string;
    metadata?: Record<string, unknown>;
    taskId?: string;
    actionId?: string;
    query: string;
    goal?: string;
    outputMode?: "summary" | "raw_and_summary";
    summaryText?: string;
    rawText: string;
    sources: { title: string; link: string }[];
  }) => SearchContext;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
  clearSearchHistory: () => void;
  deleteSearchHistoryItemBase: (rawResultId: string) => void;
};

export type ChatPageServicesArgs = {
  responseMode: ResponseMode;
  autoCopyFileIngestSysInfoToKin: boolean;
  gptMemoryRuntime: GptMemoryRuntime;
  setUploadKind: React.Dispatch<React.SetStateAction<UploadKind>>;
  applySearchUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyChatUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applySummaryUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyTaskUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyIngestUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  buildLibraryReferenceContext: () => string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  recordIngestedDocument: (document: Omit<StoredDocument, "id" | "sourceType">) => StoredDocument;
  gptMemorySettingsControls: GptMemorySettingsControls;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
};

export type UseChatPageActionsArgs = ChatPageIdentityArgs &
  ChatPageUiStateArgs &
  ChatPageTaskArgs &
  ChatPageProtocolArgs &
  ChatPageSearchArgs &
  ChatPageServicesArgs;

export type UseGptMessageActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyChatUsage"
  | "applyPrefixedTaskFieldsFromText"
  | "applySearchUsage"
  | "applySummaryUsage"
  | "buildLibraryReferenceContext"
  | "chatBridgeSettings"
  | "currentTaskDraft"
  | "getAskAiModeLinkForQuery"
  | "getContinuationTokenForSeries"
  | "gptInput"
  | "gptLoading"
  | "gptMemoryRuntime"
  | "ingestProtocolMessage"
  | "isMobile"
  | "kinMessages"
  | "lastSearchContext"
  | "libraryIndexResponseCount"
  | "processMultipartTaskDoneText"
  | "recordIngestedDocument"
  | "recordSearchContext"
  | "referenceLibraryItems"
  | "responseMode"
  | "searchEngines"
  | "searchLocation"
  | "searchMode"
  | "setActiveTab"
  | "setGptInput"
  | "setGptLoading"
  | "setGptMessages"
  | "setKinInput"
  | "setPendingKinInjectionBlocks"
  | "setPendingKinInjectionIndex"
  | "taskProtocol"
>;

export type UseKinTransferActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyTaskUsage"
  | "approvedIntentPhrases"
  | "currentKin"
  | "currentTaskDraft"
  | "getTaskBaseText"
  | "getTaskSlotLabel"
  | "gptInput"
  | "gptMessages"
  | "ingestProtocolMessage"
  | "isMobile"
  | "kinInput"
  | "kinLoading"
  | "pendingIntentCandidates"
  | "pendingKinInjectionBlocks"
  | "pendingKinInjectionIndex"
  | "processMultipartTaskDoneText"
  | "rejectedIntentCandidateSignatures"
  | "responseMode"
  | "setActiveTab"
  | "setGptInput"
  | "setGptLoading"
  | "setGptMessages"
  | "setKinConnectionState"
  | "setKinInput"
  | "setKinLoading"
  | "setKinMessages"
  | "setPendingIntentCandidates"
  | "setPendingKinInjectionBlocks"
  | "setPendingKinInjectionIndex"
  | "syncTaskDraftFromProtocol"
  | "taskProtocol"
>;

export type UseTaskDraftActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyPrefixedTaskFieldsFromText"
  | "applySummaryUsage"
  | "applyTaskUsage"
  | "currentTaskDraft"
  | "getResolvedTaskTitle"
  | "getTaskBaseText"
  | "getTaskLibraryItem"
  | "gptInput"
  | "gptLoading"
  | "gptMemoryRuntime"
  | "gptMessages"
  | "lastSearchContext"
  | "setCurrentTaskDraft"
  | "setGptInput"
  | "setGptLoading"
  | "setGptMessages"
>;

export type UseTaskProtocolActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyTaskUsage"
  | "approvedIntentPhrases"
  | "currentTaskDraft"
  | "isMobile"
  | "pendingIntentCandidates"
  | "promptDefaultKey"
  | "protocolPrompt"
  | "protocolRulebook"
  | "responseMode"
  | "rulebookDefaultKey"
  | "setActiveTab"
  | "setApprovedIntentPhrases"
  | "setGptMessages"
  | "setKinInput"
  | "setPendingIntentCandidates"
  | "setPendingKinInjectionBlocks"
  | "setPendingKinInjectionIndex"
  | "setProtocolPrompt"
  | "setProtocolRulebook"
  | "setRejectedIntentCandidateSignatures"
  | "syncTaskDraftFromProtocol"
  | "taskProtocol"
>;

export type UseFileIngestActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyIngestUsage"
  | "applyTaskUsage"
  | "autoCopyFileIngestSysInfoToKin"
  | "currentTaskDraft"
  | "getResolvedTaskTitle"
  | "getTaskBaseText"
  | "gptInput"
  | "gptMemoryRuntime"
  | "ingestLoading"
  | "isMobile"
  | "recordIngestedDocument"
  | "resolveTaskTitleFromDraft"
  | "responseMode"
  | "setActiveTab"
  | "setCurrentTaskDraft"
  | "setGptInput"
  | "setGptMessages"
  | "setIngestLoading"
  | "setKinInput"
  | "setPendingKinInjectionBlocks"
  | "setPendingKinInjectionIndex"
  | "setUploadKind"
>;

export function useChatPageActions(args: UseChatPageActionsArgs) {
  const gptMessageActionArgs: UseGptMessageActionsArgs = {
    applyChatUsage: args.applyChatUsage,
    applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
    applySearchUsage: args.applySearchUsage,
    applySummaryUsage: args.applySummaryUsage,
    buildLibraryReferenceContext: args.buildLibraryReferenceContext,
    chatBridgeSettings: args.chatBridgeSettings,
    currentTaskDraft: args.currentTaskDraft,
    getAskAiModeLinkForQuery: args.getAskAiModeLinkForQuery,
    getContinuationTokenForSeries: args.getContinuationTokenForSeries,
    gptInput: args.gptInput,
    gptLoading: args.gptLoading,
    gptMemoryRuntime: args.gptMemoryRuntime,
    ingestProtocolMessage: args.ingestProtocolMessage,
    isMobile: args.isMobile,
    kinMessages: args.kinMessages,
    lastSearchContext: args.lastSearchContext,
    libraryIndexResponseCount: args.libraryIndexResponseCount,
    processMultipartTaskDoneText: args.processMultipartTaskDoneText,
    recordIngestedDocument: args.recordIngestedDocument,
    recordSearchContext: args.recordSearchContext,
    referenceLibraryItems: args.referenceLibraryItems,
    responseMode: args.responseMode,
    searchEngines: args.searchEngines,
    searchLocation: args.searchLocation,
    searchMode: args.searchMode,
    setActiveTab: args.setActiveTab,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    setGptMessages: args.setGptMessages,
    setKinInput: args.setKinInput,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    taskProtocol: args.taskProtocol,
  };
  const {
    sendToGpt,
    continueQueuedYouTubeTranscriptBatch,
    startAskAiModeSearch,
    importYouTubeTranscript,
    sendYouTubeTranscriptToKin,
    sendLastKinToGptDraft,
    receiveLastKinResponseToGptInput,
  } = useGptMessageActions(gptMessageActionArgs);

  const kinTransferActionArgs: UseKinTransferActionsArgs = {
    applyTaskUsage: args.applyTaskUsage,
    approvedIntentPhrases: args.approvedIntentPhrases,
    currentKin: args.currentKin,
    currentTaskDraft: args.currentTaskDraft,
    getTaskBaseText: args.getTaskBaseText,
    getTaskSlotLabel: args.getTaskSlotLabel,
    gptInput: args.gptInput,
    gptMessages: args.gptMessages,
    ingestProtocolMessage: args.ingestProtocolMessage,
    isMobile: args.isMobile,
    kinInput: args.kinInput,
    kinLoading: args.kinLoading,
    pendingIntentCandidates: args.pendingIntentCandidates,
    pendingKinInjectionBlocks: args.pendingKinInjectionBlocks,
    pendingKinInjectionIndex: args.pendingKinInjectionIndex,
    processMultipartTaskDoneText: args.processMultipartTaskDoneText,
    rejectedIntentCandidateSignatures: args.rejectedIntentCandidateSignatures,
    responseMode: args.responseMode,
    setActiveTab: args.setActiveTab,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    setGptMessages: args.setGptMessages,
    setKinConnectionState: args.setKinConnectionState,
    setKinInput: args.setKinInput,
    setKinLoading: args.setKinLoading,
    setKinMessages: args.setKinMessages,
    setPendingIntentCandidates: args.setPendingIntentCandidates,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
    taskProtocol: args.taskProtocol,
  };

  const {
    clearPendingKinInjection,
    runStartKinTaskFromInput,
    sendKinMessage,
    sendToKin,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
  } = useKinTransferActions(kinTransferActionArgs, {
    onPendingKinAck: continueQueuedYouTubeTranscriptBatch,
  });

  const taskDraftActionArgs: UseTaskDraftActionsArgs = {
    applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
    applySummaryUsage: args.applySummaryUsage,
    applyTaskUsage: args.applyTaskUsage,
    currentTaskDraft: args.currentTaskDraft,
    getResolvedTaskTitle: args.getResolvedTaskTitle,
    getTaskBaseText: args.getTaskBaseText,
    getTaskLibraryItem: args.getTaskLibraryItem,
    gptInput: args.gptInput,
    gptLoading: args.gptLoading,
    gptMemoryRuntime: args.gptMemoryRuntime,
    gptMessages: args.gptMessages,
    lastSearchContext: args.lastSearchContext,
    setCurrentTaskDraft: args.setCurrentTaskDraft,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    setGptMessages: args.setGptMessages,
  };

  const {
    runPrepTaskFromInput,
    runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask,
    runDeepenTaskFromLast,
  } = useTaskDraftActions(taskDraftActionArgs);

  const taskProtocolActionArgs: UseTaskProtocolActionsArgs = {
    applyTaskUsage: args.applyTaskUsage,
    approvedIntentPhrases: args.approvedIntentPhrases,
    currentTaskDraft: args.currentTaskDraft,
    isMobile: args.isMobile,
    pendingIntentCandidates: args.pendingIntentCandidates,
    promptDefaultKey: args.promptDefaultKey,
    protocolPrompt: args.protocolPrompt,
    protocolRulebook: args.protocolRulebook,
    responseMode: args.responseMode,
    rulebookDefaultKey: args.rulebookDefaultKey,
    setActiveTab: args.setActiveTab,
    setApprovedIntentPhrases: args.setApprovedIntentPhrases,
    setGptMessages: args.setGptMessages,
    setKinInput: args.setKinInput,
    setPendingIntentCandidates: args.setPendingIntentCandidates,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setProtocolPrompt: args.setProtocolPrompt,
    setProtocolRulebook: args.setProtocolRulebook,
    setRejectedIntentCandidateSignatures: args.setRejectedIntentCandidateSignatures,
    syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
    taskProtocol: args.taskProtocol,
  };

  const {
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
  } = useTaskProtocolActions(taskProtocolActionArgs, { sendKinMessage });

  const fileIngestActionArgs: UseFileIngestActionsArgs = {
    applyIngestUsage: args.applyIngestUsage,
    applyTaskUsage: args.applyTaskUsage,
    autoCopyFileIngestSysInfoToKin: args.autoCopyFileIngestSysInfoToKin,
    currentTaskDraft: args.currentTaskDraft,
    getResolvedTaskTitle: args.getResolvedTaskTitle,
    getTaskBaseText: args.getTaskBaseText,
    gptInput: args.gptInput,
    gptMemoryRuntime: args.gptMemoryRuntime,
    ingestLoading: args.ingestLoading,
    isMobile: args.isMobile,
    recordIngestedDocument: args.recordIngestedDocument,
    resolveTaskTitleFromDraft: args.resolveTaskTitleFromDraft,
    responseMode: args.responseMode,
    setActiveTab: args.setActiveTab,
    setCurrentTaskDraft: args.setCurrentTaskDraft,
    setGptInput: args.setGptInput,
    setGptMessages: args.setGptMessages,
    setIngestLoading: args.setIngestLoading,
    setKinInput: args.setKinInput,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setUploadKind: args.setUploadKind,
  };

  const { injectFileToKinDraft } = useFileIngestActions(fileIngestActionArgs);

  const handleSaveMemorySettings = (next: MemorySettings) => {
    args.gptMemorySettingsControls.updateMemorySettings(next);
  };

  const handleResetMemorySettings = () => {
    args.gptMemorySettingsControls.resetMemorySettings();
  };

  return {
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
  };
}
