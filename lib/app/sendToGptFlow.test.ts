import { afterEach, describe, expect, it, vi } from "vitest";
import { runSendToGptFlow } from "@/lib/app/sendToGptFlow";
import type { Message } from "@/types/chat";

describe("runSendToGptFlow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches implicit search sources to the assistant message", async () => {
    let messages: Message[] = [];
    let inputValue = "検索：東京 賃貸";
    const applySearchUsage = vi.fn();
    const applyChatUsage = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          reply: "検索の要約です。",
          searchUsed: true,
          searchQuery: "東京 賃貸",
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
      findPendingRequest: () => null,
      applyPrefixedTaskFieldsFromText: () => ({
        searchQuery: "東京 賃貸",
        freeText: "",
        title: "",
        userInstruction: "",
      }),
      buildLibraryReferenceContext: () => "",
      referenceLibraryItems: [],
      libraryIndexResponseCount: 10,
      getProtocolLimitViolation: () => null,
      shouldInjectTaskContextWithSettings: () => false,
      parseWrappedSearchResponse: () => null,
      getProvisionalMemory: () => ({}),
      currentTaskTitle: undefined,
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      activeDocumentTitle: undefined,
      lastSearchQuery: undefined,
      handleGptMemory: async () => ({ summaryUsage: null }),
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
      setGptState: () => {},
      setKinInput: () => {},
      setPendingKinInjectionBlocks: () => {},
      setPendingKinInjectionIndex: () => {},
      setActiveTabToKin: undefined,
      instructionMode: "normal",
      responseMode: "strict",
      currentTaskId: null,
      recordIngestedDocument: (document) => ({
        id: "DOC-1",
        sourceType: "ingested_file",
        ...document,
      }),
      taskProtocolAnswerPendingRequest: () => {},
      ingestProtocolMessage: () => {},
      recordSearchContext: () => ({ rawResultId: "RAW-1" }),
      getContinuationTokenForSeries: () => "",
      getAskAiModeLinkForQuery: () => "",
      applySearchUsage,
      applyChatUsage,
      applySummaryUsage: () => {},
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
});
