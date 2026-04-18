import { describe, expect, it } from "vitest";
import { buildChatPageWorkspaceViewArgsWithRefs } from "@/hooks/chatPageWorkspaceCompositionBuilders";

describe("chatPageWorkspaceCompositionBuilders", () => {
  it("attaches scroll refs to the composed workspace view args", () => {
    const kinBottomRef = { current: null };
    const gptBottomRef = { current: null };

    const result = buildChatPageWorkspaceViewArgsWithRefs({
      input: {
        state: {
          app: {
            currentKin: "kin-1",
            currentKinLabel: "Kin",
            kinStatus: "connected",
            kinList: [],
            isMobile: false,
          },
          ui: {
            gptInput: "",
            kinInput: "",
            gptLoading: false,
            kinLoading: false,
            ingestLoading: false,
            gptMessages: [],
            kinMessages: [],
            pendingKinInjectionBlocks: [],
            pendingKinInjectionIndex: 0,
          },
          task: {
            currentTaskDraft: {} as never,
            taskDraftCount: 1,
            activeTaskDraftIndex: 0,
          },
          protocol: {
            approvedIntentPhrases: [],
            rejectedIntentCandidateSignatures: [],
            pendingIntentCandidates: [],
            protocolPrompt: "",
            protocolRulebook: "",
          },
          search: {
            lastSearchContext: null,
            searchHistory: [],
            selectedTaskSearchResultId: "",
            searchMode: "normal",
            searchEngines: [],
            searchLocation: "",
            sourceDisplayCount: 0,
          },
          references: {
            multipartAssemblies: [],
            storedDocuments: [],
            referenceLibraryItems: [],
            selectedTaskLibraryItemId: "",
            autoLibraryReferenceEnabled: false,
            libraryReferenceMode: "off",
            libraryIndexResponseCount: 0,
            libraryReferenceCount: 0,
            libraryStorageMB: 0,
            libraryReferenceEstimatedTokens: 0,
          },
          gpt: {
            gptState: {} as never,
            responseMode: "strict",
            uploadKind: "file",
            ingestMode: "standard",
            imageDetail: "auto",
            compactCharLimit: 0,
            simpleImageCharLimit: 0,
            postIngestAction: "none",
            fileReadPolicy: "auto",
            defaultMemorySettings: {} as never,
          },
          bridge: {
            autoBridgeSettings: {} as never,
          },
          memory: {
            tokenStats: {} as never,
            memorySettings: {} as never,
            memoryInterpreterSettings: {} as never,
            pendingMemoryRuleCandidates: [],
            approvedMemoryRules: [],
          },
          kin: {
            kinIdInput: "",
            kinNameInput: "",
          },
        },
        actions: {
          app: {
            setActivePanelTab: (() => undefined) as never,
            focusKinPanel: (() => false) as never,
            focusGptPanel: (() => false) as never,
            setKinConnectionState: (() => undefined) as never,
          },
          ui: {
            setKinInput: (() => undefined) as never,
            setGptInput: (() => undefined) as never,
            setKinMessages: (() => undefined) as never,
            setGptMessages: (() => undefined) as never,
            setKinLoading: (() => undefined) as never,
            setGptLoading: (() => undefined) as never,
            setIngestLoading: (() => undefined) as never,
            setPendingKinInjectionBlocks: (() => undefined) as never,
            setPendingKinInjectionIndex: (() => undefined) as never,
          },
          task: {} as never,
          protocol: {} as never,
          search: {} as never,
          references: {} as never,
          gpt: {} as never,
          bridge: {} as never,
          memory: {} as never,
          kin: {} as never,
          reset: {} as never,
        },
        services: {
          task: {} as never,
          protocol: {} as never,
          search: {} as never,
          references: {} as never,
          gpt: {} as never,
          usage: {} as never,
        },
      } as never,
      kinBottomRef: kinBottomRef as never,
      gptBottomRef: gptBottomRef as never,
    });

    expect(result.ui.kinBottomRef).toBe(kinBottomRef);
    expect(result.ui.gptBottomRef).toBe(gptBottomRef);
  });

  it("keeps workspace sections sourced from their intended state, action, and service bundles", () => {
    const result = buildChatPageWorkspaceViewArgsWithRefs({
      input: {
        state: {
          app: {
            currentKin: "state-app",
          },
          ui: {
            gptInput: "state-ui",
          },
          task: {
            currentTaskDraft: "state-task",
          },
          protocol: {
            protocolPrompt: "state-protocol",
          },
          search: {
            searchMode: "state-search",
          },
          references: {
            storedDocuments: "state-references",
          },
          gpt: {
            responseMode: "state-gpt",
          },
          bridge: {
            autoBridgeSettings: "state-bridge",
          },
          memory: {
            tokenStats: "state-memory",
          },
          kin: {
            kinIdInput: "state-kin",
          },
        },
        actions: {
          app: {
            focusKinPanel: "action-app",
          },
          ui: {
            setGptInput: "action-ui",
          },
          task: {
            updateTask: "action-task",
          },
          protocol: {
            updateProtocol: "action-protocol",
          },
          search: {
            runSearch: "action-search",
          },
          references: {
            openReference: "action-references",
          },
          gpt: {
            submitGpt: "action-gpt",
          },
          bridge: {
            setAutoBridgeSettings: "action-bridge",
          },
          memory: {
            setMemorySettings: "action-memory",
          },
          kin: {
            setKinIdInput: "action-kin",
          },
          reset: {
            resetAll: "action-reset",
          },
        },
        services: {
          task: {
            saveTask: "service-task",
          },
          protocol: {
            compileProtocol: "service-protocol",
          },
          search: {
            formatSearch: "service-search",
          },
          references: {
            buildReferenceSummary: "service-references",
          },
          gpt: {
            sendToGpt: "service-gpt",
          },
          usage: {
            usageLabel: "service-usage",
          },
        },
      } as never,
      kinBottomRef: { current: null } as never,
      gptBottomRef: { current: null } as never,
    });

    expect(result.app).toMatchObject({
      currentKin: "state-app",
      focusKinPanel: "action-app",
    });
    expect(result.ui).toMatchObject({
      gptInput: "state-ui",
      setGptInput: "action-ui",
    });
    expect(result.task).toMatchObject({
      currentTaskDraft: "state-task",
      updateTask: "action-task",
      saveTask: "service-task",
    });
    expect(result.protocol).toMatchObject({
      protocolPrompt: "state-protocol",
      updateProtocol: "action-protocol",
      compileProtocol: "service-protocol",
    });
    expect(result.search).toMatchObject({
      searchMode: "state-search",
      runSearch: "action-search",
      formatSearch: "service-search",
    });
    expect(result.references).toMatchObject({
      storedDocuments: "state-references",
      openReference: "action-references",
      buildReferenceSummary: "service-references",
    });
    expect(result.gpt).toMatchObject({
      responseMode: "state-gpt",
      submitGpt: "action-gpt",
      sendToGpt: "service-gpt",
    });
    expect(result.bridge).toMatchObject({
      autoBridgeSettings: "state-bridge",
      setAutoBridgeSettings: "action-bridge",
    });
    expect(result.memory).toMatchObject({
      tokenStats: "state-memory",
      setMemorySettings: "action-memory",
    });
    expect(result.kin).toMatchObject({
      kinIdInput: "state-kin",
      setKinIdInput: "action-kin",
    });
    expect(result.usage).toEqual({
      usageLabel: "service-usage",
    });
    expect(result.reset).toEqual({
      resetAll: "action-reset",
    });
  });
});
