import { describe, expect, it } from "vitest";
import {
  appendSendToGptFailureMessage,
  applySendToGptRequestStart,
  applyProtocolAssistantSideEffects,
  appendRecentAssistantMessage,
  createGptAssistantMessage,
  handleImplicitSearchArtifacts,
  prepareSendToGptMemoryContext,
  resolveMemoryUpdateContext,
} from "@/lib/app/sendToGptFlowState";
import {
  buildInlineUrlGateContext,
  buildMultipartImportGateContext,
  buildProtocolLimitViolationGateContext,
  buildTaskDirectiveOnlyGateContext,
  buildYoutubeTranscriptGateContext,
} from "@/lib/app/sendToGptFlowGuards";
import {
  buildProtocolSearchResponseArtifacts,
  wrapProtocolAssistantText,
} from "@/lib/app/sendToGptFlowResponse";
import {
  applyExplicitSearchUsageAfterFinalize,
  applyFinalizeMemoryFollowUp,
} from "@/lib/app/sendToGptFlowFinalize";
import type { Message } from "@/types/chat";

describe("sendToGptFlowHelpers", () => {
  it("wraps assistant text in SYS_GPT_RESPONSE for ask_gpt events", () => {
    const result = wrapProtocolAssistantText({
      assistantText: "Working on it.",
      askGptEvent: {
        taskId: "123456",
        actionId: "A001",
      },
      currentTaskId: "123456",
    });

    expect(result).toContain("<<SYS_GPT_RESPONSE>>");
    expect(result).toContain("TASK_ID: 123456");
    expect(result).toContain("ACTION_ID: A001");
  });

  it("wraps assistant text in SYS_USER_RESPONSE when answering a pending request", () => {
    const result = wrapProtocolAssistantText({
      assistantText: "Here is the answer.",
      requestToAnswer: {
        id: "REQ1",
        taskId: "123456",
        actionId: "Q001",
        body: "Need clarification",
      },
      requestAnswerBody: "User answered",
    });

    expect(result).toContain("<<SYS_USER_RESPONSE>>");
    expect(result).toContain("TASK_ID: 123456");
    expect(result).toContain("ACTION_ID: Q001");
  });

  it("does not double-wrap an already wrapped SYS_GPT_RESPONSE", () => {
    const initial = [
      "<<SYS_GPT_RESPONSE>>",
      "TASK_ID: 123456",
      "ACTION_ID: A001",
      "BODY: Already wrapped",
      "<<END_SYS_GPT_RESPONSE>>",
    ].join("\n");

    const result = wrapProtocolAssistantText({
      assistantText: initial,
      askGptEvent: {
        taskId: "123456",
        actionId: "A001",
      },
      currentTaskId: "123456",
    });

    expect(result).toBe(initial);
  });

  it("builds search response artifacts for youtube search with source details", () => {
    const recordSearchContext = ({ query }: { query: string }) => ({
      rawResultId: `RAW-${query}`,
    });

    const result = buildProtocolSearchResponseArtifacts({
      data: {
        reply: "Search summary here.",
        searchUsed: true,
        searchQuery: "popular female YouTubers",
        searchEvidence: "Long raw evidence text",
        sources: [
          {
            title: "Video A",
            link: "https://youtube.com/watch?v=abc",
            channelName: "Channel A",
            duration: "12:34",
            viewCount: "12345",
          },
        ],
      },
      searchRequestEvent: {
        taskId: "123456",
        actionId: "S001",
        query: "popular female YouTubers",
        searchEngine: "youtube_search",
        searchLocation: "Japan",
        outputMode: "summary",
      },
      currentTaskId: "123456",
      wrappedSearchResponse: null,
      effectiveSearchMode: "youtube",
      effectiveSearchEngines: ["youtube_search"],
      effectiveSearchLocation: "Japan",
      cleanQuery: "popular female YouTubers",
      recordSearchContext,
    });

    expect(result.normalizedSources).toHaveLength(1);
    expect(result.assistantText).toContain("<<SYS_SEARCH_RESPONSE>>");
    expect(result.assistantText).toContain("ENGINE: youtube_search");
    expect(result.assistantText).toContain("SOURCES:");
    expect(result.assistantText).toContain("Channel: Channel A");
    expect(result.assistantText).toContain("Duration: 12:34");
    expect(result.assistantText).toContain("12,345 views");
  });

  it("keeps summary fallback when search summary text is missing", () => {
    const result = buildProtocolSearchResponseArtifacts({
      data: {
        reply: "",
        searchUsed: false,
        searchEvidence: "",
        sources: [],
      },
      searchRequestEvent: {
        taskId: "123456",
        actionId: "S002",
        query: "example query",
        searchEngine: "google_search",
        searchLocation: "Japan",
        outputMode: "summary",
      },
      currentTaskId: "123456",
      wrappedSearchResponse: null,
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
      cleanQuery: "example query",
      recordSearchContext: () => ({ rawResultId: "RAW-unused" }),
    });

    expect(result.assistantText).toContain(
      "Search completed, but no summary text was returned."
    );
    expect(result.assistantText).toContain("RAW_RESULT_AVAILABLE: NO");
  });

  it("records implicit search context and applies search usage when search ran outside protocol mode", () => {
    const calls: string[] = [];

    handleImplicitSearchArtifacts({
      data: {
        reply: "Implicit search summary",
        searchUsed: true,
        searchQuery: "tokyo housing",
        searchEvidence: "raw evidence",
        searchSeriesId: "SERIES1",
        searchContinuationToken: "NEXT1",
        sources: [{ title: "Source A", link: "https://example.com" }],
      },
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
      searchSeriesId: "SERIES-FALLBACK",
      cleanQuery: "clean query",
      effectiveParsedSearchQuery: "parsed query",
      finalRequestText: "request text",
      applySearchUsage: () => calls.push("search"),
      applyChatUsage: () => calls.push("chat"),
      recordSearchContext: ({ query, sources }) => {
        calls.push(`record:${query}:${sources.length}`);
        return { rawResultId: "RAW-1" };
      },
    });

    expect(calls).toEqual(["search", "record:tokyo housing:1"]);
  });

  it("applies chat usage when no implicit search ran", () => {
    const calls: string[] = [];

    handleImplicitSearchArtifacts({
      data: {
        reply: "Normal assistant reply",
        searchUsed: false,
      },
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
      cleanQuery: "",
      effectiveParsedSearchQuery: "",
      finalRequestText: "request text",
      applySearchUsage: () => calls.push("search"),
      applyChatUsage: () => calls.push("chat"),
      recordSearchContext: () => {
        calls.push("record");
        return { rawResultId: "RAW-2" };
      },
    });

    expect(calls).toEqual(["chat"]);
  });

  it("applies protocol assistant side effects for ingest and pending request answer", () => {
    const calls: string[] = [];

    applyProtocolAssistantSideEffects({
      assistantText: "Wrapped protocol response",
      ingestProtocolMessage: (text, direction) => {
        calls.push(`ingest:${direction}:${text}`);
      },
      requestToAnswer: {
        id: "REQ1",
        taskId: "123456",
        actionId: "Q001",
        body: "Need clarification",
      },
      requestAnswerBody: "Here is the answer",
      taskProtocolAnswerPendingRequest: (requestId, answerText) => {
        calls.push(`answer:${requestId}:${answerText}`);
      },
    });

    expect(calls).toEqual([
      "ingest:gpt_to_kin:Wrapped protocol response",
      "answer:REQ1:Here is the answer",
    ]);
  });

  it("builds memory update context from the current GPT state snapshot", () => {
    const userMessage = {
      id: "u1",
      role: "user" as const,
      text: "latest user turn",
    };

    const result = resolveMemoryUpdateContext({
      gptState: {
        recentMessages: [
          {
            id: "a1",
            role: "gpt",
            text: "older assistant turn",
          },
        ],
        memory: {
          context: {
            currentTopic: "topic-a",
          },
        },
      },
      userMessage,
      chatRecentLimit: 5,
    });

    expect(result.recentWithUser).toEqual([
      {
        id: "a1",
        role: "gpt",
        text: "older assistant turn",
      },
      userMessage,
    ]);
    expect(result.previousCommittedTopic).toBe("topic-a");
  });

  it("prepares the memory context and request memory together", () => {
    const result = prepareSendToGptMemoryContext({
      gptState: {
        recentMessages: [{ id: "a1", role: "gpt", text: "older assistant turn" }],
        memory: {
          facts: [],
          preferences: [],
          lists: {},
          context: {
            currentTopic: "topic-a",
          },
        } as never,
      },
      userMessage: { id: "u1", role: "user", text: "latest user turn" },
      chatRecentLimit: 5,
    });

    expect(result.memoryContext.previousCommittedTopic).toBe("topic-a");
    expect(result.memoryContext.recentWithUser).toHaveLength(2);
    expect(result.requestMemory).toMatchObject({
      context: {
        currentTopic: "topic-a",
      },
    });
  });

  it("appends the assistant message while preserving the recent-message limit", () => {
    const updated = appendRecentAssistantMessage({
      recentMessages: [
        { id: "1", role: "user", text: "u1" },
        { id: "2", role: "gpt", text: "a1" },
      ],
      assistantMessage: { id: "3", role: "gpt", text: "a2" },
      chatRecentLimit: 2,
    });

    expect(updated).toEqual([
      { id: "2", role: "gpt", text: "a1" },
      { id: "3", role: "gpt", text: "a2" },
    ]);
  });

  it("builds a GPT assistant message with shared metadata", () => {
    const message = createGptAssistantMessage({
      assistantText: "Done",
      sourceType: "manual",
      kind: "task_info",
    });

    expect(message.role).toBe("gpt");
    expect(message.text).toBe("Done");
    expect(message.meta).toEqual({
      kind: "task_info",
      sourceType: "manual",
    });
  });

  it("applies the request-start state updates together", () => {
    let messages: Message[] = [{ id: "a1", role: "gpt", text: "older" }];
    let input = "draft";
    let loading = false;

    applySendToGptRequestStart({
      userMessage: { id: "u1", role: "user", text: "latest" },
      setGptMessages: (next) => {
        messages = typeof next === "function" ? next(messages) : next;
      },
      setGptInput: (next) => {
        input = typeof next === "function" ? next(input) : next;
      },
      setGptLoading: (next) => {
        loading = typeof next === "function" ? next(loading) : next;
      },
    });

    expect(messages).toEqual([
      { id: "a1", role: "gpt", text: "older" },
      { id: "u1", role: "user", text: "latest" },
    ]);
    expect(input).toBe("");
    expect(loading).toBe(true);
  });

  it("appends the shared GPT failure message", () => {
    let messages: Message[] = [];

    appendSendToGptFailureMessage({
      setGptMessages: (next) => {
        messages = typeof next === "function" ? next(messages) : next;
      },
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      role: "gpt",
      text: "GPT request failed.",
      meta: {
        kind: "normal",
        sourceType: "manual",
      },
    });
  });

  it("applies explicit search usage after finalize only for protocol search requests", () => {
    const calls: string[] = [];

    applyExplicitSearchUsageAfterFinalize({
      data: {
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      },
      searchRequestEvent: { query: "farmers 360" },
      applySearchUsage: () => calls.push("search"),
    });

    applyExplicitSearchUsageAfterFinalize({
      data: {
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      },
      searchRequestEvent: undefined,
      applySearchUsage: () => calls.push("skip"),
    });

    expect(calls).toEqual(["search"]);
  });

  it("builds the task-directive gate context from the prepared request", () => {
    const result = buildTaskDirectiveOnlyGateContext({
      preparedRequest: {
        parsedInput: { title: "Task" },
        effectiveParsedSearchQuery: "",
        limitViolation: null,
        userMsg: { id: "u1", role: "user", text: "Task" },
      },
      shouldRespondToTaskDirectiveOnlyInput: () => true,
    });

    expect(result).toEqual({
      isTaskDirectiveOnly: true,
    });
  });

  it("builds the multipart-import gate context", () => {
    expect(
      buildMultipartImportGateContext({
        rawText: "multipart body",
        processMultipartTaskDoneText: () => ({ handled: true, accepted: true }),
      })
    ).toEqual({
      multipartHandled: true,
    });
  });

  it("builds the inline-url gate context", () => {
    expect(
      buildInlineUrlGateContext({
        rawText: "https://example.com",
        extractInlineUrlTarget: () => "https://example.com",
      })
    ).toEqual({
      inlineUrlTarget: "https://example.com",
    });
  });

  it("builds the protocol-limit gate context from the prepared request", () => {
    const result = buildProtocolLimitViolationGateContext({
      preparedRequest: {
        parsedInput: {},
        effectiveParsedSearchQuery: "",
        limitViolation: "limit hit",
        userMsg: { id: "u1", role: "user", text: "hello" },
      },
    });

    expect(result).toEqual({
      limitViolation: "limit hit",
      userMsg: { id: "u1", role: "user", text: "hello" },
    });
  });

  it("builds the youtube-transcript gate context from the prepared request", () => {
    const result = buildYoutubeTranscriptGateContext({
      preparedRequest: {
        parsedInput: {},
        effectiveParsedSearchQuery: "",
        limitViolation: null,
        userMsg: { id: "u1", role: "user", text: "hello" },
        youtubeTranscriptRequestEvent: {
          type: "youtube_transcript_request",
          body: "Fetch transcript",
          url: "https://youtube.com/watch?v=1",
        },
      },
    });

    expect(result).toEqual({
      userMsg: { id: "u1", role: "user", text: "hello" },
      youtubeTranscriptRequestEvent: {
        type: "youtube_transcript_request",
        body: "Fetch transcript",
        url: "https://youtube.com/watch?v=1",
      },
    });
  });

  it("applies finalize memory follow-up and summary usage together", async () => {
    const calls: string[] = [];

    await applyFinalizeMemoryFollowUp({
      updatedRecent: [{ id: "u1", role: "user", text: "hello" }],
      previousCommittedTopic: "topic-a",
      handleGptMemory: async (recent, options) => {
        calls.push(`${recent.length}:${options?.previousCommittedTopic}`);
        return {
          summaryUsage: {
            inputTokens: 4,
            outputTokens: 5,
            totalTokens: 9,
          },
        };
      },
      applySummaryUsage: () => calls.push("summary"),
    });

    expect(calls).toEqual(["1:topic-a", "summary"]);
  });
});
