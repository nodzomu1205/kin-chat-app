import { describe, expect, it, vi } from "vitest";
import {
  buildChatPageTaskSnapshotDocument,
  buildChatPageWorkspaceGptPanelArgs,
  buildChatPageWorkspaceKinPanelArgs,
  saveChatPageTaskSnapshot,
} from "@/hooks/chatPagePanelCompositionBuilders";
import { createEmptyTaskDraft } from "@/types/task";

const { requestGeneratedLibrarySummary } = vi.hoisted(() => ({
  requestGeneratedLibrarySummary: vi.fn(),
}));

vi.mock("@/lib/app/librarySummaryClient", () => ({
  requestGeneratedLibrarySummary,
  normalizeLibrarySummaryUsage: vi.fn((usage) => usage),
}));

describe("chatPagePanelCompositionBuilders", () => {
  it("builds a task snapshot document only when the task draft has content", () => {
    expect(
      buildChatPageTaskSnapshotDocument({
        task: {
          currentTaskDraft: {
            ...createEmptyTaskDraft(),
            id: "draft-1",
            title: "Task title",
            userInstruction: "Do the work",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        } as never,
      })
    ).toMatchObject({
      title: "Task Snapshot - Task title",
    });
  });

  it("returns null for an empty task snapshot", () => {
    expect(
      buildChatPageTaskSnapshotDocument({
        task: {
          currentTaskDraft: {
            ...createEmptyTaskDraft(),
            id: "draft-1",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        } as never,
      })
    ).toBeNull();
  });

  it("saves a task snapshot only when a document can be built", async () => {
    const recordIngestedDocument = vi.fn();
    const applyIngestUsage = vi.fn();
    requestGeneratedLibrarySummary.mockResolvedValue({
      summary: "Generated snapshot summary",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
    });

    await expect(
      saveChatPageTaskSnapshot({
        task: {
          currentTaskDraft: {
            ...createEmptyTaskDraft(),
            id: "draft-1",
            title: "Task title",
            userInstruction: "Do the work",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        } as never,
        usage: {
          recordIngestedDocument,
          applyIngestUsage,
        } as never,
      })
    ).resolves.toBe(true);
    expect(recordIngestedDocument).toHaveBeenCalledOnce();
    expect(requestGeneratedLibrarySummary).toHaveBeenCalledOnce();
    expect(applyIngestUsage).toHaveBeenCalledOnce();
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "Generated snapshot summary",
      })
    );

    recordIngestedDocument.mockClear();
    applyIngestUsage.mockClear();
    requestGeneratedLibrarySummary.mockClear();

    await expect(
      saveChatPageTaskSnapshot({
        task: {
          currentTaskDraft: {
            ...createEmptyTaskDraft(),
            id: "draft-2",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        } as never,
        usage: {
          recordIngestedDocument,
          applyIngestUsage,
        } as never,
      })
    ).resolves.toBe(false);
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(requestGeneratedLibrarySummary).not.toHaveBeenCalled();
  });

  it("routes mobile panel switching through shared focus handlers", () => {
    const focusKinPanel = vi.fn();
    const focusGptPanel = vi.fn();
    const workspaceArgs = {
      app: {
        currentKin: "kin-1",
        currentKinLabel: "Kin",
        kinStatus: "connected",
        kinList: [],
        isMobile: true,
        focusKinPanel,
        focusGptPanel,
      },
      task: {
        taskProtocolView: {} as never,
        currentTaskDraft: createEmptyTaskDraft(),
        taskDraftCount: 1,
        activeTaskDraftIndex: 0,
        resetCurrentTaskDraft: vi.fn(),
        updateTaskDraftFields: vi.fn(),
        buildTaskRequestAnswerDraft: vi.fn(),
        onSelectPreviousTaskDraft: vi.fn(),
        onSelectNextTaskDraft: vi.fn(),
      },
      ui: {
        kinMessages: [],
        kinInput: "",
        setKinInput: vi.fn(),
        kinBottomRef: { current: null },
        kinLoading: false,
        pendingKinInjectionBlocks: [],
        pendingKinInjectionIndex: 0,
        gptMessages: [],
        gptInput: "",
        setGptInput: vi.fn(),
        gptBottomRef: { current: null },
        gptLoading: false,
        ingestLoading: false,
      },
      kin: {
        kinIdInput: "",
        setKinIdInput: vi.fn(),
        kinNameInput: "",
        setKinNameInput: vi.fn(),
        renameKin: vi.fn(),
      },
      protocol: {
        protocolPrompt: "",
        protocolRulebook: "",
        pendingIntentCandidates: [],
        approvedIntentPhrases: [],
        onChangeProtocolPrompt: vi.fn(),
        onChangeProtocolRulebook: vi.fn(),
      },
      search: {
        lastSearchContext: null,
        searchHistory: [],
        selectedTaskSearchResultId: "",
        onSelectTaskSearchResult: vi.fn(),
        onMoveSearchHistoryItem: vi.fn(),
        onDeleteSearchHistoryItem: vi.fn(),
      },
      references: {
        multipartAssemblies: [],
        storedDocuments: [],
        referenceLibraryItems: [],
        selectedTaskLibraryItemId: "",
        onLoadMultipartAssemblyToGptInput: vi.fn(),
        onDownloadMultipartAssembly: vi.fn(),
        onDeleteMultipartAssembly: vi.fn(),
        onLoadStoredDocumentToGptInput: vi.fn(),
        onDownloadStoredDocument: vi.fn(),
        onDeleteStoredDocument: vi.fn(),
        onMoveStoredDocument: vi.fn(),
        onMoveLibraryItem: vi.fn(),
        onSelectTaskLibraryItem: vi.fn(),
        onChangeLibraryItemMode: vi.fn(),
        onSaveStoredDocument: vi.fn(),
      },
      gpt: {
        gptState: {} as never,
        defaultMemorySettings: {} as never,
        uploadKind: "file",
        ingestMode: "standard",
        imageDetail: "auto",
        fileReadPolicy: "auto",
        compactCharLimit: 0,
        simpleImageCharLimit: 0,
        onChangeUploadKind: vi.fn(),
        onChangeIngestMode: vi.fn(),
        onChangeImageDetail: vi.fn(),
        onChangeFileReadPolicy: vi.fn(),
        onChangeCompactCharLimit: vi.fn(),
        onChangeSimpleImageCharLimit: vi.fn(),
      },
      bridge: {
        autoBridgeSettings: {
          autoSendKinSysInput: false,
          autoCopyKinSysResponseToGpt: false,
          autoSendGptSysInput: false,
          autoCopyGptSysResponseToKin: false,
          autoCopyFileIngestSysInfoToKin: false,
        },
        onChangeAutoSendKinSysInput: vi.fn(),
        onChangeAutoCopyKinSysResponseToGpt: vi.fn(),
        onChangeAutoSendGptSysInput: vi.fn(),
        onChangeAutoCopyGptSysResponseToKin: vi.fn(),
        onChangeAutoCopyFileIngestSysInfoToKin: vi.fn(),
      },
      memory: {
        memorySettings: {} as never,
        memoryInterpreterSettings: {} as never,
        pendingMemoryRuleCandidates: [],
        approvedMemoryRules: [],
        onChangeMemoryInterpreterSettings: vi.fn(),
        onApproveMemoryRuleCandidate: vi.fn(),
        onRejectMemoryRuleCandidate: vi.fn(),
        onUpdateMemoryRuleCandidate: vi.fn(),
        onDeleteApprovedMemoryRule: vi.fn(),
      },
      usage: {
        recordIngestedDocument: vi.fn(),
      },
    } as never;
    const controller = {} as never;

    const kinArgs = buildChatPageWorkspaceKinPanelArgs(workspaceArgs, controller);
    const gptArgs = buildChatPageWorkspaceGptPanelArgs(workspaceArgs, {
      controller,
      onSaveTaskSnapshot: vi.fn(),
    });

    kinArgs.onSwitchToGptPanel();
    gptArgs.onSwitchToKinPanel();

    expect(focusGptPanel).toHaveBeenCalledOnce();
    expect(focusKinPanel).toHaveBeenCalledOnce();
  });

  it("keeps shared panel base app values aligned across kin and gpt builders", () => {
    const focusKinPanel = vi.fn();
    const focusGptPanel = vi.fn();
    const workspaceArgs = {
      app: {
        currentKin: "kin-2",
        currentKinLabel: "Kin Two",
        kinStatus: "idle",
        kinList: [{ id: "kin-2", name: "Kin Two" }],
        isMobile: false,
        focusKinPanel,
        focusGptPanel,
      },
      task: {
        taskProtocolView: { currentTaskId: "task-1" },
        currentTaskDraft: createEmptyTaskDraft(),
        taskDraftCount: 1,
        activeTaskDraftIndex: 0,
        resetCurrentTaskDraft: vi.fn(),
        updateTaskDraftFields: vi.fn(),
        buildTaskRequestAnswerDraft: vi.fn(),
        onSelectPreviousTaskDraft: vi.fn(),
        onSelectNextTaskDraft: vi.fn(),
      },
      ui: {
        kinMessages: [],
        kinInput: "",
        setKinInput: vi.fn(),
        kinBottomRef: { current: null },
        kinLoading: false,
        pendingKinInjectionBlocks: [],
        pendingKinInjectionIndex: 0,
        gptMessages: [],
        gptInput: "",
        setGptInput: vi.fn(),
        gptBottomRef: { current: null },
        gptLoading: false,
        ingestLoading: false,
      },
      kin: {
        kinIdInput: "",
        setKinIdInput: vi.fn(),
        kinNameInput: "",
        setKinNameInput: vi.fn(),
        renameKin: vi.fn(),
      },
      protocol: {
        protocolPrompt: "",
        protocolRulebook: "",
        pendingIntentCandidates: [],
        approvedIntentPhrases: [],
        onChangeProtocolPrompt: vi.fn(),
        onChangeProtocolRulebook: vi.fn(),
      },
      search: {
        lastSearchContext: null,
        searchHistory: [],
        selectedTaskSearchResultId: "",
        onSelectTaskSearchResult: vi.fn(),
        onMoveSearchHistoryItem: vi.fn(),
        onDeleteSearchHistoryItem: vi.fn(),
      },
      references: {
        multipartAssemblies: [],
        storedDocuments: [],
        referenceLibraryItems: [],
        selectedTaskLibraryItemId: "",
        onLoadMultipartAssemblyToGptInput: vi.fn(),
        onDownloadMultipartAssembly: vi.fn(),
        onDeleteMultipartAssembly: vi.fn(),
        onLoadStoredDocumentToGptInput: vi.fn(),
        onDownloadStoredDocument: vi.fn(),
        onDeleteStoredDocument: vi.fn(),
        onMoveStoredDocument: vi.fn(),
        onMoveLibraryItem: vi.fn(),
        onSelectTaskLibraryItem: vi.fn(),
        onChangeLibraryItemMode: vi.fn(),
        onSaveStoredDocument: vi.fn(),
      },
      gpt: {
        gptState: {} as never,
        defaultMemorySettings: {} as never,
        uploadKind: "file",
        ingestMode: "standard",
        imageDetail: "auto",
        fileReadPolicy: "auto",
        compactCharLimit: 0,
        simpleImageCharLimit: 0,
        onChangeUploadKind: vi.fn(),
        onChangeIngestMode: vi.fn(),
        onChangeImageDetail: vi.fn(),
        onChangeFileReadPolicy: vi.fn(),
        onChangeCompactCharLimit: vi.fn(),
        onChangeSimpleImageCharLimit: vi.fn(),
      },
      bridge: {
        autoBridgeSettings: {
          autoSendKinSysInput: false,
          autoCopyKinSysResponseToGpt: false,
          autoSendGptSysInput: false,
          autoCopyGptSysResponseToKin: false,
          autoCopyFileIngestSysInfoToKin: false,
        },
        onChangeAutoSendKinSysInput: vi.fn(),
        onChangeAutoCopyKinSysResponseToGpt: vi.fn(),
        onChangeAutoSendGptSysInput: vi.fn(),
        onChangeAutoCopyGptSysResponseToKin: vi.fn(),
        onChangeAutoCopyFileIngestSysInfoToKin: vi.fn(),
      },
      memory: {
        memorySettings: {} as never,
        tokenStats: {} as never,
        memoryInterpreterSettings: {} as never,
        pendingMemoryRuleCandidates: [],
        approvedMemoryRules: [],
        onChangeMemoryInterpreterSettings: vi.fn(),
        onApproveMemoryRuleCandidate: vi.fn(),
        onRejectMemoryRuleCandidate: vi.fn(),
        onUpdateMemoryRuleCandidate: vi.fn(),
        onDeleteApprovedMemoryRule: vi.fn(),
      },
      usage: {
        recordIngestedDocument: vi.fn(),
      },
    } as never;
    const controller = { panel: { resetPanels: vi.fn() } } as never;

    const kinArgs = buildChatPageWorkspaceKinPanelArgs(workspaceArgs, controller);
    const gptArgs = buildChatPageWorkspaceGptPanelArgs(workspaceArgs, {
      controller,
      onSaveTaskSnapshot: vi.fn(),
    });

    expect(kinArgs.app).toEqual(gptArgs.app);
    expect(kinArgs.taskProtocolView).toBe(gptArgs.taskProtocolView);
    expect(kinArgs.controller).toBe(gptArgs.controller);
  });
});
