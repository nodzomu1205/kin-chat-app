import type React from "react";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchContext, SearchEngine, SearchMode, TaskDraft } from "@/types/task";
import type {
  GptInstructionMode,
  PostIngestAction,
  ResponseMode,
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

type TaskProtocolController = ReturnType<typeof useKinTaskProtocol>;

export type MemoryUpdateOptions = {
  topicSeed?: string;
  lastUserIntent?: string;
  activeDocument?: Record<string, unknown> | null;
  previousCommittedTopic?: string;
};

export type UseChatPageActionsArgs = {
  gptInput: string;
  kinInput: string;
  gptLoading: boolean;
  kinLoading: boolean;
  ingestLoading: boolean;
  currentKin: string | null;
  kinList: Array<{ id: string; label: string }>;
  currentTaskDraft: TaskDraft;
  currentTaskIntentConstraints: string[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
  rejectedIntentCandidateSignatures: string[];
  pendingIntentCandidates: PendingIntentCandidate[];
  protocolPrompt: string;
  protocolRulebook: string;
  responseMode: ResponseMode;
  chatBridgeSettings: ChatBridgeSettings;
  autoCopyFileIngestSysInfoToKin: boolean;
  gptMessages: Message[];
  kinMessages: Message[];
  gptState: any;
  gptStateRef: React.MutableRefObject<any>;
  lastSearchContext: SearchContext | null;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  pendingKinInjectionBlocks: string[];
  pendingKinInjectionIndex: number;
  isMobile: boolean;
  setActiveTab: React.Dispatch<React.SetStateAction<"kin" | "gpt">>;
  taskProtocol: TaskProtocolController;
  setKinInput: React.Dispatch<React.SetStateAction<string>>;
  setGptInput: React.Dispatch<React.SetStateAction<string>>;
  setKinMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setKinLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setGptLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIngestLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingKinInjectionBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  setPendingKinInjectionIndex: React.Dispatch<React.SetStateAction<number>>;
  setCurrentTaskDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
  setGptState: React.Dispatch<React.SetStateAction<any>>;
  persistCurrentGptState: (state: any) => void;
  setUploadKind: React.Dispatch<React.SetStateAction<any>>;
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
  setKinConnectionState: React.Dispatch<
    React.SetStateAction<"idle" | "connected" | "error">
  >;
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
  applySearchUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyChatUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applySummaryUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyTaskUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyIngestUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  getProvisionalMemory: (
    inputText: string,
    options?: {
      currentTaskTitle?: string;
      activeDocumentTitle?: string;
      lastSearchQuery?: string;
    }
  ) => any;
  handleGptMemory: (
    recent: Message[],
    options?: MemoryUpdateOptions
  ) => Promise<{ summaryUsage: Parameters<typeof normalizeUsage>[0] | null }>;
  chatRecentLimit: number;
  buildLibraryReferenceContext: () => string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  recordIngestedDocument: (document: Omit<StoredDocument, "id" | "sourceType">) => StoredDocument;
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
  applyPrefixedTaskFieldsFromText: (text: string) => any;
  getCurrentTaskCharConstraint: () => TaskCharConstraint | null;
  resetCurrentTaskDraft: () => void;
  updateMemorySettings: (next: any) => void;
  resetMemorySettings: () => void;
  deleteSearchHistoryItemBase: (rawResultId: string) => void;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  clearSearchHistory: () => void;
  promptDefaultKey: string;
  rulebookDefaultKey: string;
};

export function useChatPageActions(args: UseChatPageActionsArgs) {
  const currentKinProfile =
    args.kinList.find((kin) => kin.id === args.currentKin) ?? null;
  const currentKinLabel = currentKinProfile?.label ?? null;
  const {
    sendToGpt,
    continueQueuedYouTubeTranscriptBatch,
    startAskAiModeSearch,
    importYouTubeTranscript,
    sendYouTubeTranscriptToKin,
    sendLastKinToGptDraft,
    receiveLastKinResponseToGptInput,
  } = useGptMessageActions(args);

  const {
    clearPendingKinInjection,
    runStartKinTaskFromInput,
    sendKinMessage,
    sendToKin,
    sendLastGptToKinDraft,
    sendLatestGptContentToKin,
    sendCurrentTaskContentToKin,
  } = useKinTransferActions(args, {
    onPendingKinAck: continueQueuedYouTubeTranscriptBatch,
  });

  const {
    runPrepTaskFromInput,
    runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask,
    runDeepenTaskFromLast,
  } = useTaskDraftActions(args);

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
  } = useTaskProtocolActions(args, { sendKinMessage });

  const { injectFileToKinDraft } = useFileIngestActions(args);

  const handleSaveMemorySettings = (next: any) => {
    args.updateMemorySettings(next);
  };

  const handleResetMemorySettings = () => {
    args.resetMemorySettings();
  };

  return {
    currentKinProfile,
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
  };
}
