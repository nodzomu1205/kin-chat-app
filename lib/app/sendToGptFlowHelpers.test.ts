import { describe, expect, it } from "vitest";
import {
  appendRecentAssistantMessage,
  applyProtocolAssistantSideEffects,
  buildProtocolSearchResponseArtifacts,
  handleImplicitSearchArtifacts,
  resolveMemoryUpdateContext,
  wrapProtocolAssistantText,
} from "@/lib/app/sendToGptFlowHelpers";

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
});
