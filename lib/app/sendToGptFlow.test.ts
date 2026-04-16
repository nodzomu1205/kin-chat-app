import { afterEach, describe, expect, it, vi } from "vitest";
import { runSendToGptFlow } from "@/lib/app/sendToGptFlow";
import {
  buildNormalizedRequestText as buildEffectiveRequestText,
  buildNormalizedRequestText,
  getTaskDirectiveOnlyResponseText,
  shouldRespondToTaskDirectiveOnlyInput,
} from "@/lib/app/sendToGptText";
import {
} from "@/lib/app/sendToGptFlowRequestPreparation";
import { buildFinalRequestText } from "@/lib/app/sendToGptFlowRequestText";
import { buildChatApiRequestPayload } from "@/lib/app/sendToGptFlowRequestPayload";
import { buildAssistantResponseArtifacts } from "@/lib/app/sendToGptFlowResponse";
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
      handleGptMemory: async () => ({ summaryUsage: null }),
      applySummaryUsage: () => {},
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
      responseMode: "strict",
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
      handleGptMemory: async () => ({ summaryUsage: null }),
      applySummaryUsage: () => {},
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
      responseMode: "strict",
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
