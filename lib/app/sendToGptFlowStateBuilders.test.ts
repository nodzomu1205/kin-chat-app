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
  buildImplicitSearchRecordArgs,
  buildMemoryUpdateContext,
  buildRequestMemory,
} from "@/lib/app/sendToGptFlowStateBuilders";
import {
  applyExplicitSearchUsageAfterFinalize,
  applyFinalizeMemoryFollowUp,
} from "@/lib/app/sendToGptFlowFinalize";
import {
  buildFinalizeAssistantMessageArgs,
  buildFinalizeImplicitSearchArgs,
  buildFinalizeMemoryFollowUpArgs,
  buildFinalizeProtocolSideEffectArgs,
} from "@/lib/app/sendToGptFlowFinalizeBuilders";
import type { Message } from "@/types/chat";

describe("sendToGptFlow state builders", () => {
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

  it("builds implicit search record args from search response artifacts", () => {
    expect(
      buildImplicitSearchRecordArgs({
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
        applySearchUsage: () => undefined,
        applyChatUsage: () => undefined,
        recordSearchContext: () => ({ rawResultId: "RAW-1" }),
      })
    ).toMatchObject({
      mode: "normal",
      engines: ["google_search"],
      location: "Japan",
      seriesId: "SERIES1",
      continuationToken: "NEXT1",
      query: "tokyo housing",
      summaryText: "Implicit search summary",
      rawText: "raw evidence",
      sources: [{ title: "Source A", link: "https://example.com" }],
    });
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

  it("builds memory update fields through the state builder", () => {
    expect(
      buildMemoryUpdateContext({
        gptState: {
          recentMessages: [{ id: "a1", role: "gpt", text: "older" }],
          memory: {
            context: {
              currentTopic: "topic-a",
            },
          },
        },
        userMessage: { id: "u1", role: "user", text: "latest" },
        chatRecentLimit: 5,
      })
    ).toEqual({
      baseRecent: [{ id: "a1", role: "gpt", text: "older" }],
      recentWithUser: [
        { id: "a1", role: "gpt", text: "older" },
        { id: "u1", role: "user", text: "latest" },
      ],
      previousCommittedTopic: "topic-a",
    });
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

  it("builds request memory from state or falls back to empty memory", () => {
    expect(
      buildRequestMemory({
        gptState: {
          memory: {
            context: {
              currentTopic: "topic-a",
            },
          },
        },
      })
    ).toMatchObject({
      context: {
        currentTopic: "topic-a",
      },
    });

    expect(
      buildRequestMemory({
        gptState: {},
      })
    ).toMatchObject({
      context: {},
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

  it("builds finalize helper args from the finalized flow input", () => {
    const finalizeArgs = {
      data: {
        searchUsed: true,
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      },
      assistantText: "Wrapped protocol response",
      normalizedSources: [{ title: "Source A", link: "https://example.com" }],
      memoryContext: {
        recentWithUser: [{ id: "u1", role: "user", text: "hello" }],
        previousCommittedTopic: "topic-a",
      },
      chatRecentLimit: 4,
      preparedRequest: {
        searchRequestEvent: { query: "query" },
        effectiveSearchMode: "normal",
        effectiveSearchEngines: ["google_search"],
        effectiveSearchLocation: "Japan",
        searchSeriesId: "SERIES-1",
        cleanQuery: "query",
        effectiveParsedSearchQuery: "query",
        finalRequestText: "hello",
        requestToAnswer: {
          id: "REQ1",
          taskId: "123456",
          actionId: "Q001",
          body: "Need clarification",
        },
        requestAnswerBody: "Here is the answer",
      },
      ingestProtocolMessage: () => undefined,
      taskProtocolAnswerPendingRequest: () => undefined,
      setGptMessages: () => undefined,
      applySearchUsage: () => undefined,
      applyChatUsage: () => undefined,
      recordSearchContext: () => ({ rawResultId: "RAW-1" }),
      handleGptMemory: async () => ({ compressionUsage: null, fallbackUsage: null }),
      applyChatUsage: () => undefined,
      applyCompressionUsage: () => undefined,
    } as never;

    expect(buildFinalizeAssistantMessageArgs(finalizeArgs)).toMatchObject({
      assistantText: "Wrapped protocol response",
      normalizedSources: [{ title: "Source A", link: "https://example.com" }],
      sourceType: "search",
    });

    expect(buildFinalizeProtocolSideEffectArgs(finalizeArgs)).toMatchObject({
      assistantText: "Wrapped protocol response",
      requestAnswerBody: "Here is the answer",
    });

    expect(buildFinalizeImplicitSearchArgs(finalizeArgs)).toMatchObject({
      data: finalizeArgs.data,
      searchRequestEvent: { query: "query" },
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
      finalRequestText: "hello",
    });

    expect(
      buildFinalizeMemoryFollowUpArgs({
        updatedRecent: [{ id: "u1", role: "user", text: "hello" }],
        previousCommittedTopic: "topic-a",
        handleGptMemory: finalizeArgs.handleGptMemory,
        applyChatUsage: finalizeArgs.applyChatUsage,
        applyCompressionUsage: finalizeArgs.applyCompressionUsage,
      })
    ).toMatchObject({
      updatedRecent: [{ id: "u1", role: "user", text: "hello" }],
      previousCommittedTopic: "topic-a",
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
          fallbackUsage: null,
          compressionUsage: {
            inputTokens: 4,
            outputTokens: 5,
            totalTokens: 9,
          },
        };
      },
      applyChatUsage: () => calls.push("chat"),
      applyCompressionUsage: () => calls.push("summary"),
    });

    expect(calls).toEqual(["1:topic-a", "summary"]);
  });
});

