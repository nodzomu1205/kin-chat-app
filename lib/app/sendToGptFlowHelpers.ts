import { buildUserResponseBlock } from "@/lib/taskRuntimeProtocol";
import {
  buildAskGptRequestBlock,
  buildLibraryIndexResponseDraft,
  buildLibraryItemResponseDraft,
  buildProtocolSourceLines,
  buildSearchRequestInstruction,
  buildSearchResponseBlock,
  buildUserResponseRequestBlock,
} from "@/lib/app/sendToGptProtocolBuilders";
import {
  buildNormalizedRequestText as buildNormalizedRequestTextClean,
  getTaskDirectiveOnlyResponseText as getTaskDirectiveOnlyResponseTextClean,
  shouldRespondToTaskDirectiveOnlyInput as shouldRespondToTaskDirectiveOnlyInputClean,
} from "@/lib/app/sendToGptText";
import type {
  ChatApiRequestPayload,
  ChatApiSearchLike,
  GptStateSnapshotLike,
  ParsedInputLike,
  PendingRequestLike,
  ProtocolLimitEvent,
  ProtocolTaskEventLike,
  SearchContextRecorder,
  SearchRecord,
  SearchResponseEventLike,
  SearchSource,
  WrappedSearchResponse,
} from "@/lib/app/sendToGptFlowTypes";
import type { Message, ReferenceLibraryItem, SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";
export type {
  ChatApiRequestPayload,
  ChatApiSearchLike,
  ParsedInputLike,
  PendingRequestLike,
  SearchRecord,
  SearchSource,
  WrappedSearchResponse,
};

// Legacy wrapper kept temporarily so downstream call sites can move to
// sendToGptText.ts incrementally without changing behavior.
export function buildEffectiveRequestText(params: {
  rawText: string;
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
}) {
  return buildNormalizedRequestTextClean(params);

  const requestText = [
    params.parsedInput.searchQuery ? `検索：${params.parsedInput.searchQuery}` : "",
    params.parsedInput.freeText || "",
  ]
    .filter(Boolean)
    .join("\n");

  const normalizedRequestText = [
    params.effectiveParsedSearchQuery
      ? `検索：${params.effectiveParsedSearchQuery}`
      : "",
    params.parsedInput.freeText || "",
  ]
    .filter(Boolean)
    .join("\n");

  const effectiveRequestText = [
    params.effectiveParsedSearchQuery
      ? `検索：${params.effectiveParsedSearchQuery}`
      : "",
    params.parsedInput.freeText || "",
  ]
    .filter(Boolean)
    .join("\n");

  return effectiveRequestText || normalizedRequestText || requestText || params.rawText;
}

// Legacy wrapper kept temporarily so text-domain helpers can migrate in small slices.
export function shouldRespondToTaskDirectiveOnlyInput(params: {
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
}) {
  return shouldRespondToTaskDirectiveOnlyInputClean(params);

  const hasSearch = !!params.effectiveParsedSearchQuery;
  const hasTaskDirectives = !!(
    params.parsedInput.title || params.parsedInput.userInstruction
  );

  return hasTaskDirectives && !hasSearch && !params.parsedInput.freeText;
}

export function getTaskDirectiveOnlyResponseText() {
  return getTaskDirectiveOnlyResponseTextClean();

  return "タスクのタイトルと指示を更新しました。";
}

export function getUtf8TaskDirectiveOnlyResponseText() {
  return "\u30bf\u30b9\u30af\u306e\u30bf\u30a4\u30c8\u30eb\u3068\u6307\u793a\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f\u3002";
}

// Legacy wrapper kept temporarily so text-domain helpers can migrate in small slices.
export function buildNormalizedRequestText(params: {
  rawText: string;
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
}) {
  return buildNormalizedRequestTextClean(params);

  const resolvedSearchQuery =
    params.effectiveParsedSearchQuery || params.parsedInput.searchQuery || "";
  const normalizedRequestText = [
    resolvedSearchQuery ? `\u691c\u7d22: ${resolvedSearchQuery}` : "",
    params.parsedInput.freeText || "",
  ]
    .filter(Boolean)
    .join("\n");

  return normalizedRequestText || params.rawText;
}

export function buildFinalRequestText(params: {
  rawText: string;
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
  askGptEvent?: ProtocolTaskEventLike;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  searchRequestEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  effectiveSearchEngines: string[];
  effectiveSearchLocation: string;
  libraryIndexRequestEvent?: ProtocolTaskEventLike;
  libraryItemRequestEvent?: ProtocolTaskEventLike;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  taskContext?: string;
}) {
  const protocolOverrideText = buildProtocolOverrideRequestText({
    askGptEvent: params.askGptEvent,
    requestToAnswer: params.requestToAnswer,
    requestAnswerBody: params.requestAnswerBody,
    searchRequestEvent: params.searchRequestEvent,
    currentTaskId: params.currentTaskId,
    effectiveSearchEngines: params.effectiveSearchEngines,
    effectiveSearchLocation: params.effectiveSearchLocation,
    libraryIndexRequestEvent: params.libraryIndexRequestEvent,
    libraryItemRequestEvent: params.libraryItemRequestEvent,
    rawText: params.rawText,
    referenceLibraryItems: params.referenceLibraryItems,
    libraryIndexResponseCount: params.libraryIndexResponseCount,
    defaultText: buildNormalizedRequestTextClean({
      rawText: params.rawText,
      parsedInput: params.parsedInput,
      effectiveParsedSearchQuery: params.effectiveParsedSearchQuery,
    }),
  });

  if (!params.taskContext) {
    return protocolOverrideText;
  }

  return `${params.taskContext}\n\n${protocolOverrideText}`;
}

export function buildChatApiRequestPayload(params: {
  requestMemory: unknown;
  recentMessages: Message[];
  input: string;
  storedLibraryContext: string;
  storedDocumentContext?: string;
  forcedSearchQuery?: string;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchAskAiModeLink?: string;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  instructionMode: string;
  reasoningMode: string;
}) {
  const payload: ChatApiRequestPayload = {
    mode: "chat",
    memory: params.requestMemory,
    recentMessages: params.recentMessages,
    input: params.input,
    storedSearchContext: "",
    storedDocumentContext: params.storedDocumentContext || "",
    storedLibraryContext: params.storedLibraryContext,
    searchMode: params.searchMode,
    searchEngines: params.searchEngines,
    searchLocation: params.searchLocation,
    instructionMode: params.instructionMode,
    reasoningMode: params.reasoningMode,
  };

  if (params.forcedSearchQuery) {
    payload.forcedSearchQuery = params.forcedSearchQuery;
  }
  if (params.searchSeriesId) {
    payload.searchSeriesId = params.searchSeriesId;
  }
  if (params.searchContinuationToken) {
    payload.searchContinuationToken = params.searchContinuationToken;
  }
  if (params.searchAskAiModeLink) {
    payload.searchAskAiModeLink = params.searchAskAiModeLink;
  }

  return payload;
}

export function resolveMemoryUpdateContext(params: {
  gptState: GptStateSnapshotLike;
  userMessage: Message;
  chatRecentLimit: number;
}) {
  const baseRecent = params.gptState.recentMessages || [];
  const recentWithUser = [...baseRecent, params.userMessage].slice(
    -params.chatRecentLimit
  );
  const previousCommittedTopic =
    typeof params.gptState.memory?.context?.currentTopic === "string"
      ? params.gptState.memory.context.currentTopic
      : undefined;

  return {
    baseRecent,
    recentWithUser,
    previousCommittedTopic,
  };
}

export function appendRecentAssistantMessage(params: {
  recentMessages: Message[];
  assistantMessage: Message;
  chatRecentLimit: number;
}) {
  return [...params.recentMessages, params.assistantMessage].slice(
    -params.chatRecentLimit
  );
}

export function wrapProtocolAssistantText(params: {
  assistantText: string;
  askGptEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
}) {
  let nextAssistantText = params.assistantText;

  if (params.askGptEvent && !nextAssistantText.includes("<<SYS_GPT_RESPONSE>>")) {
    nextAssistantText = [
      "<<SYS_GPT_RESPONSE>>",
      `TASK_ID: ${params.askGptEvent.taskId || params.currentTaskId || ""}`,
      `ACTION_ID: ${params.askGptEvent.actionId || ""}`,
      `BODY: ${nextAssistantText}`,
      "<<END_SYS_GPT_RESPONSE>>",
    ].join("\n");
  }

  if (
    params.requestToAnswer &&
    params.requestAnswerBody &&
    !nextAssistantText.includes("<<SYS_USER_RESPONSE>>")
  ) {
    nextAssistantText = buildUserResponseBlock({
      taskId: params.requestToAnswer.taskId,
      actionId: params.requestToAnswer.actionId,
      body: nextAssistantText,
    });
  }

  return nextAssistantText;
}

export function buildProtocolSearchResponseArtifacts(params: {
  data: ChatApiSearchLike;
  searchRequestEvent: SearchResponseEventLike;
  currentTaskId?: string | null;
  wrappedSearchResponse: WrappedSearchResponse;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  recordSearchContext: SearchContextRecorder;
}) {
  const requestedMode = params.searchRequestEvent.outputMode || "summary";
  const normalizedSources = toSourceItems(params.data.sources);
  const recordedSearch = params.data.searchUsed
    ? params.recordSearchContext({
        mode: params.effectiveSearchMode,
        engines: params.effectiveSearchEngines,
        location: params.effectiveSearchLocation || undefined,
        seriesId:
          typeof params.data.searchSeriesId === "string"
            ? params.data.searchSeriesId
            : params.searchSeriesId,
        continuationToken:
          typeof params.data.searchContinuationToken === "string"
            ? params.data.searchContinuationToken
            : undefined,
        taskId: params.searchRequestEvent.taskId || params.currentTaskId || undefined,
        actionId: params.searchRequestEvent.actionId || undefined,
        query:
          params.cleanQuery ||
          params.searchRequestEvent.query ||
          (typeof params.data.searchQuery === "string" ? params.data.searchQuery : "") ||
          "",
        goal: params.searchRequestEvent.body || params.searchRequestEvent.summary || "",
        outputMode:
          requestedMode === "raw" || requestedMode === "summary_plus_raw"
            ? "raw_and_summary"
            : "summary",
        summaryText:
          typeof params.data.reply === "string" && params.data.reply.trim()
            ? params.data.reply.trim()
            : "",
        rawText:
          typeof params.data.searchEvidence === "string" ? params.data.searchEvidence : "",
        metadata:
          typeof params.data.searchSeriesId === "string" ||
          typeof params.data.searchContinuationToken === "string"
            ? {
                seriesId:
                  typeof params.data.searchSeriesId === "string"
                    ? params.data.searchSeriesId
                    : params.searchSeriesId,
                subsequentRequestToken:
                  typeof params.data.searchContinuationToken === "string"
                    ? params.data.searchContinuationToken
                    : undefined,
              }
            : undefined,
        sources: normalizedSources,
      })
    : null;

  const summaryText =
    params.wrappedSearchResponse?.summary ||
    (typeof params.data.reply === "string" && params.data.reply.trim()
      ? params.data.reply.trim()
      : "Search completed, but no summary text was returned.");
  const rawExcerpt =
    params.wrappedSearchResponse?.rawExcerpt ||
    (typeof params.data.searchEvidence === "string" && params.data.searchEvidence.trim()
      ? params.data.searchEvidence
          .trim()
          .slice(0, requestedMode === "raw" ? 2400 : 1200)
      : "");
  const sourceLines = buildProtocolSourceLines(
    normalizedSources,
    params.searchRequestEvent.searchEngine || params.effectiveSearchEngines[0] || ""
  );
  const assistantText = buildSearchResponseBlock({
    taskId: params.searchRequestEvent.taskId || params.currentTaskId || "",
    actionId: params.searchRequestEvent.actionId || "",
    query:
      params.wrappedSearchResponse?.query ||
      params.searchRequestEvent.query ||
      (typeof params.data.searchQuery === "string" ? params.data.searchQuery : "") ||
      "",
    engine:
      params.searchRequestEvent.searchEngine || params.effectiveSearchEngines[0] || "",
    location:
      params.searchRequestEvent.searchLocation || params.effectiveSearchLocation || "",
    requestedMode,
    recordedSearch,
    summaryText,
    rawExcerpt,
    wrappedOutputMode: params.wrappedSearchResponse?.outputMode,
    sourceLines,
  });

  return {
    assistantText,
    normalizedSources,
    recordedSearch,
    requestedMode,
  };
}

export function buildAssistantResponseArtifacts(params: {
  data: ChatApiSearchLike;
  parseWrappedSearchResponse: (text: string) => WrappedSearchResponse;
  askGptEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  searchRequestEvent?: SearchResponseEventLike;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  recordSearchContext: SearchContextRecorder;
}) {
  let assistantText =
    typeof params.data.reply === "string" && params.data.reply.trim()
      ? params.data.reply.trim()
      : "GPT did not return a usable response.";
  let normalizedSources: SourceItem[] = [];

  assistantText = wrapProtocolAssistantText({
    assistantText,
    askGptEvent: params.askGptEvent,
    currentTaskId: params.currentTaskId,
    requestToAnswer: params.requestToAnswer,
    requestAnswerBody: params.requestAnswerBody,
  });

  if (params.searchRequestEvent) {
    const wrappedSearchResponse =
      typeof params.data.reply === "string" &&
      params.data.reply.includes("<<SYS_SEARCH_RESPONSE>>")
        ? params.parseWrappedSearchResponse(params.data.reply)
        : null;
    const searchArtifacts = buildProtocolSearchResponseArtifacts({
      data: params.data,
      searchRequestEvent: params.searchRequestEvent,
      currentTaskId: params.currentTaskId,
      wrappedSearchResponse,
      effectiveSearchMode: params.effectiveSearchMode,
      effectiveSearchEngines: params.effectiveSearchEngines,
      effectiveSearchLocation: params.effectiveSearchLocation,
      searchSeriesId: params.searchSeriesId,
      cleanQuery: params.cleanQuery,
      recordSearchContext: params.recordSearchContext,
    });
    normalizedSources = searchArtifacts.normalizedSources;
    assistantText = searchArtifacts.assistantText;
  } else if (params.data.searchUsed) {
    normalizedSources = toSourceItems(params.data.sources);
  }

  return {
    assistantText,
    normalizedSources,
  };
}

export function handleImplicitSearchArtifacts(params: {
  data: ChatApiSearchLike;
  searchRequestEvent?: SearchResponseEventLike;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  effectiveParsedSearchQuery?: string;
  finalRequestText: string;
  applySearchUsage: (usage: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0]) => void;
  applyChatUsage: (usage: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0]) => void;
  recordSearchContext: SearchContextRecorder;
}) {
  if (params.data.searchUsed && !params.searchRequestEvent) {
    params.applySearchUsage(params.data.usage);
    params.recordSearchContext({
      mode: params.effectiveSearchMode,
      engines: params.effectiveSearchEngines,
      location: params.effectiveSearchLocation || undefined,
      seriesId:
        typeof params.data.searchSeriesId === "string"
          ? params.data.searchSeriesId
          : params.searchSeriesId,
      continuationToken:
        typeof params.data.searchContinuationToken === "string"
          ? params.data.searchContinuationToken
          : undefined,
      query:
        (typeof params.data.searchQuery === "string" && params.data.searchQuery.trim()) ||
        params.cleanQuery ||
        params.effectiveParsedSearchQuery ||
        params.finalRequestText,
      summaryText:
        typeof params.data.reply === "string" && params.data.reply.trim()
          ? params.data.reply
          : "",
      rawText:
        typeof params.data.searchEvidence === "string" ? params.data.searchEvidence : "",
      metadata:
        typeof params.data.searchSeriesId === "string" ||
        typeof params.data.searchContinuationToken === "string"
          ? {
              seriesId:
                typeof params.data.searchSeriesId === "string"
                  ? params.data.searchSeriesId
                  : params.searchSeriesId,
              subsequentRequestToken:
                typeof params.data.searchContinuationToken === "string"
                  ? params.data.searchContinuationToken
                  : undefined,
            }
          : undefined,
      sources: toSourceItems(params.data.sources),
    });
    return;
  }

  if (!params.searchRequestEvent) {
    params.applyChatUsage(params.data.usage);
  }
}

