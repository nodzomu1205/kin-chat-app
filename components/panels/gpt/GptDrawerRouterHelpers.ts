import type { ComponentProps, Dispatch, SetStateAction } from "react";
import type GptMetaDrawer from "@/components/panels/gpt/GptMetaDrawer";
import type GptSettingsDrawer from "@/components/panels/gpt/GptSettingsDrawer";
import type GptTaskDrawer from "@/components/panels/gpt/GptTaskDrawer";
import type LibraryDrawer from "@/components/panels/gpt/LibraryDrawer";
import type { LocalMemorySettingsInput } from "@/components/panels/gpt/gptPanelHelpers";
import type {
  GptPanelChatProps,
  GptPanelHeaderProps,
  GptPanelProtocolProps,
  GptPanelReferenceProps,
  GptPanelSettingsProps,
  GptPanelTaskProps,
} from "@/components/panels/gpt/gptPanelTypes";
import type { MemorySettings } from "@/lib/memory-domain/memory";

type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type DeviceImportSettings = Pick<
  GptPanelSettingsProps,
  | "uploadKind"
  | "ingestMode"
  | "imageDetail"
  | "fileReadPolicy"
  | "compactCharLimit"
  | "simpleImageCharLimit"
>;

type MemorySettingsSaveInput = {
  localSettings: LocalMemorySettingsInput;
  memorySettings: MemorySettings;
  toPositiveInt: (value: string, fallback: number) => number;
};

type MetaDrawerRouteInput = {
  mode: "memory" | "tokens";
  header: Pick<GptPanelHeaderProps, "isMobile">;
  chat: Pick<GptPanelChatProps, "gptState">;
  settings: Pick<GptPanelSettingsProps, "memorySettings" | "tokenStats">;
  memoryUsed: number;
  memoryCapacity: number;
  recentCount: number;
  factCount: number;
  preferenceCount: number;
  listCount: number;
  rolling5Usage: TokenUsage;
  totalUsage: TokenUsage;
  showMemoryContent: boolean;
  onToggleMemoryContent: () => void;
};

type LibraryDrawerRouteInput = {
  header: Pick<GptPanelHeaderProps, "isMobile">;
  references: GptPanelReferenceProps;
  settings: Pick<
    GptPanelSettingsProps,
    | "libraryReferenceCount"
    | "sourceDisplayCount"
    | "onOpenGoogleDriveFolder"
    | "onImportGoogleDriveFile"
    | "onIndexGoogleDriveFolder"
    | "onImportGoogleDriveFolder"
    | "uploadKind"
    | "ingestLoading"
    | "canInjectFile"
  >;
  onImportDeviceFile: ComponentProps<typeof LibraryDrawer>["onImportDeviceFile"];
};

type SettingsDrawerRouteInput = {
  header: Pick<GptPanelHeaderProps, "isMobile">;
  protocol: GptPanelProtocolProps;
  settings: GptPanelSettingsProps;
  localSettings: LocalMemorySettingsInput;
  setLocalSettings: Dispatch<SetStateAction<LocalMemorySettingsInput>>;
  memoryCapacityPreview: number;
  toPositiveInt: (value: string, fallback: number) => number;
};

type GptMetaDrawerProps = ComponentProps<typeof GptMetaDrawer>;
type GptSettingsDrawerProps = ComponentProps<typeof GptSettingsDrawer>;
type GptTaskDrawerProps = ComponentProps<typeof GptTaskDrawer>;
type LibraryDrawerProps = ComponentProps<typeof LibraryDrawer>;

export function getDeviceImportAccept(
  kind: GptPanelSettingsProps["uploadKind"]
) {
  if (kind === "image" || kind === "pdf" || kind === "mixed") {
    return ".pdf,image/*";
  }
  return ".txt,.md,.json,.csv,.tsv,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.ts,.tsx,.js,.jsx,.py,.java,.go,.rs,.c,.cpp,.cs,.rb,.php,.html,.css,.xml,.yml,.yaml,.sql";
}

