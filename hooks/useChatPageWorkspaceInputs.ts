import {
  buildChatPageWorkspaceActions,
  buildChatPageWorkspaceServices,
  buildChatPageWorkspaceState,
} from "@/hooks/chatPageWorkspaceInputBuilders";
import type {
  ChatPageWorkspaceActionsApp,
  ChatPageWorkspaceActionsBridge,
  ChatPageWorkspaceActionsGpt,
  ChatPageWorkspaceActionsKin,
  ChatPageWorkspaceActionsMemory,
  ChatPageWorkspaceActionsProtocol,
  ChatPageWorkspaceActionsReferences,
  ChatPageWorkspaceActionsReset,
  ChatPageWorkspaceActionsSearch,
  ChatPageWorkspaceActionsTask,
  ChatPageWorkspaceActionsUi,
  ChatPageWorkspaceServicesGpt,
  ChatPageWorkspaceServicesProtocol,
  ChatPageWorkspaceServicesReferences,
  ChatPageWorkspaceServicesSearch,
  ChatPageWorkspaceServicesTask,
  ChatPageWorkspaceServicesUsage,
  ChatPageWorkspaceStateApp,
  ChatPageWorkspaceStateBridge,
  ChatPageWorkspaceStateGpt,
  ChatPageWorkspaceStateKin,
  ChatPageWorkspaceStateMemory,
  ChatPageWorkspaceStateProtocol,
  ChatPageWorkspaceStateReferences,
  ChatPageWorkspaceStateSearch,
  ChatPageWorkspaceStateTask,
  ChatPageWorkspaceStateUi,
} from "@/hooks/chatPageWorkspaceCompositionTypes";
import { buildTaskRequestAnswerDraft } from "@/lib/app/chatPageHelpers";
import {
  PROTOCOL_PROMPT_DEFAULT_KEY,
  PROTOCOL_RULEBOOK_DEFAULT_KEY,
} from "@/lib/app/chatPageStorageKeys";

type WorkspaceAppInput = ChatPageWorkspaceStateApp & ChatPageWorkspaceActionsApp;
type WorkspaceUiInput = ChatPageWorkspaceStateUi & ChatPageWorkspaceActionsUi;
type WorkspaceTaskDraftInput =
  ChatPageWorkspaceStateTask &
    Omit<ChatPageWorkspaceActionsTask, "buildTaskRequestAnswerDraft">;
type WorkspaceTaskInput = Omit<
  ChatPageWorkspaceServicesTask,
  "getTaskLibraryItem"
>;
type WorkspaceProtocolInput =
  ChatPageWorkspaceStateProtocol &
    Pick<
      ChatPageWorkspaceActionsProtocol,
      | "setPendingIntentCandidates"
      | "setApprovedIntentPhrases"
      | "setRejectedIntentCandidateSignatures"
      | "setProtocolPrompt"
      | "setProtocolRulebook"
    > &
    Pick<ChatPageWorkspaceServicesProtocol, "chatBridgeSettings">;
type WorkspaceSearchInput =
  ChatPageWorkspaceStateSearch &
    ChatPageWorkspaceActionsSearch &
    ChatPageWorkspaceServicesSearch;
type WorkspaceReferencesInput =
  ChatPageWorkspaceStateReferences &
    ChatPageWorkspaceActionsReferences &
    ChatPageWorkspaceServicesReferences & {
      getTaskLibraryItem: ChatPageWorkspaceServicesTask["getTaskLibraryItem"];
    };
type WorkspaceGptInput =
  ChatPageWorkspaceStateGpt &
    ChatPageWorkspaceActionsGpt &
    ChatPageWorkspaceServicesGpt;
type WorkspaceBridgeInput = ChatPageWorkspaceStateBridge & {
  updateAutoBridgeSettings: (
    patch: Partial<ChatPageWorkspaceStateBridge["autoBridgeSettings"]>
  ) => void;
};
type WorkspaceMemoryInput =
  ChatPageWorkspaceStateMemory & ChatPageWorkspaceActionsMemory;
type WorkspaceUsageInput = ChatPageWorkspaceServicesUsage;
type WorkspaceKinInput =
  ChatPageWorkspaceStateKin &
    ChatPageWorkspaceActionsKin &
    Pick<
      ChatPageWorkspaceActionsReset,
      "connectKin" | "switchKin" | "disconnectKin" | "removeKinState" | "removeKin"
    >;

type UseChatPageWorkspaceInputsArgs = {
  app: WorkspaceAppInput;
  ui: WorkspaceUiInput;
  taskDraft: WorkspaceTaskDraftInput;
  task: WorkspaceTaskInput;
  protocol: WorkspaceProtocolInput;
  search: WorkspaceSearchInput;
  references: WorkspaceReferencesInput;
  gpt: WorkspaceGptInput;
  bridge: WorkspaceBridgeInput;
  memory: WorkspaceMemoryInput;
  usage: WorkspaceUsageInput;
  kin: WorkspaceKinInput;
  resetTokenStats: ChatPageWorkspaceActionsReset["resetTokenStats"];
};

