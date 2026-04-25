import { describe, expect, it } from "vitest";
import {
  buildSendToGptFlowPreparedPhase,
  buildSendToGptFlowStepArgs,
  buildPreparedSendToGptRequestBundle,
  buildSendToGptExecutionBundle,
} from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import {
  buildPreparedRequestArtifactBase,
  buildPreparedRequestExecutionFields,
  buildPreparedRequestFinalizeFields,
  buildPreparedRequestGateFields,
} from "@/lib/app/send-to-gpt/sendToGptFlowRequestPreparationBuilders";
import {
  buildChatApiSearchRequestPayload,
  buildGptAssistantRequestArgs,
} from "@/lib/app/send-to-gpt/sendToGptFlowRequestBuilders";

describe("sendToGptFlow step builders", () => {
  it("builds the send-to-gpt execution bundle from prepared request sections", () => {
    const result = buildSendToGptExecutionBundle({
      flowArgs: {
        gptInput: "hello",
        gptLoading: false,
        processMultipartTaskDoneText: () => null,
        reasoningMode: "strict",
        taskProtocolRuntime: {} as never,
        currentTaskId: "TASK-1",
        findPendingRequest: () => null,
        applyPrefixedTaskFieldsFromText: () => ({}),
        getProtocolLimitViolation: () => null,
        shouldInjectTaskContextWithSettings: () => false,
        referenceLibraryItems: [],
        libraryIndexResponseCount: 10,
        buildLibraryReferenceContext: () => "",
        taskProtocolAnswerPendingRequest: () => undefined,
        ingestProtocolMessage: () => undefined,
        searchMode: "normal",
        searchEngines: ["google_search"],
        searchLocation: "Japan",
        parseWrappedSearchResponse: () => null,
        recordSearchContext: () => ({ rawResultId: "RAW-1" }),
        getContinuationTokenForSeries: () => "",
        getAskAiModeLinkForQuery: () => "",
        applySearchUsage: () => undefined,
        applyChatUsage: () => undefined,
        handleGptMemory: async () => ({ compressionUsage: null }),
        applyCompressionUsage: () => undefined,
        chatRecentLimit: 4,
        gptStateRef: {
          current: {
            recentMessages: [{ id: "a1", role: "gpt", text: "older" }],
            memory: {
              facts: [],
              preferences: [],
              lists: {},
              context: {
                currentTopic: "topic-a",
              },
            },
          },
        },
        setGptMessages: () => undefined,
        setGptInput: () => undefined,
        setGptLoading: () => undefined,
        setKinInput: () => undefined,
        setPendingKinInjectionBlocks: () => undefined,
        setPendingKinInjectionIndex: () => undefined,
        setActiveTabToKin: () => undefined,
        recordIngestedDocument: () => ({ id: "DOC-1" }),
        extractInlineUrlTarget: () => null,
        shouldRespondToTaskDirectiveOnlyInput: () => false,
        taskDirectiveOnlyResponseText: "task-only",
      },
      preparedRequest: {
        userMsg: { id: "u1", role: "user", text: "hello" },
      } as never,
      executionContext: {
        finalRequestText: "final text",
        storedDocumentContext: "doc ctx",
        storedLibraryContext: "lib ctx",
        effectiveParsedSearchQuery: "query",
        effectiveSearchMode: "normal",
        effectiveSearchEngines: ["google_search"],
        effectiveSearchLocation: "Japan",
      },
    });

    expect(result.requestStartArgs.userMessage).toEqual({
      id: "u1",
      role: "user",
      text: "hello",
    });
    expect(result.memoryContext.recentWithUser).toEqual([
      { id: "a1", role: "gpt", text: "older" },
      { id: "u1", role: "user", text: "hello" },
    ]);
    expect(result.assistantRequestArgs).toMatchObject({
      finalRequestText: "final text",
      storedDocumentContext: "doc ctx",
      storedLibraryContext: "lib ctx",
      effectiveParsedSearchQuery: "query",
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
      currentTaskId: "TASK-1",
    });
  });

  it("builds shared step args for the top-level send-to-gpt flow", () => {
    const taskDirectiveOnlyResponseText = "task-only";

    const result = buildSendToGptFlowStepArgs({
      gptInput: "hello",
      gptLoading: false,
      processMultipartTaskDoneText: () => null,
      reasoningMode: "strict",
      taskProtocolRuntime: {} as never,
      currentTaskId: "TASK-1",
      findPendingRequest: () => null,
      applyPrefixedTaskFieldsFromText: () => ({}),
      getProtocolLimitViolation: () => null,
      shouldInjectTaskContextWithSettings: () => false,
      referenceLibraryItems: [],
      libraryIndexResponseCount: 10,
      buildLibraryReferenceContext: () => "",
      taskProtocolAnswerPendingRequest: () => undefined,
      ingestProtocolMessage: () => undefined,
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      parseWrappedSearchResponse: () => null,
      recordSearchContext: () => ({ rawResultId: "RAW-1" }),
      getContinuationTokenForSeries: () => "",
      getAskAiModeLinkForQuery: () => "",
      applySearchUsage: () => undefined,
      applyChatUsage: () => undefined,
      handleGptMemory: async () => ({ compressionUsage: null }),
      applyCompressionUsage: () => undefined,
      chatRecentLimit: 4,
      gptStateRef: { current: {} },
      setGptMessages: () => undefined,
      setGptInput: () => undefined,
      setGptLoading: () => undefined,
      setKinInput: () => undefined,
      setPendingKinInjectionBlocks: () => undefined,
      setPendingKinInjectionIndex: () => undefined,
      setActiveTabToKin: () => undefined,
      recordIngestedDocument: () => ({ id: "DOC-1" }),
      extractInlineUrlTarget: () => null,
      shouldRespondToTaskDirectiveOnlyInput: () => false,
      taskDirectiveOnlyResponseText,
    });

    expect(result.extractInlineUrlTarget("hello")).toBeNull();
    expect(
      result.shouldRespondToTaskDirectiveOnlyInput({
        parsedInput: {},
        effectiveParsedSearchQuery: "",
      })
    ).toBe(false);
    expect(result.taskDirectiveOnlyResponseText).toBe(taskDirectiveOnlyResponseText);
    expect(result.currentTaskId).toBe("TASK-1");
  });

  it("builds the prepared send-to-gpt request bundle and derived contexts together", () => {
    const result = buildPreparedSendToGptRequestBundle({
      flowArgs: {
        gptInput: "hello",
        gptLoading: false,
        processMultipartTaskDoneText: () => null,
        reasoningMode: "strict",
        taskProtocolRuntime: {
          currentTaskId: null,
          currentTaskTitle: "",
          currentTaskIntent: null,
          originalInstruction: "",
          compiledTaskPrompt: "",
          taskStatus: "idle",
          latestSummary: "",
          requirementProgress: [],
          pendingRequests: [],
          userFacingRequests: [],
          completedSearches: [],
          protocolLog: [],
        },
        currentTaskId: null,
        findPendingRequest: () => null,
        applyPrefixedTaskFieldsFromText: () => ({
          freeText: "hello",
        }),
        getProtocolLimitViolation: () => null,
        shouldInjectTaskContextWithSettings: () => false,
        referenceLibraryItems: [],
        libraryIndexResponseCount: 10,
        buildLibraryReferenceContext: () => "library ctx",
        taskProtocolAnswerPendingRequest: () => undefined,
        ingestProtocolMessage: () => undefined,
        searchMode: "normal",
        searchEngines: ["google_search"],
        searchLocation: "Japan",
        parseWrappedSearchResponse: () => null,
        recordSearchContext: () => ({ rawResultId: "RAW-1" }),
        getContinuationTokenForSeries: () => "",
        getAskAiModeLinkForQuery: () => "",
        applySearchUsage: () => undefined,
        applyChatUsage: () => undefined,
        handleGptMemory: async () => ({ compressionUsage: null }),
        applyCompressionUsage: () => undefined,
        chatRecentLimit: 4,
        gptStateRef: {
          current: {},
        },
        setGptMessages: () => undefined,
        setGptInput: () => undefined,
        setGptLoading: () => undefined,
        setKinInput: () => undefined,
        setPendingKinInjectionBlocks: () => undefined,
        setPendingKinInjectionIndex: () => undefined,
        recordIngestedDocument: () => ({ id: "DOC-1" }),
        extractInlineUrlTarget: () => null,
        shouldRespondToTaskDirectiveOnlyInput: () => false,
        taskDirectiveOnlyResponseText: "task-only",
      },
      rawText: "hello",
    });

    expect(result.preparedRequest.userMsg).toMatchObject({
      role: "user",
      text: "hello",
    });
    expect(result.preparedRequestContexts.gate.userMsg).toEqual(
      result.preparedRequest.userMsg
    );
    expect(result.preparedRequestContexts.execution).toMatchObject({
      finalRequestText: "hello",
      storedLibraryContext: "library ctx",
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
    });
    expect(result.preparedRequestContexts.finalize).toMatchObject({
      finalRequestText: "hello",
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
    });
  });

  it("builds the prepared send-to-gpt flow phase from shared step args", () => {
    const flowArgs = buildSendToGptFlowStepArgs({
      gptInput: "hello",
      gptLoading: false,
      processMultipartTaskDoneText: () => null,
      reasoningMode: "strict",
      taskProtocolRuntime: {
        currentTaskId: null,
        currentTaskTitle: "",
        currentTaskIntent: null,
        originalInstruction: "",
        compiledTaskPrompt: "",
        taskStatus: "idle",
        latestSummary: "",
        requirementProgress: [],
        pendingRequests: [],
        userFacingRequests: [],
        completedSearches: [],
        protocolLog: [],
      },
      currentTaskId: null,
      findPendingRequest: () => null,
      applyPrefixedTaskFieldsFromText: () => ({
        freeText: "hello",
      }),
      getProtocolLimitViolation: () => null,
      shouldInjectTaskContextWithSettings: () => false,
      referenceLibraryItems: [],
      libraryIndexResponseCount: 10,
      buildLibraryReferenceContext: () => "library ctx",
      taskProtocolAnswerPendingRequest: () => undefined,
      ingestProtocolMessage: () => undefined,
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      parseWrappedSearchResponse: () => null,
      recordSearchContext: () => ({ rawResultId: "RAW-1" }),
      getContinuationTokenForSeries: () => "",
      getAskAiModeLinkForQuery: () => "",
      applySearchUsage: () => undefined,
      applyChatUsage: () => undefined,
      handleGptMemory: async () => ({ compressionUsage: null }),
      applyCompressionUsage: () => undefined,
      chatRecentLimit: 4,
      gptStateRef: {
        current: {
          recentMessages: [],
          memory: {
            facts: [],
            preferences: [],
            lists: {},
            context: {
              currentTopic: "topic-a",
            },
          },
        },
      },
      setGptMessages: () => undefined,
      setGptInput: () => undefined,
      setGptLoading: () => undefined,
      setKinInput: () => undefined,
      setPendingKinInjectionBlocks: () => undefined,
      setPendingKinInjectionIndex: () => undefined,
      setActiveTabToKin: () => undefined,
      recordIngestedDocument: () => ({ id: "DOC-1" }),
      extractInlineUrlTarget: () => null,
      shouldRespondToTaskDirectiveOnlyInput: () => false,
      taskDirectiveOnlyResponseText: "task-only",
    });

    const result = buildSendToGptFlowPreparedPhase({
      flowArgs,
      rawText: "hello",
    });

    expect(result.prePreparationGateArgs.rawText).toBe("hello");
    expect(result.preparedRequestGateArgs.preparedRequest).toMatchObject({
      effectiveParsedSearchQuery: "",
      userMsg: expect.objectContaining({
        role: "user",
        text: "hello",
      }),
    });
    expect(result.preparedRequestBundle.preparedRequestContexts.execution).toMatchObject({
      finalRequestText: "hello",
      storedLibraryContext: "library ctx",
      effectiveSearchMode: "normal",
    });
    expect(result.executionBundle.assistantRequestArgs).toMatchObject({
      finalRequestText: "hello",
      storedLibraryContext: "library ctx",
      effectiveSearchMode: "normal",
      currentTaskId: null,
    });
  });

  it("builds prepared request sections from a shared prepared-request source", () => {
    const preparedRequest = buildPreparedRequestArtifactBase({
      derivedContext: {
        parsedInput: { freeText: "hello" },
        effectiveParsedSearchQuery: "query",
        continuationDetails: { cleanQuery: "query" },
        effectiveSearchMode: "normal",
        effectiveSearchEngines: ["google_search"],
        effectiveSearchLocation: "Japan",
      } as never,
      rawText: "hello",
      currentTaskId: null,
      taskProtocolRuntime: {
        currentTaskId: null,
        currentTaskTitle: "",
        currentTaskIntent: null,
        originalInstruction: "",
        compiledTaskPrompt: "",
        taskStatus: "idle",
        latestSummary: "",
        requirementProgress: [],
        pendingRequests: [],
        userFacingRequests: [],
        completedSearches: [],
        protocolLog: [],
      },
      shouldInjectTaskContextWithSettings: () => false,
      referenceLibraryItems: [],
      libraryIndexResponseCount: 10,
      createUserMessage: (text) => ({ id: "u1", role: "user", text }),
      buildLibraryReferenceContext: () => "library ctx",
      buildLimitViolation: () => null,
    });

    expect(buildPreparedRequestGateFields(preparedRequest)).toMatchObject({
      parsedInput: { freeText: "hello" },
      effectiveParsedSearchQuery: "query",
      userMsg: { id: "u1", role: "user", text: "hello" },
    });

    const execution = buildPreparedRequestExecutionFields(preparedRequest);
    expect(execution).toMatchObject({
      storedLibraryContext: "library ctx",
      cleanQuery: "query",
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
    });
    expect(execution.finalRequestText).toContain("query");
    expect(execution.finalRequestText).toContain("hello");

    expect(buildPreparedRequestFinalizeFields(execution)).toMatchObject({
      cleanQuery: "query",
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
    });
  });

  it("builds request payload args and chat api request payload through request builders", () => {
    const requestArgs = buildGptAssistantRequestArgs({
      requestMemory: { facts: [] } as never,
      recentMessages: [],
      finalRequestText: "hello",
      storedDocumentContext: "doc ctx",
      storedLibraryContext: "lib ctx",
      cleanQuery: "farmers 360",
      searchRequestEvent: { query: "fallback query" },
      effectiveParsedSearchQuery: "parsed query",
      searchSeriesId: "SERIES-1",
      continuationToken: "TOKEN-1",
      askAiModeLink: "LINK-1",
      effectiveSearchMode: "ai",
      effectiveSearchEngines: ["google_ai_mode"],
      effectiveSearchLocation: "Japan",
      instructionMode: "normal",
      reasoningMode: "strict",
      parseWrappedSearchResponse: () => null,
      recordSearchContext: () => ({ rawResultId: "RAW-1" }),
    } as never);

    expect(requestArgs).toMatchObject({
      finalRequestText: "hello",
      storedDocumentContext: "doc ctx",
      storedLibraryContext: "lib ctx",
      cleanQuery: "farmers 360",
      effectiveParsedSearchQuery: "parsed query",
      searchSeriesId: "SERIES-1",
      continuationToken: "TOKEN-1",
      askAiModeLink: "LINK-1",
      effectiveSearchMode: "ai",
      effectiveSearchEngines: ["google_ai_mode"],
      effectiveSearchLocation: "Japan",
    });

    expect(buildChatApiSearchRequestPayload(requestArgs)).toEqual({
      mode: "chat",
      memory: { facts: [] },
      recentMessages: [],
      input: "hello",
      storedSearchContext: "",
      storedDocumentContext: "doc ctx",
      storedLibraryContext: "lib ctx",
      forcedSearchQuery: "farmers 360",
      searchSeriesId: "SERIES-1",
      searchContinuationToken: "TOKEN-1",
      searchAskAiModeLink: "LINK-1",
      searchMode: "ai",
      searchEngines: ["google_ai_mode"],
      searchLocation: "Japan",
      instructionMode: "normal",
      reasoningMode: "strict",
    });
  });
});