export function buildDeviceImportOptions(
  settings: DeviceImportSettings
): Parameters<GptPanelChatProps["onInjectFile"]>[1] {
  return {
    kind: settings.uploadKind,
    mode: settings.ingestMode,
    detail: settings.imageDetail,
    readPolicy: settings.fileReadPolicy,
    compactCharLimit: settings.compactCharLimit,
    simpleImageCharLimit: settings.simpleImageCharLimit,
  };
}

export function buildLocalSettingsResetInput(
  defaultMemorySettings: MemorySettings
): LocalMemorySettingsInput {
  return {
    maxFacts: String(defaultMemorySettings.maxFacts ?? 0),
    maxPreferences: String(defaultMemorySettings.maxPreferences ?? 0),
    chatRecentLimit: String(defaultMemorySettings.chatRecentLimit ?? 0),
    summarizeThreshold: String(defaultMemorySettings.summarizeThreshold ?? 0),
    recentKeep: String(defaultMemorySettings.recentKeep ?? 0),
  };
}

export function buildMemorySettingsSaveInput({
  localSettings,
  memorySettings,
  toPositiveInt,
}: MemorySettingsSaveInput): MemorySettings {
  return {
    maxFacts: toPositiveInt(
      localSettings.maxFacts,
      memorySettings.maxFacts ?? 0
    ),
    maxPreferences: toPositiveInt(
      localSettings.maxPreferences,
      memorySettings.maxPreferences ?? 0
    ),
    chatRecentLimit: toPositiveInt(
      localSettings.chatRecentLimit,
      memorySettings.chatRecentLimit ?? 0
    ),
    summarizeThreshold: toPositiveInt(
      localSettings.summarizeThreshold,
      memorySettings.summarizeThreshold ?? 0
    ),
    recentKeep: toPositiveInt(
      localSettings.recentKeep,
      memorySettings.recentKeep ?? 0
    ),
  };
}

export function buildGptMetaDrawerProps({
  mode,
  header,
  chat,
  settings,
  memoryUsed,
  memoryCapacity,
  recentCount,
  factCount,
  preferenceCount,
  listCount,
  rolling5Usage,
  totalUsage,
  showMemoryContent,
  onToggleMemoryContent,
}: MetaDrawerRouteInput): GptMetaDrawerProps {
  return {
    mode,
    gptState: chat.gptState,
    tokenStats: settings.tokenStats,
    recent5Chat: rolling5Usage,
    totalUsage,
    memoryUsed,
    memoryCapacity,
    recentCount,
    factCount,
    preferenceCount,
    listCount,
    chatRecentLimit: settings.memorySettings.chatRecentLimit,
    maxFacts: settings.memorySettings.maxFacts,
    maxPreferences: settings.memorySettings.maxPreferences,
    showMemoryContent,
    onToggleMemoryContent,
    isMobile: header.isMobile,
  };
}

export function buildGptTaskDrawerProps(
  task: GptPanelTaskProps,
  isMobile: boolean
): GptTaskDrawerProps {
  return {
    currentTaskDraft: task.currentTaskDraft,
    taskDraftCount: task.taskDraftCount,
    activeTaskDraftIndex: task.activeTaskDraftIndex,
    taskProgressView: task.taskProgressView,
    taskProgressCount: task.taskProgressCount,
    activeTaskProgressIndex: task.activeTaskProgressIndex,
    onChangeTaskTitle: task.onChangeTaskTitle,
    onChangeTaskUserInstruction: task.onChangeTaskUserInstruction,
    onChangeTaskBody: task.onChangeTaskBody,
    onSaveTaskSnapshot: task.onSaveTaskSnapshot,
    onSelectPreviousTaskDraft: task.onSelectPreviousTaskDraft,
    onSelectNextTaskDraft: task.onSelectNextTaskDraft,
    onResetTaskContext: task.onResetTaskContext,
    onAnswerTaskRequest: task.onAnswerTaskRequest,
    onPrepareTaskRequestAck: task.onPrepareTaskRequestAck,
    onPrepareTaskSync: task.onPrepareTaskSync,
    onPrepareTaskSuspend: task.onPrepareTaskSuspend,
    onUpdateTaskProgressCounts: task.onUpdateTaskProgressCounts,
    onClearTaskProgress: task.onClearTaskProgress,
    onSelectPreviousTaskProgress: task.onSelectPreviousTaskProgress,
    onSelectNextTaskProgress: task.onSelectNextTaskProgress,
    isMobile,
  };
}

