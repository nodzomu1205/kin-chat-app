import { afterEach, describe, expect, it, vi } from "vitest";
import { runSendToGptFlow } from "@/lib/app/send-to-gpt/sendToGptFlow";
import {
  buildNormalizedRequestText as buildEffectiveRequestText,
  buildNormalizedRequestText,
  getTaskDirectiveOnlyResponseText,
  shouldRespondToTaskDirectiveOnlyInput,
} from "@/lib/app/send-to-gpt/sendToGptText";
import {
  buildPreparedRequestExecutionContext,
  buildPreparedRequestFinalizeContext,
  buildPreparedRequestGateContext,
  buildPreparedRequestContexts,
  buildPreparedFinalRequestText,
  resolvePreparedRequestLimitViolation,
} from "@/lib/app/send-to-gpt/sendToGptFlowRequestPreparation";
import { buildFinalRequestText } from "@/lib/app/send-to-gpt/sendToGptFlowRequestText";
import { buildChatApiRequestPayload } from "@/lib/app/send-to-gpt/sendToGptFlowRequestPayload";
import { buildGptAssistantRequestPayload } from "@/lib/app/send-to-gpt/sendToGptFlowRequest";
import { buildAssistantResponseArtifacts } from "@/lib/app/send-to-gpt/sendToGptFlowResponse";
import type { Message } from "@/types/chat";

describe("runSendToGptFlow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches implicit search sources to the assistant message", async () => {
    let messages: Message[] = [];
    let inputValue = "検索: 東京 天気";
    const applySearchUsage = vi.fn();
    const applyChatUsage = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          reply: "検索の結果です。",
          searchUsed: true,
          searchQuery: "東京 天気",
          searchEvidence: "raw evidence",
          sources: [
            {
              title: "Source A",
              link: "https://example.com/a",
              snippet: "snippet",
            },
          ],
        }),
      })
    );

    await runSendToGptFlow({
      gptInput: inputValue,
      gptLoading: false,
      processMultipartTaskDoneText: () => null,
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
        searchQuery: "東京 天気",
        freeText: "",
        title: "",
        userInstruction: "",
      }),
      getProtocolLimitViolation: () => null,
      shouldInjectTaskContextWithSettings: () => false,
      referenceLibraryItems: [],
      libraryIndexResponseCount: 10,
      buildLibraryReferenceContext: () => "",
      taskProtocolAnswerPendingRequest: () => {},
      ingestProtocolMessage: () => {},
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      parseWrappedSearchResponse: () => null,
      recordSearchContext: () => ({ rawResultId: "RAW-1" }),
      getContinuationTokenForSeries: () => "",
      getAskAiModeLinkForQuery: () => "",
      applySearchUsage,
      applyChatUsage,
      handleGptMemory: async () => ({ compressionUsage: null }),
      applyCompressionUsage: () => {},
      chatRecentLimit: 8,
      gptStateRef: {
        current: {
          recentMessages: [],
          memory: {
            facts: [],
            preferences: [],
            lists: {},
            context: {
              currentTopic: "",
              currentTask: "",
              followUpRule: "",
              lastUserIntent: "",
            },
          },
        },
      },
      setGptMessages: (next) => {
        messages = typeof next === "function" ? next(messages) : next;
      },
      setGptInput: (next) => {
        inputValue = typeof next === "function" ? next(inputValue) : next;
      },
      setGptLoading: () => {},
      setKinInput: () => {},
      setPendingKinInjectionBlocks: () => {},
      setPendingKinInjectionIndex: () => {},
      setActiveTabToKin: undefined,
      instructionMode: "normal",
      reasoningMode: "strict",
      recordIngestedDocument: (document) => ({
        id: "DOC-1",
        sourceType: "ingested_file",
        ...document,
      }),
    });

    const assistantMessage = messages[messages.length - 1];
    expect(assistantMessage.role).toBe("gpt");
    expect(assistantMessage.meta?.sourceType).toBe("search");
    expect(assistantMessage.sources).toEqual([
      {
        title: "Source A",
        link: "https://example.com/a",
        snippet: "snippet",
        sourceType: undefined,
        publishedAt: undefined,
        thumbnailUrl: undefined,
        channelName: undefined,
        duration: undefined,
        viewCount: undefined,
        videoId: undefined,
      },
    ]);
    expect(applySearchUsage).toHaveBeenCalled();
    expect(applyChatUsage).not.toHaveBeenCalled();
  });

  it("short-circuits task-directive-only input without calling GPT", async () => {
    let messages: Message[] = [];
    let inputValue = "TITLE: 新しい計画";
    const fetchSpy = vi.fn();

    vi.stubGlobal("fetch", fetchSpy);

    await runSendToGptFlow({
      gptInput: inputValue,
      gptLoading: false,
      processMultipartTaskDoneText: () => null,
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
        title: "新しい計画",
        userInstruction: "段取りを整理する",
        freeText: "",
      }),
      getProtocolLimitViolation: () => null,
      shouldInjectTaskContextWithSettings: () => false,
      referenceLibraryItems: [],
      libraryIndexResponseCount: 10,
      buildLibraryReferenceContext: () => "",
      taskProtocolAnswerPendingRequest: () => {},
      ingestProtocolMessage: () => {},
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      parseWrappedSearchResponse: () => null,
      recordSearchContext: () => ({ rawResultId: "RAW-1" }),
      getContinuationTokenForSeries: () => "",
      getAskAiModeLinkForQuery: () => "",
      applySearchUsage: () => {},
      applyChatUsage: () => {},
      handleGptMemory: async () => ({ compressionUsage: null }),
      applyCompressionUsage: () => {},
      chatRecentLimit: 8,
      gptStateRef: {
        current: {
          recentMessages: [],
          memory: {
            facts: [],
            preferences: [],
            lists: {},
            context: {
              currentTopic: "",
              currentTask: "",
              followUpRule: "",
              lastUserIntent: "",
            },
          },
        },
      },
      setGptMessages: (next) => {
        messages = typeof next === "function" ? next(messages) : next;
      },
      setGptInput: (next) => {
        inputValue = typeof next === "function" ? next(inputValue) : next;
      },
      setGptLoading: () => {},
      setKinInput: () => {},
      setPendingKinInjectionBlocks: () => {},
      setPendingKinInjectionIndex: () => {},
      setActiveTabToKin: undefined,
      instructionMode: "normal",
      reasoningMode: "strict",
      recordIngestedDocument: (document) => ({
        id: "DOC-1",
        sourceType: "ingested_file",
        ...document,
      }),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(messages).toEqual([
      expect.objectContaining({
        role: "gpt",
        text: getTaskDirectiveOnlyResponseText(),
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      }),
    ]);
    expect(inputValue).toBe("");
  });
});

