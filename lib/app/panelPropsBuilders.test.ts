import { describe, expect, it, vi } from "vitest";
import {
  buildGptPanelProps,
  clampPanelCount,
  resolvePendingInjectionProgress,
} from "@/lib/app/panelPropsBuilders";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import { DEFAULT_MEMORY_INTERPRETER_SETTINGS } from "@/lib/memoryInterpreterRules";
import { createEmptyTaskDraft } from "@/types/task";

describe("panelPropsBuilders", () => {
  it("resolves pending injection progress", () => {
    expect(
      resolvePendingInjectionProgress({
        blocks: [],
        index: 0,
      })
    ).toEqual({
      currentPart: 0,
      totalParts: 0,
    });

    expect(
      resolvePendingInjectionProgress({
        blocks: ["a", "b", "c"],
        index: 1,
      })
    ).toEqual({
      currentPart: 2,
      totalParts: 3,
    });
  });

  it("clamps numeric panel counts to the requested range", () => {
    expect(clampPanelCount(0, 1, 20)).toBe(1);
    expect(clampPanelCount(999, 1, 20)).toBe(20);
    expect(clampPanelCount(Number.NaN, 1, 20)).toBe(1);
    expect(clampPanelCount(7, 1, 20)).toBe(7);
  });

  it("builds GPT panel callbacks for task editing, count clamping, and request answers", () => {
    const updateTaskDraftFields = vi.fn();
    const setGptInput = vi.fn();
    const onChangeSourceDisplayCount = vi.fn();
    const onChangeLibraryIndexResponseCount = vi.fn();
    const onChangeLibraryReferenceCount = vi.fn();

    const props = buildGptPanelProps({
      currentKin: "kin-1",
      currentKinLabel: "Kin 1",
      kinStatus: "connected",
      gptState: {},
      gptMessages: [],
      gptInput: "",
      setGptInput,
      sendToGpt: vi.fn(),
      runPrepTaskFromInput: vi.fn(),
      runDeepenTaskFromLast: vi.fn(),
      runUpdateTaskFromInput: vi.fn(),
      runUpdateTaskFromLastGptMessage: vi.fn(),
      runAttachSearchResultToTask: vi.fn(),
      sendLatestGptContentToKin: vi.fn(),
      sendCurrentTaskContentToKin: vi.fn(),
      receiveLastKinResponseToGptInput: vi.fn(),
      resetGptForCurrentKin: vi.fn(),
      sendLastGptToKinDraft: vi.fn(),
      injectFileToKinDraft: vi.fn(),
      canInjectFile: true,
      loading: false,
      ingestLoading: false,
      gptBottomRef: { current: null },
      memorySettings: DEFAULT_MEMORY_SETTINGS,
      defaultMemorySettings: DEFAULT_MEMORY_SETTINGS,
      onSaveMemorySettings: vi.fn(),
      onResetMemorySettings: vi.fn(),
      tokenStats: {},
      responseMode: "strict",
      onChangeResponseMode: vi.fn(),
      uploadKind: "auto",
      ingestMode: "compact",
      imageDetail: "simple",
      postIngestAction: "inject_only",
      fileReadPolicy: "text_first",
      onChangeUploadKind: vi.fn(),
      onChangeIngestMode: vi.fn(),
      onChangeImageDetail: vi.fn(),
      compactCharLimit: 500,
      simpleImageCharLimit: 500,
      onChangeCompactCharLimit: vi.fn(),
      onChangeSimpleImageCharLimit: vi.fn(),
      onChangePostIngestAction: vi.fn(),
      onChangeFileReadPolicy: vi.fn(),
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      sourceDisplayCount: 5,
      autoLibraryReferenceEnabled: false,
      libraryReferenceMode: "summary_only",
      libraryIndexResponseCount: 3,
      libraryReferenceCount: 2,
      libraryStorageMB: 0,
      libraryReferenceEstimatedTokens: 0,
      autoSendKinSysInput: false,
      autoCopyKinSysResponseToGpt: false,
      autoSendGptSysInput: false,
      autoCopyGptSysResponseToKin: false,
      autoCopyFileIngestSysInfoToKin: false,
      memoryInterpreterSettings: DEFAULT_MEMORY_INTERPRETER_SETTINGS,
      pendingMemoryRuleCandidates: [],
      approvedMemoryRules: [],
      onChangeSearchMode: vi.fn(),
      onChangeSearchEngines: vi.fn(),
      onChangeSearchLocation: vi.fn(),
      onChangeSourceDisplayCount,
      onChangeAutoLibraryReferenceEnabled: vi.fn(),
      onChangeLibraryReferenceMode: vi.fn(),
      onChangeLibraryIndexResponseCount,
      onChangeLibraryReferenceCount,
      onChangeAutoSendKinSysInput: vi.fn(),
      onChangeAutoCopyKinSysResponseToGpt: vi.fn(),
      onChangeAutoSendGptSysInput: vi.fn(),
      onChangeAutoCopyGptSysResponseToKin: vi.fn(),
      onChangeAutoCopyFileIngestSysInfoToKin: vi.fn(),
      onChangeMemoryInterpreterSettings: vi.fn(),
      onApproveMemoryRuleCandidate: vi.fn(),
      onRejectMemoryRuleCandidate: vi.fn(),
      onUpdateMemoryRuleCandidate: vi.fn(),
      onDeleteApprovedMemoryRule: vi.fn(),
      onDeleteSearchHistoryItem: vi.fn(),
      multipartAssemblies: [],
      onLoadMultipartAssemblyToGptInput: vi.fn(),
      onDownloadMultipartAssembly: vi.fn(),
      onDeleteMultipartAssembly: vi.fn(),
      storedDocuments: [],
      referenceLibraryItems: [],
      selectedTaskLibraryItemId: "",
      onLoadStoredDocumentToGptInput: vi.fn(),
      onDownloadStoredDocument: vi.fn(),
      onDeleteStoredDocument: vi.fn(),
      onMoveStoredDocument: vi.fn(),
      onMoveLibraryItem: vi.fn(),
      onSelectTaskLibraryItem: vi.fn(),
      onChangeLibraryItemMode: vi.fn(),
      onStartAskAiModeSearch: vi.fn(),
      onImportYouTubeTranscript: vi.fn(),
      onSendYouTubeTranscriptToKin: vi.fn(),
      onSaveStoredDocument: vi.fn(),
      pendingIntentCandidates: [],
      approvedIntentPhrases: [],
      onUpdateIntentCandidate: vi.fn(),
      onApproveIntentCandidate: vi.fn(),
      onRejectIntentCandidate: vi.fn(),
      onUpdateApprovedIntentPhrase: vi.fn(),
      onDeleteApprovedIntentPhrase: vi.fn(),
      lastSearchContext: null,
      searchHistory: [],
      selectedTaskSearchResultId: "",
      onSelectTaskSearchResult: vi.fn(),
      onMoveSearchHistoryItem: vi.fn(),
      onSwitchPanel: vi.fn(),
      isMobile: false,
      currentTaskDraft: {
        ...createEmptyTaskDraft(),
        taskName: "Existing Task",
      },
      taskDraftCount: 1,
      activeTaskDraftIndex: 0,
      protocolPrompt: "",
      protocolRulebook: "",
      onChangeProtocolPrompt: vi.fn(),
      onChangeProtocolRulebook: vi.fn(),
      onResetProtocolDefaults: vi.fn(),
      onSaveProtocolDefaults: vi.fn(),
      onSetProtocolRulebookToKinDraft: vi.fn(),
      onSendProtocolRulebookToKin: vi.fn(),
      taskProgressView: undefined,
      taskProgressCount: 0,
      activeTaskProgressIndex: 0,
      onPrepareTaskRequestAck: vi.fn(),
      onPrepareTaskSync: vi.fn(),
      onStartKinTask: vi.fn(),
      onResetTaskContext: vi.fn(),
      pendingInjection: {
        blocks: ["first", "second"],
        index: 0,
      },
      updateTaskDraftFields,
      pendingRequests: [
        {
          id: "REQ-1",
          actionId: "A1",
          body: "Need more detail",
        },
      ],
      buildTaskRequestAnswerDraft: (requestId, requestBody) =>
        `${requestId}:${requestBody ?? ""}`,
    });

    props.task?.onChangeTaskTitle("  Revised title  ");
    expect(updateTaskDraftFields).toHaveBeenCalledWith({
      title: "  Revised title  ",
      taskName: "Revised title",
    });

    props.task?.onChangeTaskBody("Body text");
    expect(updateTaskDraftFields).toHaveBeenCalledWith({
      body: "Body text",
      mergedText: "Body text",
    });

    props.settings?.onChangeSourceDisplayCount(999);
    props.settings?.onChangeLibraryIndexResponseCount(0);
    props.settings?.onChangeLibraryReferenceCount(999);
    expect(onChangeSourceDisplayCount).toHaveBeenCalledWith(20);
    expect(onChangeLibraryIndexResponseCount).toHaveBeenCalledWith(1);
    expect(onChangeLibraryReferenceCount).toHaveBeenCalledWith(20);

    props.onAnswerTaskRequest?.("REQ-1");
    expect(setGptInput).toHaveBeenCalledWith("REQ-1:Need more detail");
    expect(props.task?.pendingInjectionCurrentPart).toBe(1);
    expect(props.task?.pendingInjectionTotalParts).toBe(2);
  });
});