export function applyProtocolAssistantSideEffects(params: {
  assistantText: string;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  taskProtocolAnswerPendingRequest: (requestId: string, answerText: string) => void;
}) {
  params.ingestProtocolMessage(params.assistantText, "gpt_to_kin");

  if (params.requestToAnswer && params.requestAnswerBody) {
    params.taskProtocolAnswerPendingRequest(
      params.requestToAnswer.id,
      params.requestAnswerBody
    );
  }
}

export function resolveProtocolLimitViolation(params: {
  askGptEvent?: ProtocolTaskEventLike;
  searchRequestEvent?: ProtocolTaskEventLike;
  youtubeTranscriptRequestEvent?: ProtocolTaskEventLike;
  userQuestionEvent?: ProtocolTaskEventLike;
  libraryIndexRequestEvent?: ProtocolTaskEventLike;
  libraryItemRequestEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  getProtocolLimitViolation: (event: ProtocolLimitEvent) => string | null;
}) {
  return (
    (params.askGptEvent &&
      params.getProtocolLimitViolation({
        type: "ask_gpt",
        taskId: params.askGptEvent.taskId,
        actionId: params.askGptEvent.actionId,
      })) ||
    (params.searchRequestEvent &&
      params.getProtocolLimitViolation({
        type: "search_request",
        taskId: params.searchRequestEvent.taskId,
        actionId: params.searchRequestEvent.actionId,
      })) ||
    (params.youtubeTranscriptRequestEvent &&
      params.getProtocolLimitViolation({
        type: "youtube_transcript_request",
        taskId: params.youtubeTranscriptRequestEvent.taskId,
        actionId: params.youtubeTranscriptRequestEvent.actionId,
      })) ||
    (params.userQuestionEvent &&
      params.getProtocolLimitViolation({
        type: "user_question",
        taskId: params.userQuestionEvent.taskId,
        actionId: params.userQuestionEvent.actionId,
      })) ||
    ((params.libraryIndexRequestEvent || params.libraryItemRequestEvent) &&
      params.getProtocolLimitViolation({
        type: "library_reference",
        taskId:
          params.libraryIndexRequestEvent?.taskId ||
          params.libraryItemRequestEvent?.taskId ||
          params.currentTaskId ||
          undefined,
        actionId:
          params.libraryIndexRequestEvent?.actionId ||
          params.libraryItemRequestEvent?.actionId,
      })) ||
    null
  );
}