export function buildLibraryDrawerProps({
  header,
  references,
  settings,
  onImportDeviceFile,
}: LibraryDrawerRouteInput): LibraryDrawerProps {
  return {
    multipartAssemblies: references.multipartAssemblies,
    referenceLibraryItems: references.referenceLibraryItems,
    libraryReferenceCount: settings.libraryReferenceCount,
    sourceDisplayCount: settings.sourceDisplayCount,
    selectedTaskLibraryItemId: references.selectedTaskLibraryItemId,
    onSelectTaskLibraryItem: references.onSelectTaskLibraryItem,
    onMoveLibraryItem: references.onMoveLibraryItem,
    onChangeLibraryItemMode: references.onChangeLibraryItemMode,
    onStartAskAiModeSearch: references.onStartAskAiModeSearch,
    onImportYouTubeTranscript: references.onImportYouTubeTranscript,
    onSendYouTubeTranscriptToKin: references.onSendYouTubeTranscriptToKin,
    onDownloadMultipartAssembly: references.onDownloadMultipartAssembly,
    onDeleteMultipartAssembly: references.onDeleteMultipartAssembly,
    onDownloadStoredDocument: references.onDownloadStoredDocument,
    onDeleteStoredDocument: references.onDeleteStoredDocument,
    onDeleteSearchHistoryItem: references.onDeleteSearchHistoryItem,
    onSaveStoredDocument: references.onSaveStoredDocument,
    onShowLibraryItemInChat: references.onShowLibraryItemInChat,
    onSendLibraryItemToKin: references.onSendLibraryItemToKin,
    onShowAllLibraryItemsInChat: references.onShowAllLibraryItemsInChat,
    onSendAllLibraryItemsToKin: references.onSendAllLibraryItemsToKin,
    onUploadLibraryItemToGoogleDrive: references.onUploadLibraryItemToGoogleDrive,
    onOpenGoogleDriveFolder: settings.onOpenGoogleDriveFolder,
    onImportGoogleDriveFile: settings.onImportGoogleDriveFile,
    onIndexGoogleDriveFolder: settings.onIndexGoogleDriveFolder,
    onImportGoogleDriveFolder: settings.onImportGoogleDriveFolder,
    onImportDeviceFile,
    deviceImportAccept: getDeviceImportAccept(settings.uploadKind),
    deviceImportDisabled: settings.ingestLoading || !settings.canInjectFile,
    isMobile: header.isMobile,
  };
}

