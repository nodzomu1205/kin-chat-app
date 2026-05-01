"use client";

import { useMemo, useState } from "react";
import GptPanel from "@/components/panels/gpt/GptPanel";
import { usePanelLayout } from "@/hooks/usePanelLayout";
import { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import { useGptMemory } from "@/hooks/useGptMemory";
import { DEFAULT_MEMORY_INTERPRETER_SETTINGS } from "@/lib/memory-domain/memoryInterpreterRules";
import { CHAT_PAGE_MOBILE_BREAKPOINT } from "@/lib/app/ui-state/chatPageDefaults";
import { buildGptPanelProps } from "@/lib/app/ui-state/panelPropsBuilders";
import { createEmptyTaskDraft } from "@/types/task";
import type { Message } from "@/types/chat";
import {
  createDefaultTaskRegistrationLibrarySettings,
  createDefaultTaskRegistrationRecurrence,
} from "@/lib/app/task-registration/taskRegistration";

export default function TestTaskPage() {
  const [gptMessages] = useState<Message[]>([]);
  const [gptInput, setGptInput] = useState("");
  const [taskDraft, setTaskDraft] = useState(createEmptyTaskDraft());
  const [protocolPrompt, setProtocolPrompt] = useState("");
  const [protocolRulebook, setProtocolRulebook] = useState("");

  const { isSinglePanelLayout } = usePanelLayout(CHAT_PAGE_MOBILE_BREAKPOINT);
  const gptBottomRef = useMemo(() => ({ current: null }), []);

  const {
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
    fileReadPolicy,
    setFileReadPolicy,
    autoGenerateLibrarySummary,
    setAutoGenerateLibrarySummary,
  } = usePersistedGptOptions();

  const { tokenStats } = useTokenTracking();
  const noopAsync = async () => {};
  const noop = () => {};

  const {
    gptState,
    resetGptForCurrentKin,
    memorySettings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings,
  } = useGptMemory(null, {
    memoryInterpreterSettings: DEFAULT_MEMORY_INTERPRETER_SETTINGS,
    approvedMemoryRules: [],
    rejectedMemoryRuleCandidateSignatures: [],
    onAddPendingMemoryRuleCandidates: noop,
  });

  const gptPanelProps = buildGptPanelProps({
    header: {
      currentKin: null,
      currentKinLabel: null,
      kinStatus: "idle",
      isMobile: isSinglePanelLayout,
      onSwitchPanel: noop,
    },
    chat: {
      gptState,
      gptMessages,
      gptInput,
      setGptInput,
      sendToGpt: noopAsync,
      injectFileToKinDraft: noopAsync,
      resetGptForCurrentKin,
      loading: false,
      gptBottomRef,
    },
    task: {
      currentTaskDraft: taskDraft,
      taskRegistrationDraft: createEmptyTaskDraft(),
      taskDraftCount: 1,
      activeTaskDraftIndex: 0,
      registeredTasks: [],
      editingRegisteredTaskId: null,
      taskRegistrationLibrarySettings:
        createDefaultTaskRegistrationLibrarySettings(),
      taskRegistrationRecurrence: createDefaultTaskRegistrationRecurrence(),
      taskProgressCount: 0,
      activeTaskProgressIndex: 0,
      runPrepTaskFromInput: noopAsync,
      runDeepenTaskFromLast: noopAsync,
      runUpdateTaskFromInput: noopAsync,
      runUpdateTaskFromLastGptMessage: noopAsync,
      runAttachSearchResultToTask: noopAsync,
      sendLatestGptContentToKin: noop,
      sendCurrentTaskContentToKin: noop,
      onRegisterCurrentTaskDraft: noop,
      onSaveCurrentTaskDraftToRegisteredTask: noop,
      onEditRegisteredTask: noop,
      onDeleteRegisteredTask: noop,
      onCancelTaskRegistrationEdit: noop,
      onStartRegisteredTask: noop,
      onChangeTaskRegistrationLibrarySettings: noop,
      onChangeTaskRegistrationRecurrence: noop,
      sendLastGptToKinDraft: noop,
      onResetTaskContext: noop,
      pendingInjection: {
        blocks: [],
        index: 0,
      },
      updateTaskDraftFields: (patch: Partial<typeof taskDraft>) =>
        setTaskDraft((prev) => ({
          ...prev,
          ...patch,
        })),
      pendingRequests: [],
      buildTaskRequestAnswerDraft: (
        requestId: string
      ) => requestId,
    },
    protocol: {
      protocolPrompt,
      protocolRulebook,
      pendingIntentCandidates: [],
      approvedIntentPhrases: [],
      onChangeProtocolPrompt: setProtocolPrompt,
      onChangeProtocolRulebook: setProtocolRulebook,
      onResetProtocolDefaults: noop,
      onSaveProtocolDefaults: noop,
      onSetProtocolRulebookToKinDraft: noop,
      onSendProtocolRulebookToKin: noopAsync,
      onUpdateIntentCandidate: noop,
      onApproveIntentCandidate: noop,
      onRejectIntentCandidate: noop,
      onUpdateApprovedIntentPhrase: noop,
      onDeleteApprovedIntentPhrase: noop,
    },
    references: {
      lastSearchContext: null,
      searchHistory: [],
      selectedTaskSearchResultId: "",
      multipartAssemblies: [],
      storedDocuments: [],
      referenceLibraryItems: [],
      selectedTaskLibraryItemId: "",
      onSelectTaskSearchResult: noop,
      onMoveSearchHistoryItem: noop,
      onDeleteSearchHistoryItem: noop,
      onLoadMultipartAssemblyToGptInput: noop,
      onDownloadMultipartAssembly: noop,
      onDeleteMultipartAssembly: noop,
      onLoadStoredDocumentToGptInput: noop,
      onDownloadStoredDocument: noop,
      onDeleteStoredDocument: noop,
      onMoveStoredDocument: noop,
      onMoveLibraryItem: noop,
      onSelectTaskLibraryItem: noop,
      onChangeLibraryItemMode: noop,
      onStartAskAiModeSearch: noopAsync,
      onImportYouTubeTranscript: noopAsync,
      onSendYouTubeTranscriptToKin: noopAsync,
        onSaveStoredDocument: noop,
        onShowLibraryItemInChat: noop,
        onSendLibraryItemToKin: noopAsync,
        onShowAllLibraryItemsInChat: noopAsync,
        onSendAllLibraryItemsToKin: noopAsync,
        onUploadLibraryItemToGoogleDrive: noopAsync,
        onRenderPresentationPlanToPpt: noopAsync,
        onImportDeviceImageFile: noopAsync,
        onImportGoogleDriveImageFile: noopAsync,
      },
    settings: {
      memorySettings,
      defaultMemorySettings,
      tokenStats,
      uploadKind,
      ingestMode,
      imageDetail,
      fileReadPolicy,
      imageLibraryImportEnabled: false,
      imageLibraryImportMode: "image_only",
      autoGenerateLibrarySummary,
      compactCharLimit,
      simpleImageCharLimit,
      ingestLoading: false,
      canInjectFile: false,
      searchMode: "normal",
      searchEngines: [],
      searchLocation: "",
      sourceDisplayCount: 3,
      autoLibraryReferenceEnabled: true,
      libraryReferenceMode: "summary_only",
      libraryIndexResponseCount: 12,
      libraryReferenceCount: 3,
      imageLibraryReferenceEnabled: true,
      imageLibraryReferenceCount: 6,
      imageLibraryCardLimit: 50,
      libraryStorageMB: 0,
      libraryReferenceEstimatedTokens: 0,
      autoSendKinSysInput: false,
      autoCopyKinSysResponseToGpt: false,
      autoSendGptSysInput: false,
      autoCopyGptSysResponseToKin: false,
      autoCopyFileIngestSysInfoToKin: true,
      googleDriveFolderLink: "",
      googleDriveFolderId: "",
      googleDriveIntegrationMode: "manual_link",
      memoryInterpreterSettings: DEFAULT_MEMORY_INTERPRETER_SETTINGS,
      pendingMemoryRuleCandidates: [],
      approvedMemoryRules: [],
      onSaveMemorySettings: updateMemorySettings,
      onResetMemorySettings: resetMemorySettings,
      onChangeUploadKind: setUploadKind,
      onChangeIngestMode: setIngestMode,
      onChangeImageDetail: setImageDetail,
      onChangeCompactCharLimit: setCompactCharLimit,
      onChangeSimpleImageCharLimit: setSimpleImageCharLimit,
      onChangeFileReadPolicy: setFileReadPolicy,
      onChangeImageLibraryImportEnabled: noop,
      onChangeImageLibraryImportMode: noop,
      onChangeAutoGenerateLibrarySummary: setAutoGenerateLibrarySummary,
      onChangeSearchMode: noop,
      onChangeSearchEngines: noop,
      onChangeSearchLocation: noop,
      onChangeSourceDisplayCount: noop,
      onChangeAutoLibraryReferenceEnabled: noop,
      onChangeLibraryReferenceMode: noop,
      onChangeLibraryIndexResponseCount: noop,
      onChangeLibraryReferenceCount: noop,
      onChangeImageLibraryReferenceEnabled: noop,
      onChangeImageLibraryReferenceCount: noop,
      onChangeImageLibraryCardLimit: noop,
      onChangeAutoSendKinSysInput: noop,
      onChangeAutoCopyKinSysResponseToGpt: noop,
      onChangeAutoSendGptSysInput: noop,
      onChangeAutoCopyGptSysResponseToKin: noop,
      onChangeAutoCopyFileIngestSysInfoToKin: noop,
      onChangeGoogleDriveFolderLink: noop,
      onOpenGoogleDriveFolder: noop,
      onImportGoogleDriveFile: noopAsync,
      onIndexGoogleDriveFolder: noopAsync,
      onImportGoogleDriveFolder: noopAsync,
      onChangeMemoryInterpreterSettings: noop,
      onApproveMemoryRuleCandidate: noop,
      onRejectMemoryRuleCandidate: noop,
      onUpdateMemoryRuleCandidate: noop,
      onDeleteApprovedMemoryRule: noop,
    },
  });

  return (
    <div
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          padding: isSinglePanelLayout ? 0 : 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <GptPanel {...gptPanelProps} />
        </div>
      </div>
    </div>
  );
}
