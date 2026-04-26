import { describe, expect, it } from "vitest";
import {
  buildDeviceImportOptions,
  buildGptMetaDrawerProps,
  buildGptSettingsDrawerProps,
  buildGptTaskDrawerProps,
  buildLibraryDrawerProps,
  buildLocalSettingsResetInput,
  buildMemorySettingsSaveInput,
  getDeviceImportAccept,
} from "@/components/panels/gpt/GptDrawerRouterHelpers";
import {
  type LocalMemorySettingsInput,
  toPositiveInt,
} from "@/components/panels/gpt/gptPanelHelpers";
import type {
  GptPanelProtocolProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";

describe("GptDrawerRouterHelpers", () => {
  const noop = () => {};

  it("limits visual upload kinds to pdf and image files", () => {
    expect(getDeviceImportAccept("image")).toBe(".pdf,image/*");
    expect(getDeviceImportAccept("pdf")).toBe(".pdf,image/*");
    expect(getDeviceImportAccept("mixed")).toBe(".pdf,image/*");
    expect(getDeviceImportAccept("text")).toContain(".txt");
    expect(getDeviceImportAccept("auto")).toContain(".docx");
  });

  it("builds device import options from settings", () => {
    expect(
      buildDeviceImportOptions({
        uploadKind: "mixed",
        ingestMode: "detailed",
        imageDetail: "max",
        fileReadPolicy: "text_and_layout",
        compactCharLimit: 1200,
        simpleImageCharLimit: 340,
      })
    ).toEqual({
      kind: "mixed",
      mode: "detailed",
      detail: "max",
      readPolicy: "text_and_layout",
      compactCharLimit: 1200,
      simpleImageCharLimit: 340,
    });
  });

  it("builds reset inputs from default memory settings", () => {
    expect(
      buildLocalSettingsResetInput({
        maxFacts: 7,
        maxPreferences: 5,
        chatRecentLimit: 11,
        summarizeThreshold: 13000,
        recentKeep: 3,
      })
    ).toEqual({
      maxFacts: "7",
      maxPreferences: "5",
      chatRecentLimit: "11",
      summarizeThreshold: "13000",
      recentKeep: "3",
    });
  });

  it("builds saved memory settings with current values as fallbacks", () => {
    expect(
      buildMemorySettingsSaveInput({
        localSettings: {
          maxFacts: "9",
          maxPreferences: "-1",
          chatRecentLimit: "abc",
          summarizeThreshold: "15000",
          recentKeep: "0",
        },
        memorySettings: {
          maxFacts: 2,
          maxPreferences: 4,
          chatRecentLimit: 6,
          summarizeThreshold: 8000,
          recentKeep: 1,
        },
        toPositiveInt,
      })
    ).toEqual({
      maxFacts: 9,
      maxPreferences: 4,
      chatRecentLimit: 6,
      summarizeThreshold: 15000,
      recentKeep: 0,
    });
  });

  it("builds meta drawer props from shared panel inputs", () => {
    const onToggleMemoryContent = () => {};
    const props = buildGptMetaDrawerProps({
      mode: "tokens",
      header: { isMobile: true },
      chat: { gptState: { recentMessages: [] } },
      settings: {
        memorySettings: {
          maxFacts: 8,
          maxPreferences: 5,
          chatRecentLimit: 12,
          summarizeThreshold: 9000,
          recentKeep: 2,
        },
        tokenStats: { latestTotal: 20 },
      },
      memoryUsed: 3,
      memoryCapacity: 30,
      recentCount: 4,
      factCount: 5,
      preferenceCount: 6,
      listCount: 7,
      rolling5Usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      totalUsage: { inputTokens: 4, outputTokens: 5, totalTokens: 9 },
      showMemoryContent: true,
      onToggleMemoryContent,
    });

    expect(props).toMatchObject({
      mode: "tokens",
      isMobile: true,
      memoryUsed: 3,
      memoryCapacity: 30,
      chatRecentLimit: 12,
      maxFacts: 8,
      maxPreferences: 5,
      showMemoryContent: true,
    });
    expect(props.onToggleMemoryContent).toBe(onToggleMemoryContent);
  });

  it("builds task drawer props without changing callback identity", () => {
    const onChangeTaskTitle = () => {};
    const props = buildGptTaskDrawerProps(
      {
        currentTaskDraft: {
          id: "task-1",
          taskId: "task-1",
          slot: 0,
          title: "Title",
          userInstruction: "",
          body: "",
          searchContext: null,
          taskName: "Title",
          objective: "",
          prepText: "",
          deepenText: "",
          mergedText: "",
          kinTaskText: "",
          status: "idle",
          sources: [],
          updatedAt: "",
        },
        taskDraftCount: 2,
        activeTaskDraftIndex: 1,
        taskProgressCount: 0,
        activeTaskProgressIndex: 0,
        pendingInjectionCurrentPart: 0,
        pendingInjectionTotalParts: 0,
        runPrepTaskFromInput: noop,
        runDeepenTaskFromLast: noop,
        runUpdateTaskFromInput: noop,
        runUpdateTaskFromLastGptMessage: noop,
        runAttachSearchResultToTask: noop,
        sendLatestGptContentToKin: noop,
        sendCurrentTaskContentToKin: noop,
        receiveLastKinResponseToGptInput: noop,
        sendLastGptToKinDraft: noop,
        onChangeTaskTitle,
        onChangeTaskUserInstruction: noop,
        onChangeTaskBody: noop,
      },
      true
    );

    expect(props.currentTaskDraft.id).toBe("task-1");
    expect(props.taskDraftCount).toBe(2);
    expect(props.activeTaskDraftIndex).toBe(1);
    expect(props.onChangeTaskTitle).toBe(onChangeTaskTitle);
    expect(props.isMobile).toBe(true);
  });

  it("builds library drawer props from reference and settings sources", () => {
    const onImportDeviceFile = async () => {};
    const props = buildLibraryDrawerProps({
      header: { isMobile: false },
      references: {
        lastSearchContext: null,
        searchHistory: [],
        selectedTaskSearchResultId: "",
        multipartAssemblies: [],
        storedDocuments: [],
        referenceLibraryItems: [],
        selectedTaskLibraryItemId: "item-1",
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
        onStartAskAiModeSearch: noop,
        onImportYouTubeTranscript: noop,
        onSendYouTubeTranscriptToKin: noop,
          onSaveStoredDocument: noop,
          onShowLibraryItemInChat: noop,
          onSendLibraryItemToKin: noop,
          onShowAllLibraryItemsInChat: noop,
          onSendAllLibraryItemsToKin: noop,
          onUploadLibraryItemToGoogleDrive: noop,
        },
      settings: {
        libraryReferenceCount: 4,
        sourceDisplayCount: 3,
        onOpenGoogleDriveFolder: noop,
        onImportGoogleDriveFile: noop,
        onIndexGoogleDriveFolder: noop,
        onImportGoogleDriveFolder: noop,
        uploadKind: "pdf",
        ingestLoading: true,
        canInjectFile: false,
      },
      onImportDeviceFile,
    });

    expect(props.selectedTaskLibraryItemId).toBe("item-1");
    expect(props.libraryReferenceCount).toBe(4);
    expect(props.sourceDisplayCount).toBe(3);
    expect(props.deviceImportAccept).toBe(".pdf,image/*");
    expect(props.deviceImportDisabled).toBe(true);
    expect(props.onImportDeviceFile).toBe(onImportDeviceFile);
  });

  it("builds settings drawer props and preserves reset/save handlers", () => {
    let localSettings: LocalMemorySettingsInput = {
      maxFacts: "9",
      maxPreferences: "8",
      chatRecentLimit: "7",
      summarizeThreshold: "6000",
      recentKeep: "5",
    };
    let resetCount = 0;
    let savedSettings: unknown = null;
    const setLocalSettings = (
      value:
        | LocalMemorySettingsInput
        | ((prev: LocalMemorySettingsInput) => LocalMemorySettingsInput)
    ) => {
      localSettings =
        typeof value === "function" ? value(localSettings) : value;
    };
    const onChangeProtocolPrompt = () => {};
    const onChangeSearchMode = () => {};
    const settings: GptPanelSettingsProps = {
      memorySettings: {
        maxFacts: 3,
        maxPreferences: 4,
        chatRecentLimit: 5,
        summarizeThreshold: 10000,
        recentKeep: 2,
      },
      defaultMemorySettings: {
        maxFacts: 10,
        maxPreferences: 11,
        chatRecentLimit: 12,
        summarizeThreshold: 13000,
        recentKeep: 14,
      },
      tokenStats: {},
      uploadKind: "auto",
      ingestMode: "compact",
      imageDetail: "simple",
      fileReadPolicy: "text_first",
      driveImportAutoSummary: true,
      compactCharLimit: 1200,
      simpleImageCharLimit: 500,
      ingestLoading: false,
      canInjectFile: true,
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Tokyo",
      sourceDisplayCount: 3,
      autoLibraryReferenceEnabled: true,
      libraryReferenceMode: "summary_only",
      libraryIndexResponseCount: 4,
      libraryReferenceCount: 5,
      libraryStorageMB: 1,
      libraryReferenceEstimatedTokens: 100,
      autoSendKinSysInput: false,
      autoCopyKinSysResponseToGpt: false,
      autoSendGptSysInput: false,
      autoCopyGptSysResponseToKin: false,
      autoCopyFileIngestSysInfoToKin: false,
      googleDriveFolderLink: "",
      googleDriveFolderId: "",
      googleDriveIntegrationMode: "picker",
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      pendingMemoryRuleCandidates: [],
      approvedMemoryRules: [],
      onSaveMemorySettings: (next) => {
        savedSettings = next;
      },
      onResetMemorySettings: () => {
        resetCount += 1;
      },
      onChangeUploadKind: noop,
      onChangeIngestMode: noop,
      onChangeImageDetail: noop,
      onChangeCompactCharLimit: noop,
      onChangeSimpleImageCharLimit: noop,
      onChangeFileReadPolicy: noop,
      onChangeDriveImportAutoSummary: noop,
      onChangeSearchMode,
      onChangeSearchEngines: noop,
      onChangeSearchLocation: noop,
      onChangeSourceDisplayCount: noop,
      onChangeAutoLibraryReferenceEnabled: noop,
      onChangeLibraryReferenceMode: noop,
      onChangeLibraryIndexResponseCount: noop,
      onChangeLibraryReferenceCount: noop,
      onChangeAutoSendKinSysInput: noop,
      onChangeAutoCopyKinSysResponseToGpt: noop,
      onChangeAutoSendGptSysInput: noop,
      onChangeAutoCopyGptSysResponseToKin: noop,
      onChangeAutoCopyFileIngestSysInfoToKin: noop,
      onChangeGoogleDriveFolderLink: noop,
      onOpenGoogleDriveFolder: noop,
      onImportGoogleDriveFile: noop,
      onIndexGoogleDriveFolder: noop,
      onImportGoogleDriveFolder: noop,
      onChangeMemoryInterpreterSettings: noop,
      onApproveMemoryRuleCandidate: noop,
      onRejectMemoryRuleCandidate: noop,
      onUpdateMemoryRuleCandidate: noop,
      onDeleteApprovedMemoryRule: noop,
    };
    const protocol: GptPanelProtocolProps = {
      protocolPrompt: "prompt",
      protocolRulebook: "rulebook",
      pendingIntentCandidates: [],
      approvedIntentPhrases: [],
      onChangeProtocolPrompt,
      onChangeProtocolRulebook: noop,
      onResetProtocolDefaults: noop,
      onSaveProtocolDefaults: noop,
      onSetProtocolRulebookToKinDraft: noop,
      onSendProtocolRulebookToKin: noop,
      onUpdateIntentCandidate: noop,
      onApproveIntentCandidate: noop,
      onRejectIntentCandidate: noop,
      onUpdateApprovedIntentPhrase: noop,
      onDeleteApprovedIntentPhrase: noop,
    };

    const props = buildGptSettingsDrawerProps({
      header: { isMobile: true },
      protocol,
      settings,
      localSettings,
      setLocalSettings,
      memoryCapacityPreview: 42,
      toPositiveInt,
    });

    expect(props.isMobile).toBe(true);
    expect(props.memoryCapacityPreview).toBe(42);
    expect(props.searchMode).toBe("normal");
    expect(props.onChangeSearchMode).toBe(onChangeSearchMode);
    expect(props.protocolPrompt).toBe("prompt");
    expect(props.onChangeProtocolPrompt).toBe(onChangeProtocolPrompt);

    props.onFieldChange("maxFacts", "22");
    expect(localSettings.maxFacts).toBe("22");

    props.onReset();
    expect(resetCount).toBe(1);
    expect(localSettings).toMatchObject({
      maxFacts: "10",
      maxPreferences: "11",
      chatRecentLimit: "12",
    });

    props.onSave();
    expect(savedSettings).toEqual({
      maxFacts: 9,
      maxPreferences: 8,
      chatRecentLimit: 7,
      summarizeThreshold: 6000,
      recentKeep: 5,
    });
  });
});
