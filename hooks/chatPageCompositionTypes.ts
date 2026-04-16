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
import type { AutoBridgeSettings } from "@/hooks/useAutoBridgeSettings";

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

export type ChatPagePanelsCompositionArgs = {
  controller: ChatPageControllerCompositionArgs;
  kinPanel: Omit<ChatPageKinPanelCompositionArgs, "controller">;
  gptPanel: Omit<ChatPageGptPanelCompositionArgs, "controller">;
};

export type ChatPagePanelsViewArgs = {
  controller: ChatPageControllerCompositionArgs;
  panelApp: ChatPagePanelBaseArgs["app"];
  taskProtocolView: TaskProtocolView;
  kinPanel: Omit<
    ChatPageKinPanelCompositionArgs,
    "app" | "taskProtocolView" | "controller"
  >;
  gptPanel: Omit<
    ChatPageGptPanelCompositionArgs,
    "app" | "taskProtocolView" | "controller" | "task"
  > & {
    task: Omit<ChatPageGptPanelCompositionArgs["task"], "onSaveTaskSnapshot">;
  };
  taskSnapshot: {
    currentTaskDraft: TaskDraft;
    recordIngestedDocument: UseChatPageActionsArgs["recordIngestedDocument"];
  };
};

export type ChatPageWorkspaceViewArgs = {
  app: ChatPagePanelBaseArgs["app"] &
    Pick<ChatPageControllerCompositionArgs["app"], "setActiveTab" | "setKinConnectionState">;
  ui: ChatPageControllerCompositionArgs["uiState"] & {
    kinBottomRef: ChatPageKinPanelCompositionArgs["kinState"]["kinBottomRef"];
    gptBottomRef: ChatPageGptPanelCompositionArgs["gptState"]["gptBottomRef"];
  };
  task: ChatPageControllerCompositionArgs["task"] & {
    taskDraftCount: ChatPageGptPanelCompositionArgs["task"]["taskDraftCount"];
    activeTaskDraftIndex: ChatPageGptPanelCompositionArgs["task"]["activeTaskDraftIndex"];
    updateTaskDraftFields: ChatPageGptPanelCompositionArgs["task"]["updateTaskDraftFields"];
    buildTaskRequestAnswerDraft: ChatPageGptPanelCompositionArgs["task"]["buildTaskRequestAnswerDraft"];
    onSelectPreviousTaskDraft?: ChatPageGptPanelCompositionArgs["task"]["onSelectPreviousTaskDraft"];
    onSelectNextTaskDraft?: ChatPageGptPanelCompositionArgs["task"]["onSelectNextTaskDraft"];
  };
  protocol: ChatPageControllerCompositionArgs["protocol"] &
    ChatPageGptPanelCompositionArgs["protocolState"];
  search: ChatPageControllerCompositionArgs["search"] & {
    searchHistory: ChatPageGptPanelCompositionArgs["references"]["searchHistory"];
    selectedTaskSearchResultId:
      ChatPageGptPanelCompositionArgs["references"]["selectedTaskSearchResultId"];
    onMoveSearchHistoryItem:
      ChatPageGptPanelCompositionArgs["references"]["onMoveSearchHistoryItem"];
    onSelectTaskSearchResult:
      ChatPageGptPanelCompositionArgs["references"]["onSelectTaskSearchResult"];
    onDeleteSearchHistoryItem:
      ChatPageGptPanelCompositionArgs["references"]["onDeleteSearchHistoryItem"];
    sourceDisplayCount: ChatPageGptPanelCompositionArgs["settings"]["sourceDisplayCount"];
    onChangeSearchMode:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeSearchMode"];
    onChangeSearchEngines:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeSearchEngines"];
    onChangeSearchLocation:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeSearchLocation"];
    onChangeSourceDisplayCount:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeSourceDisplayCount"];
  };
  references: {
    multipartAssemblies: ChatPageGptPanelCompositionArgs["references"]["multipartAssemblies"];
    storedDocuments: ChatPageGptPanelCompositionArgs["references"]["storedDocuments"];
    referenceLibraryItems:
      ChatPageGptPanelCompositionArgs["references"]["referenceLibraryItems"];
    selectedTaskLibraryItemId:
      ChatPageGptPanelCompositionArgs["references"]["selectedTaskLibraryItemId"];
    onDeleteMultipartAssembly:
      ChatPageGptPanelCompositionArgs["references"]["onDeleteMultipartAssembly"];
    onLoadMultipartAssemblyToGptInput:
      ChatPageGptPanelCompositionArgs["references"]["onLoadMultipartAssemblyToGptInput"];
    onDownloadMultipartAssembly:
      ChatPageGptPanelCompositionArgs["references"]["onDownloadMultipartAssembly"];
    onLoadStoredDocumentToGptInput:
      ChatPageGptPanelCompositionArgs["references"]["onLoadStoredDocumentToGptInput"];
    onDownloadStoredDocument:
      ChatPageGptPanelCompositionArgs["references"]["onDownloadStoredDocument"];
    onDeleteStoredDocument:
      ChatPageGptPanelCompositionArgs["references"]["onDeleteStoredDocument"];
    onMoveStoredDocument:
      ChatPageGptPanelCompositionArgs["references"]["onMoveStoredDocument"];
    onMoveLibraryItem:
      ChatPageGptPanelCompositionArgs["references"]["onMoveLibraryItem"];
    onSelectTaskLibraryItem:
      ChatPageGptPanelCompositionArgs["references"]["onSelectTaskLibraryItem"];
    onChangeLibraryItemMode:
      ChatPageGptPanelCompositionArgs["references"]["onChangeLibraryItemMode"];
    onSaveStoredDocument:
      ChatPageGptPanelCompositionArgs["references"]["onSaveStoredDocument"];
    buildLibraryReferenceContext:
      ChatPageControllerCompositionArgs["services"]["buildLibraryReferenceContext"];
    autoLibraryReferenceEnabled:
      ChatPageGptPanelCompositionArgs["settings"]["autoLibraryReferenceEnabled"];
    onChangeAutoLibraryReferenceEnabled:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoLibraryReferenceEnabled"];
    libraryReferenceMode:
      ChatPageGptPanelCompositionArgs["settings"]["libraryReferenceMode"];
    onChangeLibraryReferenceMode:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeLibraryReferenceMode"];
    libraryIndexResponseCount:
      ChatPageGptPanelCompositionArgs["settings"]["libraryIndexResponseCount"];
    onChangeLibraryIndexResponseCount:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeLibraryIndexResponseCount"];
    libraryReferenceCount:
      ChatPageGptPanelCompositionArgs["settings"]["libraryReferenceCount"];
    onChangeLibraryReferenceCount:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeLibraryReferenceCount"];
    libraryStorageMB: ChatPageGptPanelCompositionArgs["settings"]["libraryStorageMB"];
    libraryReferenceEstimatedTokens:
      ChatPageGptPanelCompositionArgs["settings"]["libraryReferenceEstimatedTokens"];
  };
  gpt: {
    gptState: ChatPageGptPanelCompositionArgs["gptState"]["gptState"];
    resetGptForCurrentKin:
      ChatPageControllerCompositionArgs["reset"]["resetGptForCurrentKin"];
    gptMemoryRuntime: ChatPageControllerCompositionArgs["services"]["gptMemoryRuntime"];
    responseMode: ChatPageControllerCompositionArgs["services"]["responseMode"];
    onChangeResponseMode:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeResponseMode"];
    uploadKind: ChatPageGptPanelCompositionArgs["settings"]["uploadKind"];
    onChangeUploadKind:
      ChatPageControllerCompositionArgs["services"]["setUploadKind"];
    ingestMode: ChatPageGptPanelCompositionArgs["settings"]["ingestMode"];
    onChangeIngestMode:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeIngestMode"];
    imageDetail: ChatPageGptPanelCompositionArgs["settings"]["imageDetail"];
    onChangeImageDetail:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeImageDetail"];
    compactCharLimit:
      ChatPageGptPanelCompositionArgs["settings"]["compactCharLimit"];
    onChangeCompactCharLimit:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeCompactCharLimit"];
    simpleImageCharLimit:
      ChatPageGptPanelCompositionArgs["settings"]["simpleImageCharLimit"];
    onChangeSimpleImageCharLimit:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeSimpleImageCharLimit"];
    postIngestAction:
      ChatPageGptPanelCompositionArgs["settings"]["postIngestAction"];
    onChangePostIngestAction:
      ChatPageGptPanelCompositionArgs["settings"]["onChangePostIngestAction"];
    fileReadPolicy: ChatPageGptPanelCompositionArgs["settings"]["fileReadPolicy"];
    onChangeFileReadPolicy:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeFileReadPolicy"];
    defaultMemorySettings:
      ChatPageGptPanelCompositionArgs["settings"]["defaultMemorySettings"];
    gptMemorySettingsControls:
      ChatPageControllerCompositionArgs["services"]["gptMemorySettingsControls"];
  };
  bridge: {
    autoBridgeSettings: AutoBridgeSettings;
    onChangeAutoSendKinSysInput:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoSendKinSysInput"];
    onChangeAutoCopyKinSysResponseToGpt:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoCopyKinSysResponseToGpt"];
    onChangeAutoSendGptSysInput:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoSendGptSysInput"];
    onChangeAutoCopyGptSysResponseToKin:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoCopyGptSysResponseToKin"];
    onChangeAutoCopyFileIngestSysInfoToKin:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoCopyFileIngestSysInfoToKin"];
  };
  memory: {
    tokenStats: ChatPageGptPanelCompositionArgs["settings"]["tokenStats"];
    memorySettings: ChatPageGptPanelCompositionArgs["settings"]["memorySettings"];
    memoryInterpreterSettings: ChatPageGptPanelCompositionArgs["memoryState"]["memoryInterpreterSettings"];
    pendingMemoryRuleCandidates:
      ChatPageGptPanelCompositionArgs["memoryState"]["pendingMemoryRuleCandidates"];
    approvedMemoryRules:
      ChatPageGptPanelCompositionArgs["memoryState"]["approvedMemoryRules"];
    onChangeMemoryInterpreterSettings:
      ChatPageGptPanelCompositionArgs["settings"]["onChangeMemoryInterpreterSettings"];
    onApproveMemoryRuleCandidate:
      ChatPageGptPanelCompositionArgs["memoryState"]["onApproveMemoryRuleCandidate"];
    onRejectMemoryRuleCandidate:
      ChatPageGptPanelCompositionArgs["memoryState"]["onRejectMemoryRuleCandidate"];
    onUpdateMemoryRuleCandidate:
      ChatPageGptPanelCompositionArgs["memoryState"]["onUpdateMemoryRuleCandidate"];
    onDeleteApprovedMemoryRule:
      ChatPageGptPanelCompositionArgs["memoryState"]["onDeleteApprovedMemoryRule"];
  };
  usage: Pick<
    ChatPageControllerCompositionArgs["services"],
    | "applySearchUsage"
    | "applyChatUsage"
    | "applySummaryUsage"
    | "applyTaskUsage"
    | "applyIngestUsage"
    | "recordIngestedDocument"
  >;
  kin: {
    kinIdInput: ChatPageKinPanelCompositionArgs["kinState"]["kinIdInput"];
    setKinIdInput: ChatPageKinPanelCompositionArgs["kinState"]["setKinIdInput"];
    kinNameInput: ChatPageKinPanelCompositionArgs["kinState"]["kinNameInput"];
    setKinNameInput: ChatPageKinPanelCompositionArgs["kinState"]["setKinNameInput"];
    renameKin: ChatPageKinPanelCompositionArgs["kinState"]["renameKin"];
  };
  reset: Pick<
    ChatPageControllerCompositionArgs["reset"],
    | "resetTokenStats"
    | "connectKin"
    | "switchKin"
    | "disconnectKin"
    | "removeKinState"
    | "removeKin"
  >;
};