export function buildProtocolOverrideRequestText(params: {
  askGptEvent?: ProtocolTaskEventLike;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  searchRequestEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  effectiveSearchEngines: string[];
  effectiveSearchLocation: string;
  libraryIndexRequestEvent?: ProtocolTaskEventLike;
  libraryItemRequestEvent?: ProtocolTaskEventLike;
  rawText: string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  defaultText: string;
}) {
  if (params.askGptEvent) {
    return buildAskGptRequestBlock({
      taskId: params.askGptEvent.taskId || params.currentTaskId || "",
      actionId: params.askGptEvent.actionId || "",
      body: params.askGptEvent.body || "",
    });
  }

  if (params.requestToAnswer && params.requestAnswerBody) {
    return buildUserResponseRequestBlock({
      taskId: params.requestToAnswer.taskId,
      actionId: params.requestToAnswer.actionId,
      originalQuestion: params.requestToAnswer.body,
      answerBody: params.requestAnswerBody,
    });
  }

  if (params.searchRequestEvent) {
    const requestedMode = params.searchRequestEvent.outputMode || "summary";
    return buildSearchRequestInstruction({
      taskId: params.searchRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.searchRequestEvent.actionId || "",
      query: params.searchRequestEvent.query || params.searchRequestEvent.body || "",
      engine: params.searchRequestEvent.searchEngine || params.effectiveSearchEngines[0] || "",
      location:
        params.searchRequestEvent.searchLocation || params.effectiveSearchLocation || "",
      requestedMode,
      goal:
        params.searchRequestEvent.body ||
        params.searchRequestEvent.summary ||
        "Use the search query directly.",
    });
  }

  if (params.libraryIndexRequestEvent) {
    return buildLibraryIndexResponseDraft({
      taskId: params.libraryIndexRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.libraryIndexRequestEvent.actionId || "",
      referenceLibraryItems: params.referenceLibraryItems,
      libraryIndexResponseCount: params.libraryIndexResponseCount,
    });
  }

  if (params.libraryItemRequestEvent) {
    return buildLibraryItemResponseDraft({
      taskId: params.libraryItemRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.libraryItemRequestEvent.actionId || "",
      rawText: params.rawText,
      referenceLibraryItems: params.referenceLibraryItems,
    });
  }

  return params.defaultText;
}

export function toSourceItems(sources?: SearchSource[]): SourceItem[] {
  return Array.isArray(sources)
    ? sources.map((source) => ({
        title: source.title || "",
        link: source.link || "",
        snippet: source.snippet,
        sourceType: source.sourceType,
        publishedAt: source.publishedAt,
        thumbnailUrl: source.thumbnailUrl,
        channelName: source.channelName,
        duration: source.duration,
        viewCount: source.viewCount,
        videoId: source.videoId,
      }))
    : [];
}
