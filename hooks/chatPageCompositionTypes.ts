"use client";

import type { KinPanelProps } from "@/components/panels/kin/kinPanelTypes";
import type { UseChatPageActionsArgs } from "@/hooks/chatPageActionTypes";
import type {
  ChatPageControllerGroups,
  UseChatPageControllerArgs,
} from "@/hooks/useChatPageController";
import type { useTaskProtocolProjection } from "@/hooks/useTaskProtocolProjection";
import type { BuildGptPanelArgs } from "@/lib/app/panelPropsBuilders";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchContext, SearchEngine, TaskDraft } from "@/types/task";
import type {
  GptMemoryRuntime,
  GptMemorySettingsControls,
} from "@/lib/app/chatPageGptMemoryControls";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";

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

export type ChatPagePanelBaseArgs = {
  app: {
    currentKin: string | null;
    currentKinLabel: string | null;
    kinStatus: string;
    kinList: KinPanelProps["kinList"];
    isMobile: boolean;
  };
  taskProtocolView: TaskProtocolView;
  controller: ChatPageControllerGroups;
};

export type ChatPageKinPanelCompositionArgs = ChatPagePanelBaseArgs & {
  activeTabSetter: () => void;
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
};

export type ChatPageGptPanelCompositionArgs = ChatPagePanelBaseArgs & {
  activeTabSetter: () => void;
  pendingInjection: {
    blocks: string[];
    index: number;
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
};
