import { describe, expect, it } from "vitest";
import {
  buildProtocolSearchResponseArtifacts,
  wrapProtocolAssistantText,
} from "@/lib/app/send-to-gpt/sendToGptFlowResponse";
import {
  buildProtocolSearchMessageParts,
  buildProtocolSearchRecordArgs,
  buildSourceItems,
} from "@/lib/app/send-to-gpt/sendToGptFlowResponseBuilders";
import {
  buildLibraryIndexResponseDraft,
  buildLibraryItemResponseDraft,
  buildSearchResponseBlock,
  buildYouTubeTranscriptResponseBlock,
} from "@/lib/app/send-to-gpt/sendToGptProtocolBuilders";

describe("sendToGptFlow response builders", () => {
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

  it("builds source items and protocol search record args through response builders", () => {
    const normalizedSources = buildSourceItems([
      {
        title: "Source A",
        link: "https://example.com/a",
      },
    ]);

    expect(normalizedSources).toEqual([
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
    ]);

    expect(
      buildProtocolSearchRecordArgs({
        data: {
          reply: "Search summary here.",
          searchUsed: true,
          searchQuery: "popular female YouTubers",
          searchEvidence: "Long raw evidence text",
          searchSeriesId: "SERIES-1",
          searchContinuationToken: "NEXT-1",
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
        recordSearchContext: () => ({ rawResultId: "RAW-1" }),
        normalizedSources,
        requestedMode: "summary",
      })
    ).toMatchObject({
      mode: "youtube",
      engines: ["youtube_search"],
      location: "Japan",
      taskId: "123456",
      actionId: "S001",
      query: "popular female YouTubers",
      outputMode: "summary",
      summaryText: "Search summary here.",
      sources: normalizedSources,
    });
  });

  it("uses the same fallback summary text for search records and assistant output", () => {
    const result = buildProtocolSearchRecordArgs({
      data: {
        reply: "",
        searchUsed: true,
        searchQuery: "example query",
        searchEvidence: "",
      },
      searchRequestEvent: {
        taskId: "123456",
        actionId: "S003",
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
      recordSearchContext: () => ({ rawResultId: "RAW-3" }),
      normalizedSources: [],
      requestedMode: "summary",
    });

    expect(result.summaryText).toBe(
      "Search completed, but no summary text was returned."
    );
  });

  it("builds protocol search message parts through response builders", () => {
    const result = buildProtocolSearchMessageParts({
      params: {
        data: {
          reply: "Search summary here.",
          searchUsed: true,
          searchQuery: "popular female YouTubers",
          searchEvidence: "Long raw evidence text",
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
        recordSearchContext: () => ({ rawResultId: "RAW-1" }),
      },
      normalizedSources: [
        {
          title: "Video A",
          link: "https://youtube.com/watch?v=abc",
          channelName: "Channel A",
          duration: "12:34",
          viewCount: "12345",
        },
      ],
      requestedMode: "summary",
      recordedSearch: { rawResultId: "RAW-1" },
    });

    expect(result.summaryText).toBe("Search summary here.");
    expect(result.rawExcerpt).toContain("Long raw evidence text");
    expect(result.assistantText).toContain("<<SYS_SEARCH_RESPONSE>>");
    expect(result.assistantText).toContain("RAW_RESULT_ID: RAW-1");
  });

  it("builds protocol blocks with shared wrappers in sendToGptProtocolBuilders", () => {
    expect(
      buildLibraryIndexResponseDraft({
        taskId: "TASK-1",
        actionId: "LIB-1",
        referenceLibraryItems: [],
        libraryIndexResponseCount: 3,
      })
    ).toContain("<<SYS_LIBRARY_DATA_RESPONSE>>");

    expect(
      buildLibraryItemResponseDraft({
        taskId: "TASK-1",
        actionId: "ITEM-1",
        rawText: "ITEM_ID: item-1\nOUTPUT_MODE: raw",
        referenceLibraryItems: [
          {
            id: "item-1",
            itemType: "document",
            title: "Doc",
            summary: "Summary",
            excerptText: "Excerpt",
          } as never,
        ],
      })
    ).toContain("<<END_SYS_LIBRARY_DATA_RESPONSE>>");

    expect(
      buildSearchResponseBlock({
        taskId: "TASK-1",
        actionId: "S001",
        query: "farmers 360",
        engine: "google_search",
        location: "Japan",
        requestedMode: "summary",
        recordedSearch: { rawResultId: "RAW-1" },
        summaryText: "Summary",
        rawExcerpt: "",
        sourceLines: ["- Source A | https://example.com"],
      })
    ).toContain("<<SYS_SEARCH_RESPONSE>>");

    expect(
      buildYouTubeTranscriptResponseBlock({
        taskId: "TASK-1",
        actionId: "YT-1",
        url: "https://youtube.com/watch?v=1",
        outputMode: "summary",
        title: "Video",
        channel: "Channel",
        summary: "Summary",
      })
    ).toContain("<<END_SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>");
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
});
