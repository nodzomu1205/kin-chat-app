import type { UseChatPageActionsArgs } from "@/hooks/chatPageActionTypes";
import type { UseChatPageControllerArgs } from "@/hooks/useChatPageController";
import type { useTaskProtocolProjection } from "@/hooks/useTaskProtocolProjection";
import type {
  GptMemoryRuntime,
  GptMemorySettingsControls,
} from "@/lib/app/chatPageGptMemoryControls";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
import type { SearchContext, SearchEngine, TaskDraft } from "@/types/task";

export type TaskProtocolView = ReturnType<typeof useTaskProtocolProjection>;

export type ChatPageControllerCompositionArgs = {
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
    setRejectedIntentCandidateSignatures:
      UseChatPageActionsArgs["setRejectedIntentCandidateSignatures"];
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
    setUploadKind: UseChatPageActionsArgs["setUploadKind"];
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