describe("sendToGptFlowHelpers", () => {
  it("builds normalized request text from the effective search query", () => {
    const params = {
      rawText: "元の入力",
      parsedInput: {
        searchQuery: "古い検索",
        freeText: "本文",
      },
      effectiveParsedSearchQuery: "新しい検索",
    };

    expect(buildEffectiveRequestText(params)).toContain("検索: 新しい検索");
  });

  it("detects task-directive-only input", () => {
    expect(
      shouldRespondToTaskDirectiveOnlyInput({
        parsedInput: {
          title: "調査タスク",
          userInstruction: "要点だけ整理",
          freeText: "",
        },
        effectiveParsedSearchQuery: "",
      })
    ).toBe(true);

    expect(
      shouldRespondToTaskDirectiveOnlyInput({
        parsedInput: {
          title: "調査タスク",
          userInstruction: "要点だけ整理",
          freeText: "追加メモあり",
        },
        effectiveParsedSearchQuery: "",
      })
    ).toBe(false);
  });

  it("builds final request text with protocol override and task context", () => {
    expect(
      buildFinalRequestText({
        rawText: "plain input",
        parsedInput: {
          freeText: "free text",
        },
        effectiveParsedSearchQuery: "",
        askGptEvent: {
          taskId: "TASK-1",
          actionId: "ACT-1",
          body: "Need answer",
        },
        effectiveSearchEngines: ["google_search"],
        effectiveSearchLocation: "Japan",
        referenceLibraryItems: [],
        libraryIndexResponseCount: 10,
        taskContext: "TASK CONTEXT",
      })
    ).toContain("TASK CONTEXT\n\nYou are responding to a Kindroid SYS_ASK_GPT request.");
  });

  it("includes the referenced draft body for draft modification requests", () => {
    const requestText = buildFinalRequestText({
      rawText: `<<SYS_DRAFT_MODIFICATION_REQUEST>>
TASK_ID: TASK-1
ACTION_ID: D002
DOCUMENT ID: Unknown
RESPONSE_MODE: full
BODY: Tighten the conclusion.
<<END_SYS_DRAFT_MODIFICATION_REQUEST>>`,
      parsedInput: {
        freeText: "",
      },
      effectiveParsedSearchQuery: "",
      draftModificationRequestEvent: {
        taskId: "TASK-1",
        actionId: "D002",
        documentId: "Unknown",
        responseMode: "full",
        body: "Tighten the conclusion.",
      },
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
      referenceLibraryItems: [],
      libraryIndexResponseCount: 10,
      recentMessages: [
        {
          id: "draft-1",
          role: "gpt",
          text: `<<SYS_DRAFT_PREPARATION_RESPONSE>>
TASK_ID: TASK-1
ACTION_ID: D001
DOCUMENT_ID: DOC-TASK-1-001
TITLE: Market memo
BODY: Existing full draft body.
<<END_SYS_DRAFT_PREPARATION_RESPONSE>>`,
        },
      ],
    });

    expect(requestText).toContain("<<SYS_DRAFT_MODIFICATION_RESPONSE>>");
    expect(requestText).toContain("DOCUMENT_ID: DOC-TASK-1-001");
    expect(requestText).toContain("Current document:");
    expect(requestText).toContain("TITLE: Market memo");
    expect(requestText).toContain("Existing full draft body.");
  });

  it("builds prepared final request text from derived request context", () => {
    expect(
      buildPreparedFinalRequestText({
        rawText: "plain input",
        currentTaskId: "TASK-1",
        taskContext: "TASK CONTEXT",
        derivedContext: {
          parsedInput: {
            freeText: "free text",
          },
          effectiveParsedSearchQuery: "",
          askGptEvent: {
            taskId: "TASK-1",
            actionId: "ACT-1",
            body: "Need answer",
          },
          requestToAnswer: null,
          requestAnswerBody: "",
          searchRequestEvent: undefined,
          effectiveSearchEngines: ["google_search"],
          effectiveSearchLocation: "Japan",
          libraryIndexRequestEvent: undefined,
          libraryItemRequestEvent: undefined,
        } as never,
        referenceLibraryItems: [],
        libraryIndexResponseCount: 10,
      })
    ).toContain("TASK CONTEXT\n\nYou are responding to a Kindroid SYS_ASK_GPT request.");
  });

  it("resolves prepared request limit violations from the derived events", () => {
    expect(
      resolvePreparedRequestLimitViolation({
        derivedContext: {
          askGptEvent: {
            taskId: "TASK-1",
            actionId: "ACT-1",
          },
        } as never,
        currentTaskId: "TASK-1",
        getProtocolLimitViolation: ({ type, taskId, actionId }) =>
          `${type}:${taskId}:${actionId}`,
      })
    ).toBe("ask_gpt:TASK-1:ACT-1");
  });

  it("builds the gate context from a prepared request", () => {
    expect(
      buildPreparedRequestGateContext({
        preparedRequest: {
          parsedInput: { freeText: "hello" },
          effectiveParsedSearchQuery: "query",
          limitViolation: "violation",
          userMsg: { id: "u1", role: "user", text: "hello" },
          youtubeTranscriptRequestEvent: {
            type: "youtube_transcript_request",
            body: "Fetch transcript",
            url: "https://youtube.com/watch?v=1",
          },
        },
      })
    ).toEqual({
      parsedInput: { freeText: "hello" },
      effectiveParsedSearchQuery: "query",
      limitViolation: "violation",
      userMsg: { id: "u1", role: "user", text: "hello" },
      youtubeTranscriptRequestEvent: {
        type: "youtube_transcript_request",
        body: "Fetch transcript",
        url: "https://youtube.com/watch?v=1",
      },
    });
  });

  it("builds the execution context from a prepared request", () => {
    expect(
      buildPreparedRequestExecutionContext({
        preparedRequest: {
          finalRequestText: "final text",
          effectiveDocumentReferenceContext: "doc ctx",
          libraryReferenceContext: "library ctx",
          continuationDetails: { cleanQuery: "farmers 360" },
          searchRequestEvent: { query: "farmers 360" },
          effectiveParsedSearchQuery: "farmers 360",
          searchSeriesId: "SERIES-1",
          continuationToken: "TOKEN-1",
          askAiModeLink: "LINK-1",
          effectiveSearchMode: "ai",
          effectiveSearchEngines: ["google_ai_mode"],
          effectiveSearchLocation: "Japan",
          askGptEvent: { taskId: "TASK-1", actionId: "A001" },
          requestToAnswer: {
            id: "REQ-1",
            taskId: "TASK-1",
            actionId: "Q001",
            body: "question",
          },
          requestAnswerBody: "answer",
        },
      })
    ).toEqual({
      finalRequestText: "final text",
      storedDocumentContext: "doc ctx",
      storedLibraryContext: "library ctx",
      cleanQuery: "farmers 360",
      searchRequestEvent: { query: "farmers 360" },
      effectiveParsedSearchQuery: "farmers 360",
      searchSeriesId: "SERIES-1",
      continuationToken: "TOKEN-1",
      askAiModeLink: "LINK-1",
      effectiveSearchMode: "ai",
      effectiveSearchEngines: ["google_ai_mode"],
      effectiveSearchLocation: "Japan",
      askGptEvent: { taskId: "TASK-1", actionId: "A001" },
      requestToAnswer: {
        id: "REQ-1",
        taskId: "TASK-1",
        actionId: "Q001",
        body: "question",
      },
      requestAnswerBody: "answer",
    });
  });

  it("builds the finalize context from the execution context", () => {
    expect(
      buildPreparedRequestFinalizeContext({
        preparedRequest: {
          finalRequestText: "final text",
          storedDocumentContext: "doc ctx",
          storedLibraryContext: "library ctx",
          cleanQuery: "farmers 360",
          searchRequestEvent: { query: "farmers 360" },
          effectiveParsedSearchQuery: "farmers 360",
          searchSeriesId: "SERIES-1",
          continuationToken: "TOKEN-1",
          askAiModeLink: "LINK-1",
          effectiveSearchMode: "ai",
          effectiveSearchEngines: ["google_ai_mode"],
          effectiveSearchLocation: "Japan",
          askGptEvent: { taskId: "TASK-1", actionId: "A001" },
          requestToAnswer: {
            id: "REQ-1",
            taskId: "TASK-1",
            actionId: "Q001",
            body: "question",
          },
          requestAnswerBody: "answer",
        },
      })
    ).toEqual({
      searchRequestEvent: { query: "farmers 360" },
      effectiveSearchMode: "ai",
      effectiveSearchEngines: ["google_ai_mode"],
      effectiveSearchLocation: "Japan",
      searchSeriesId: "SERIES-1",
      cleanQuery: "farmers 360",
      effectiveParsedSearchQuery: "farmers 360",
      finalRequestText: "final text",
      requestToAnswer: {
        id: "REQ-1",
        taskId: "TASK-1",
        actionId: "Q001",
        body: "question",
      },
      requestAnswerBody: "answer",
    });
  });

  it("builds the full prepared-request context bundle", () => {
    expect(
      buildPreparedRequestContexts({
        preparedRequest: {
          parsedInput: { freeText: "hello" },
          effectiveParsedSearchQuery: "farmers 360",
          limitViolation: null,
          userMsg: { id: "u1", role: "user", text: "hello" },
          youtubeTranscriptRequestEvent: undefined,
          finalRequestText: "final text",
          effectiveDocumentReferenceContext: "doc ctx",
          libraryReferenceContext: "library ctx",
          continuationDetails: { cleanQuery: "farmers 360" },
          searchRequestEvent: { query: "farmers 360" },
          searchSeriesId: "SERIES-1",
          continuationToken: "TOKEN-1",
          askAiModeLink: "LINK-1",
          effectiveSearchMode: "ai",
          effectiveSearchEngines: ["google_ai_mode"],
          effectiveSearchLocation: "Japan",
          askGptEvent: { taskId: "TASK-1", actionId: "A001" },
          requestToAnswer: {
            id: "REQ-1",
            taskId: "TASK-1",
            actionId: "Q001",
            body: "question",
          },
          requestAnswerBody: "answer",
        },
      })
    ).toEqual({
      gate: {
        parsedInput: { freeText: "hello" },
        effectiveParsedSearchQuery: "farmers 360",
        limitViolation: null,
        userMsg: { id: "u1", role: "user", text: "hello" },
        youtubeTranscriptRequestEvent: undefined,
      },
      execution: {
        finalRequestText: "final text",
        storedDocumentContext: "doc ctx",
        storedLibraryContext: "library ctx",
        cleanQuery: "farmers 360",
        searchRequestEvent: { query: "farmers 360" },
        effectiveParsedSearchQuery: "farmers 360",
        searchSeriesId: "SERIES-1",
        continuationToken: "TOKEN-1",
        askAiModeLink: "LINK-1",
        effectiveSearchMode: "ai",
        effectiveSearchEngines: ["google_ai_mode"],
        effectiveSearchLocation: "Japan",
        askGptEvent: { taskId: "TASK-1", actionId: "A001" },
        requestToAnswer: {
          id: "REQ-1",
          taskId: "TASK-1",
          actionId: "Q001",
          body: "question",
        },
        requestAnswerBody: "answer",
      },
      finalize: {
        searchRequestEvent: { query: "farmers 360" },
        effectiveSearchMode: "ai",
        effectiveSearchEngines: ["google_ai_mode"],
        effectiveSearchLocation: "Japan",
        searchSeriesId: "SERIES-1",
        cleanQuery: "farmers 360",
        effectiveParsedSearchQuery: "farmers 360",
        finalRequestText: "final text",
        requestToAnswer: {
          id: "REQ-1",
          taskId: "TASK-1",
          actionId: "Q001",
          body: "question",
        },
        requestAnswerBody: "answer",
      },
    });
  });

  it("builds normalized request text from the resolved search query", () => {
    expect(
      buildNormalizedRequestText({
        rawText: "plain input",
        parsedInput: {
          searchQuery: "older query",
          freeText: "body text",
        },
        effectiveParsedSearchQuery: "newer query",
      })
    ).toContain("検索: newer query");
  });

  it("builds chat api request payload without empty optional fields", () => {
    expect(
      buildChatApiRequestPayload({
        requestMemory: { facts: [] },
        recentMessages: [],
        input: "hello",
        storedLibraryContext: "",
        searchMode: "normal",
        searchEngines: ["google_search"],
        searchLocation: "Japan",
        instructionMode: "normal",
        reasoningMode: "strict",
      })
    ).toEqual({
      mode: "chat",
      memory: { facts: [] },
      recentMessages: [],
      input: "hello",
      storedSearchContext: "",
      storedDocumentContext: "",
      storedLibraryContext: "",
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      instructionMode: "normal",
      reasoningMode: "strict",
    });
  });

  it("builds the GPT assistant request payload from execution context inputs", () => {
    expect(
      buildGptAssistantRequestPayload({
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
      })
    ).toEqual({
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

  it("builds assistant response artifacts for implicit search responses", () => {
    expect(
      buildAssistantResponseArtifacts({
        data: {
          reply: "search reply",
          searchUsed: true,
          sources: [
            {
              title: "Source A",
              link: "https://example.com/a",
            },
          ],
        },
        parseWrappedSearchResponse: () => null,
        effectiveSearchMode: "normal",
        effectiveSearchEngines: ["google_search"],
        effectiveSearchLocation: "Japan",
        recordSearchContext: () => ({ rawResultId: "RAW-1" }),
      })
    ).toEqual({
      assistantText: "search reply",
      normalizedSources: [
        {
          title: "Source A",
          link: "https://example.com/a",
          snippet: undefined,
          sourceType: undefined,
          publishedAt: undefined,
          thumbnailUrl: undefined,
          channelName: undefined,
          duration: undefined,
          viewCount: undefined,
          videoId: undefined,
        },
      ],
    });
  });
});