export function buildGptSettingsDrawerProps({
  header,
  protocol,
  settings,
  localSettings,
  setLocalSettings,
  memoryCapacityPreview,
  toPositiveInt,
}: SettingsDrawerRouteInput): GptSettingsDrawerProps {
  return {
    localSettings,
    onFieldChange: (key, value) =>
      setLocalSettings((prev) => ({
        ...prev,
        [key]: value,
      })),
    onReset: () => {
      settings.onResetMemorySettings();
      setLocalSettings(
        buildLocalSettingsResetInput(settings.defaultMemorySettings)
      );
    },
    onSave: () => {
      settings.onSaveMemorySettings(
        buildMemorySettingsSaveInput({
          localSettings,
          memorySettings: settings.memorySettings,
          toPositiveInt,
        })
      );
    },
    memoryCapacityPreview,
    ingestMode: settings.ingestMode,
    onChangeIngestMode: settings.onChangeIngestMode,
    imageDetail: settings.imageDetail,
    onChangeImageDetail: settings.onChangeImageDetail,
    compactCharLimit: settings.compactCharLimit,
    simpleImageCharLimit: settings.simpleImageCharLimit,
    onChangeCompactCharLimit: settings.onChangeCompactCharLimit,
    onChangeSimpleImageCharLimit: settings.onChangeSimpleImageCharLimit,
    fileReadPolicy: settings.fileReadPolicy,
    onChangeFileReadPolicy: settings.onChangeFileReadPolicy,
    searchMode: settings.searchMode,
    searchEngines: settings.searchEngines,
    searchLocation: settings.searchLocation,
    sourceDisplayCount: settings.sourceDisplayCount,
    autoLibraryReferenceEnabled: settings.autoLibraryReferenceEnabled,
    libraryReferenceMode: settings.libraryReferenceMode,
    libraryIndexResponseCount: settings.libraryIndexResponseCount,
    libraryReferenceCount: settings.libraryReferenceCount,
    libraryStorageMB: settings.libraryStorageMB,
    libraryReferenceEstimatedTokens: settings.libraryReferenceEstimatedTokens,
    autoSendKinSysInput: settings.autoSendKinSysInput,
    autoCopyKinSysResponseToGpt: settings.autoCopyKinSysResponseToGpt,
    autoSendGptSysInput: settings.autoSendGptSysInput,
    autoCopyGptSysResponseToKin: settings.autoCopyGptSysResponseToKin,
    autoCopyFileIngestSysInfoToKin: settings.autoCopyFileIngestSysInfoToKin,
    memoryInterpreterSettings: settings.memoryInterpreterSettings,
    pendingMemoryRuleCandidates: settings.pendingMemoryRuleCandidates,
    approvedMemoryRules: settings.approvedMemoryRules,
    onChangeSearchMode: settings.onChangeSearchMode,
    onChangeSearchEngines: settings.onChangeSearchEngines,
    onChangeSearchLocation: settings.onChangeSearchLocation,
    onChangeSourceDisplayCount: settings.onChangeSourceDisplayCount,
    onChangeAutoLibraryReferenceEnabled:
      settings.onChangeAutoLibraryReferenceEnabled,
    onChangeLibraryReferenceMode: settings.onChangeLibraryReferenceMode,
    onChangeLibraryIndexResponseCount:
      settings.onChangeLibraryIndexResponseCount,
    onChangeLibraryReferenceCount: settings.onChangeLibraryReferenceCount,
    onChangeAutoSendKinSysInput: settings.onChangeAutoSendKinSysInput,
    onChangeAutoCopyKinSysResponseToGpt:
      settings.onChangeAutoCopyKinSysResponseToGpt,
    onChangeAutoSendGptSysInput: settings.onChangeAutoSendGptSysInput,
    onChangeAutoCopyGptSysResponseToKin:
      settings.onChangeAutoCopyGptSysResponseToKin,
    onChangeAutoCopyFileIngestSysInfoToKin:
      settings.onChangeAutoCopyFileIngestSysInfoToKin,
    onChangeMemoryInterpreterSettings:
      settings.onChangeMemoryInterpreterSettings,
    onUpdateMemoryRuleCandidate: settings.onUpdateMemoryRuleCandidate,
    onApproveMemoryRuleCandidate: settings.onApproveMemoryRuleCandidate,
    onRejectMemoryRuleCandidate: settings.onRejectMemoryRuleCandidate,
    onDeleteApprovedMemoryRule: settings.onDeleteApprovedMemoryRule,
    protocolPrompt: protocol.protocolPrompt,
    protocolRulebook: protocol.protocolRulebook,
    onChangeProtocolPrompt: protocol.onChangeProtocolPrompt,
    onChangeProtocolRulebook: protocol.onChangeProtocolRulebook,
    onResetProtocolDefaults: protocol.onResetProtocolDefaults,
    onSaveProtocolDefaults: protocol.onSaveProtocolDefaults,
    onSetProtocolRulebookToKinDraft: protocol.onSetProtocolRulebookToKinDraft,
    onSendProtocolRulebookToKin: protocol.onSendProtocolRulebookToKin,
    pendingIntentCandidates: protocol.pendingIntentCandidates,
    approvedIntentPhrases: protocol.approvedIntentPhrases,
    onUpdateIntentCandidate: protocol.onUpdateIntentCandidate,
    onApproveIntentCandidate: protocol.onApproveIntentCandidate,
    onRejectIntentCandidate: protocol.onRejectIntentCandidate,
    onUpdateApprovedIntentPhrase: protocol.onUpdateApprovedIntentPhrase,
    onDeleteApprovedIntentPhrase: protocol.onDeleteApprovedIntentPhrase,
    isMobile: header.isMobile,
  };
}