export function useChatPageWorkspaceInputs(args: UseChatPageWorkspaceInputsArgs) {
  const workspaceState = buildChatPageWorkspaceState({
    app: args.app,
    ui: args.ui,
    task: args.taskDraft,
    protocol: {
      approvedIntentPhrases: args.protocol.approvedIntentPhrases,
      rejectedIntentCandidateSignatures:
        args.protocol.rejectedIntentCandidateSignatures,
      pendingIntentCandidates: args.protocol.pendingIntentCandidates,
      protocolPrompt: args.protocol.protocolPrompt,
      protocolRulebook: args.protocol.protocolRulebook,
    },
    search: {
      lastSearchContext: args.search.lastSearchContext,
      searchHistory: args.search.searchHistory,
      selectedTaskSearchResultId: args.search.selectedTaskSearchResultId,
      searchMode: args.search.searchMode,
      searchEngines: args.search.searchEngines,
      searchLocation: args.search.searchLocation,
      sourceDisplayCount: args.search.sourceDisplayCount,
    },
    references: {
      multipartAssemblies: args.references.multipartAssemblies,
      storedDocuments: args.references.storedDocuments,
      referenceLibraryItems: args.references.referenceLibraryItems,
      selectedTaskLibraryItemId: args.references.selectedTaskLibraryItemId,
      autoLibraryReferenceEnabled: args.references.autoLibraryReferenceEnabled,
      libraryReferenceMode: args.references.libraryReferenceMode,
      libraryIndexResponseCount: args.references.libraryIndexResponseCount,
      libraryReferenceCount: args.references.libraryReferenceCount,
      libraryStorageMB: args.references.libraryStorageMB,
      libraryReferenceEstimatedTokens:
        args.references.libraryReferenceEstimatedTokens,
      googleDriveFolderLink: args.references.googleDriveFolderLink,
      googleDriveFolderId: args.references.googleDriveFolderId,
      googleDriveIntegrationMode: args.references.googleDriveIntegrationMode,
    },
    gpt: {
      gptState: args.gpt.gptState,
      uploadKind: args.gpt.uploadKind,
      ingestMode: args.gpt.ingestMode,
      imageDetail: args.gpt.imageDetail,
      compactCharLimit: args.gpt.compactCharLimit,
      simpleImageCharLimit: args.gpt.simpleImageCharLimit,
      fileReadPolicy: args.gpt.fileReadPolicy,
      driveImportAutoSummary: args.gpt.driveImportAutoSummary,
      defaultMemorySettings: args.gpt.defaultMemorySettings,
    },
    bridge: {
      autoBridgeSettings: args.bridge.autoBridgeSettings,
    },
    memory: args.memory,
    kin: {
      kinIdInput: args.kin.kinIdInput,
      kinNameInput: args.kin.kinNameInput,
    },
  });

  const workspaceActions = buildChatPageWorkspaceActions({
    app: args.app,
    ui: args.ui,
    task: {
      ...args.taskDraft,
      buildTaskRequestAnswerDraft,
    },
    protocol: {
      setPendingIntentCandidates: args.protocol.setPendingIntentCandidates,
      setApprovedIntentPhrases: args.protocol.setApprovedIntentPhrases,
      setRejectedIntentCandidateSignatures:
        args.protocol.setRejectedIntentCandidateSignatures,
      setProtocolPrompt: args.protocol.setProtocolPrompt,
      setProtocolRulebook: args.protocol.setProtocolRulebook,
      onChangeProtocolPrompt: args.protocol.setProtocolPrompt,
      onChangeProtocolRulebook: args.protocol.setProtocolRulebook,
    },
    search: args.search,
    references: args.references,
    gpt: args.gpt,
    bridge: {
      onChangeAutoSendKinSysInput:
        ((value: boolean) =>
          args.bridge.updateAutoBridgeSettings({
            autoSendKinSysInput: value,
          })) as ChatPageWorkspaceActionsBridge["onChangeAutoSendKinSysInput"],
      onChangeAutoCopyKinSysResponseToGpt:
        ((value: boolean) =>
          args.bridge.updateAutoBridgeSettings({
            autoCopyKinSysResponseToGpt: value,
          })) as ChatPageWorkspaceActionsBridge["onChangeAutoCopyKinSysResponseToGpt"],
      onChangeAutoSendGptSysInput:
        ((value: boolean) =>
          args.bridge.updateAutoBridgeSettings({
            autoSendGptSysInput: value,
          })) as ChatPageWorkspaceActionsBridge["onChangeAutoSendGptSysInput"],
      onChangeAutoCopyGptSysResponseToKin:
        ((value: boolean) =>
          args.bridge.updateAutoBridgeSettings({
            autoCopyGptSysResponseToKin: value,
          })) as ChatPageWorkspaceActionsBridge["onChangeAutoCopyGptSysResponseToKin"],
      onChangeAutoCopyFileIngestSysInfoToKin:
        ((value: boolean) =>
          args.bridge.updateAutoBridgeSettings({
            autoCopyFileIngestSysInfoToKin: value,
          })) as ChatPageWorkspaceActionsBridge["onChangeAutoCopyFileIngestSysInfoToKin"],
    },
    memory: args.memory,
    kin: args.kin,
    reset: {
      resetTokenStats: args.resetTokenStats,
      connectKin: args.kin.connectKin,
      switchKin: args.kin.switchKin,
      disconnectKin: args.kin.disconnectKin,
      removeKinState: args.kin.removeKinState,
      removeKin: args.kin.removeKin,
    },
  });

  const workspaceServices = buildChatPageWorkspaceServices({
    task: {
      ...args.task,
      getTaskLibraryItem: args.references.getTaskLibraryItem,
    },
    protocol: {
      chatBridgeSettings: args.protocol.chatBridgeSettings,
      promptDefaultKey: PROTOCOL_PROMPT_DEFAULT_KEY,
      rulebookDefaultKey: PROTOCOL_RULEBOOK_DEFAULT_KEY,
    },
    search: args.search,
    references: args.references,
    gpt: args.gpt,
    usage: args.usage,
  });

  return {
    workspaceState,
    workspaceActions,
    workspaceServices,
  };
}
