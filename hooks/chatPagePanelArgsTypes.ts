import type { KinPanelProps } from "@/components/panels/kin/kinPanelTypes";
import type React from "react";
import type { TaskProtocolView } from "@/hooks/chatPageControllerCompositionTypes";
import type { ChatPageControllerGroups } from "@/hooks/useChatPageController";
import type { BuildGptPanelArgs } from "@/lib/app/ui-state/panelPropsBuilders";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memory-domain/memoryInterpreterRules";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/task/taskIntent";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchContext, TaskDraft } from "@/types/task";
import type {
  RegisteredTask,
  TaskRegistrationLibrarySettings,
  TaskRegistrationRecurrence,
} from "@/lib/app/task-registration/taskRegistration";

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
  onSwitchToGptPanel: () => void;
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
  onSwitchToKinPanel: () => void;
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
    taskRegistrationDraft: TaskDraft;
    taskDraftCount: number;
    activeTaskDraftIndex: number;
    registeredTasks: RegisteredTask[];
    editingRegisteredTaskId: string | null;
    taskRegistrationLibrarySettings: TaskRegistrationLibrarySettings;
    taskRegistrationRecurrence: TaskRegistrationRecurrence;
    resetCurrentTaskDraft: () => void;
    updateTaskDraftFields: BuildGptPanelArgs["task"]["updateTaskDraftFields"];
    registerCurrentTaskDraft: BuildGptPanelArgs["task"]["onRegisterCurrentTaskDraft"];
    saveCurrentTaskDraftToRegisteredTask:
      BuildGptPanelArgs["task"]["onSaveCurrentTaskDraftToRegisteredTask"];
    editRegisteredTask: BuildGptPanelArgs["task"]["onEditRegisteredTask"];
    deleteRegisteredTask: BuildGptPanelArgs["task"]["onDeleteRegisteredTask"];
    cancelTaskRegistrationEdit:
      BuildGptPanelArgs["task"]["onCancelTaskRegistrationEdit"];
    setTaskRegistrationLibrarySettings: React.Dispatch<
      React.SetStateAction<TaskRegistrationLibrarySettings>
    >;
    setTaskRegistrationRecurrence: React.Dispatch<
      React.SetStateAction<TaskRegistrationRecurrence>
    >;
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
      onShowLibraryItemInChat:
        BuildGptPanelArgs["references"]["onShowLibraryItemInChat"];
      onSendLibraryItemToKin:
        BuildGptPanelArgs["references"]["onSendLibraryItemToKin"];
      onShowAllLibraryItemsInChat:
        BuildGptPanelArgs["references"]["onShowAllLibraryItemsInChat"];
      onSendAllLibraryItemsToKin:
        BuildGptPanelArgs["references"]["onSendAllLibraryItemsToKin"];
      onUploadLibraryItemToGoogleDrive:
        BuildGptPanelArgs["references"]["onUploadLibraryItemToGoogleDrive"];
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
