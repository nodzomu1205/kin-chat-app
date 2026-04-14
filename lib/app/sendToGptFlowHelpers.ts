import { parseTaskInput } from "@/lib/taskInputParser";
import { parseSearchContinuation } from "@/lib/search-domain/continuations";
import { extractTaskProtocolEvents } from "@/lib/taskRuntimeProtocol";
import { buildUserResponseBlock } from "@/lib/taskRuntimeProtocol";
import type { Message, ReferenceLibraryItem, SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export type ParsedInputLike = {
  searchQuery?: string;
  freeText?: string;
  title?: string;
  userInstruction?: string;
};

export type PendingRequestLike = {
  id: string;
  taskId: string;
  actionId: string;
  body: string;
};

export type WrappedSearchResponse = {
  query?: string;
  outputMode?: string;
  summary?: string;
  rawExcerpt?: string;
} | null;

export type SearchRecord = {
  rawResultId: string;
};

export type SearchSource = {
  title?: string;
  link?: string;
  snippet?: string;
  sourceType?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  channelName?: string;
  duration?: string;
  viewCount?: string;
  videoId?: string;
};

export type ChatApiSearchLike = {
  reply?: string;
  usage?: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0];
  searchUsed?: boolean;
  searchQuery?: string;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchEvidence?: string;
  sources?: SearchSource[];
};

type ProtocolLimitEvent = {
  type:
    | "ask_gpt"
    | "search_request"
    | "user_question"
    | "library_reference"
    | "youtube_transcript_request";
  taskId?: string;
  actionId?: string;
};

type ProtocolTaskEventLike = {
  taskId?: string;
  actionId?: string;
  body?: string;
  summary?: string;
  query?: string;
  searchEngine?: string;
  searchLocation?: string;
  outputMode?: string;
};

type SearchResponseEventLike = {
  taskId?: string;
  actionId?: string;
  body?: string;
  summary?: string;
  query?: string;
  searchEngine?: string;
  searchLocation?: string;
  outputMode?: string;
};

type GptStateSnapshotLike = {
  recentMessages?: Message[];
  memory?: {
    context?: {
      currentTopic?: string;
    };
  };
};

export function deriveProtocolSearchContext(params: {
  rawText: string;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedInputLike;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
}) {
  const protocolEvents = extractTaskProtocolEvents(params.rawText);
  const askGptEvent = protocolEvents.find((event) => event.type === "ask_gpt");
  const searchRequestEvent = protocolEvents.find(
    (event) => event.type === "search_request"
  );
  const youtubeTranscriptRequestEvent = protocolEvents.find(
    (event) => event.type === "youtube_transcript_request"
  );
  const libraryIndexRequestEvent = protocolEvents.find(
    (event) => event.type === "library_index_request"
  );
  const libraryItemRequestEvent = protocolEvents.find(
    (event) => event.type === "library_item_request"
  );
  const userQuestionEvent = protocolEvents.find(
    (event) => event.type === "user_question"
  );

  const reqAnswerMatch = params.rawText.match(
    /^REQ\s+([A-Z]\d+)\s+.+?:\s*([\s\S]*)$/i
  );
  const requestAnswerId = reqAnswerMatch?.[1]?.trim() || "";
  const requestAnswerBody = reqAnswerMatch?.[2]?.trim() || "";
  const requestToAnswer = requestAnswerId
    ? params.findPendingRequest(requestAnswerId)
    : null;

  const parsedInput = params.applyPrefixedTaskFieldsFromText(params.rawText);
  const inlineSearchQuery = extractInlineSearchQuery(params.rawText);
  const effectiveParsedSearchQuery = parsedInput.searchQuery || inlineSearchQuery;
  const continuationDetails = parseSearchContinuation(
    searchRequestEvent?.query || parsedInput.searchQuery || inlineSearchQuery || ""
  );
  const protocolSearchOverrides = resolveProtocolSearchOverrides({
    requestedEngine: searchRequestEvent?.searchEngine,
    requestedLocation: searchRequestEvent?.searchLocation,
    fallbackMode: params.searchMode,
    fallbackEngines: params.searchEngines,
    fallbackLocation: params.searchLocation,
  });
  const effectiveSearchMode = protocolSearchOverrides.searchMode;
  const effectiveSearchEngines = protocolSearchOverrides.searchEngines;
  const effectiveSearchLocation = protocolSearchOverrides.searchLocation;
  const aiContinuationEnabled =
    effectiveSearchEngines.includes("google_ai_mode") ||
    (effectiveSearchEngines.length === 0 &&
      (effectiveSearchMode === "ai" ||
        effectiveSearchMode === "integrated" ||
        effectiveSearchMode === "ai_first"));
  const searchSeriesId = aiContinuationEnabled
    ? continuationDetails.seriesId
    : undefined;
  const continuationToken = searchSeriesId
    ? params.getContinuationTokenForSeries(searchSeriesId)
    : "";
  const askAiModeLink =
    aiContinuationEnabled && !continuationToken
      ? params.getAskAiModeLinkForQuery(
          continuationDetails.cleanQuery ||
            searchRequestEvent?.query ||
            effectiveParsedSearchQuery ||
            ""
        )
      : "";

  return {
    protocolEvents,
    askGptEvent,
    searchRequestEvent,
    youtubeTranscriptRequestEvent,
    libraryIndexRequestEvent,
    libraryItemRequestEvent,
    userQuestionEvent,
    requestToAnswer,
    requestAnswerBody,
    parsedInput,
    effectiveParsedSearchQuery,
    continuationDetails,
    effectiveSearchMode,
    effectiveSearchEngines,
    effectiveSearchLocation,
    searchSeriesId,
    continuationToken,
    askAiModeLink,
  };
}

export function resolveProtocolSearchOverrides(params: {
  requestedEngine?: string;
  requestedLocation?: string;
  fallbackMode: SearchMode;
  fallbackEngines: SearchEngine[];
  fallbackLocation: string;
}) {
  const engine = params.requestedEngine?.trim().toLowerCase();
  const location = params.requestedLocation?.trim() || params.fallbackLocation;

  switch (engine) {
    case "google_search":
      return {
        searchMode: "normal" as SearchMode,
        searchEngines: ["google_search"] as SearchEngine[],
        searchLocation: location,
      };
    case "google_ai_mode":
      return {
        searchMode: "ai" as SearchMode,
        searchEngines: ["google_ai_mode"] as SearchEngine[],
        searchLocation: location,
      };
    case "google_news":
      return {
        searchMode: "news" as SearchMode,
        searchEngines: ["google_news"] as SearchEngine[],
        searchLocation: location,
      };
    case "google_local":
      return {
        searchMode: "geo" as SearchMode,
        searchEngines: ["google_local"] as SearchEngine[],
        searchLocation: location,
      };
    case "youtube_search":
      return {
        searchMode: "youtube" as SearchMode,
        searchEngines: ["youtube_search"] as SearchEngine[],
        searchLocation: location,
      };
    default:
      return {
        searchMode: params.fallbackMode,
        searchEngines: params.fallbackEngines,
        searchLocation: location,
      };
  }
}

export function extractInlineSearchQuery(text: string) {
  if (!text) return "";
  return parseTaskInput(text).searchQuery.trim();
}

export function buildEffectiveRequestText(params: {
  rawText: string;
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
}) {
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
  recordSearchContext: (args: {
    mode?: SearchMode;
    engines?: SearchEngine[];
    location?: string;
    seriesId?: string;
    continuationToken?: string;
    metadata?: Record<string, unknown>;
    taskId?: string;
    actionId?: string;
    query: string;
    goal?: string;
    outputMode?: "summary" | "raw_and_summary";
    summaryText?: string;
    rawText: string;
    sources: SourceItem[];
  }) => SearchRecord;
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
  recordSearchContext: (args: {
    mode?: SearchMode;
    engines?: SearchEngine[];
    location?: string;
    seriesId?: string;
    continuationToken?: string;
    metadata?: Record<string, unknown>;
    taskId?: string;
    actionId?: string;
    query: string;
    goal?: string;
    outputMode?: "summary" | "raw_and_summary";
    summaryText?: string;
    rawText: string;
    sources: SourceItem[];
  }) => SearchRecord;
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

export function buildAskGptRequestBlock(params: {
  taskId: string;
  actionId: string;
  body: string;
}) {
  return [
    "You are responding to a Kindroid SYS_ASK_GPT request.",
    "Return only this exact block format and nothing outside it:",
    "<<SYS_GPT_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    "BODY: <your answer>",
    "<<END_SYS_GPT_RESPONSE>>",
    "",
    "Request:",
    params.body,
  ].join("\n");
}

export function buildUserResponseRequestBlock(params: {
  taskId: string;
  actionId: string;
  originalQuestion: string;
  answerBody: string;
}) {
  return [
    "You are converting a user's plain answer into a Kindroid protocol response.",
    "Return only this exact block format and nothing outside it:",
    "<<SYS_USER_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    "BODY: <clean answer for Kindroid here>",
    "<<END_SYS_USER_RESPONSE>>",
    "",
    "Original Kindroid question:",
    params.originalQuestion,
    "",
    "User answer:",
    params.answerBody,
  ].join("\n");
}

export function buildSearchRequestInstruction(params: {
  taskId: string;
  actionId: string;
  query: string;
  engine: string;
  location: string;
  requestedMode: string;
  goal: string;
}) {
  const modeInstruction =
    params.requestedMode === "raw"
      ? "Prefer raw evidence excerpts and keep synthesis minimal."
      : params.requestedMode === "summary_plus_raw"
        ? "Return both a concise synthesis and a compact raw evidence excerpt."
        : "Return a concise synthesis only.";

  return [
    "You are responding to a Kindroid SYS_SEARCH_REQUEST.",
    "Use the provided search evidence seriously and return only this exact block format:",
    "<<SYS_SEARCH_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `QUERY: ${params.query}`,
    `ENGINE: ${params.engine}`,
    `LOCATION: ${params.location}`,
    `OUTPUT_MODE: ${params.requestedMode}`,
    "SUMMARY:",
    "<search summary here>",
    "SOURCES:",
    "- <title> | <url>",
    "RAW_RESULT_AVAILABLE: YES",
    "RAW_RESULT_ID: <raw result id here>",
    "<<END_SYS_SEARCH_RESPONSE>>",
    "",
    modeInstruction,
    "",
    "Search goal:",
    params.goal,
  ].join("\n");
}

export function buildLibraryIndexResponseDraft(params: {
  taskId: string;
  actionId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
}) {
  const lines = [
    "<<SYS_LIBRARY_INDEX_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    "BODY:",
  ];

  const compactItems = params.referenceLibraryItems.slice(
    0,
    Math.max(1, params.libraryIndexResponseCount || 1)
  );
  if (compactItems.length === 0) {
    lines.push("- No library items are currently available.");
  } else {
    compactItems.forEach((item) => {
      lines.push(
        `- ITEM_ID: ${item.id} | TYPE: ${item.itemType} | TITLE: ${item.title} | SHORT_SUMMARY: ${item.summary}`
      );
    });
  }

  lines.push("<<END_SYS_LIBRARY_INDEX_RESPONSE>>");
  return lines.join("\n");
}

export function buildLibraryItemResponseDraft(params: {
  taskId: string;
  actionId: string;
  rawText: string;
  referenceLibraryItems: ReferenceLibraryItem[];
}) {
  const itemIdMatch = params.rawText.match(/ITEM_ID:\s*([A-Za-z0-9:_-]+)/i);
  const requestedItemId = itemIdMatch?.[1]?.trim() || "";
  const requestedModeMatch = params.rawText.match(
    /OUTPUT_MODE:\s*(summary|summary_plus_raw|raw)/i
  );
  const requestedMode = requestedModeMatch?.[1]?.trim().toLowerCase() || "summary";
  const item = params.referenceLibraryItems.find(
    (candidate) => candidate.id === requestedItemId
  );

  const lines = [
    "<<SYS_LIBRARY_ITEM_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `ITEM_ID: ${requestedItemId || item?.id || ""}`,
    `OUTPUT_MODE: ${requestedMode === "raw" ? "summary_plus_raw" : requestedMode}`,
  ];

  if (!item) {
    lines.push("SUMMARY: Requested library item was not found.");
  } else {
    lines.push(`SUMMARY: ${item.summary}`);
    if (requestedMode !== "summary" && item.excerptText.trim()) {
      lines.push(`RAW_EXCERPT: ${item.excerptText.trim().slice(0, 1400)}`);
    }
  }

  lines.push("<<END_SYS_LIBRARY_ITEM_RESPONSE>>");
  return lines.join("\n");
}

export function buildSearchResponseBlock(params: {
  taskId: string;
  actionId: string;
  query: string;
  engine: string;
  location: string;
  requestedMode: string;
  recordedSearch: SearchRecord | null;
  summaryText: string;
  rawExcerpt: string;
  wrappedOutputMode?: string;
  sourceLines: string[];
}) {
  const responseLines = [
    "<<SYS_SEARCH_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `QUERY: ${params.query}`,
    `ENGINE: ${params.engine}`,
    `LOCATION: ${params.location}`,
    `OUTPUT_MODE: ${params.wrappedOutputMode || params.requestedMode}`,
    `RAW_RESULT_AVAILABLE: ${params.recordedSearch ? "YES" : "NO"}`,
    ...(params.recordedSearch ? [`RAW_RESULT_ID: ${params.recordedSearch.rawResultId}`] : []),
  ];

  if (params.requestedMode !== "raw") {
    responseLines.push("SUMMARY:", params.summaryText);
  } else {
    responseLines.push("SUMMARY:", "Raw-focused search response. See RAW_EXCERPT below.");
  }

  const shouldIncludeSources =
    params.requestedMode !== "summary" || params.engine === "youtube_search";

  if (shouldIncludeSources) {
    responseLines.push(
      "SOURCES:",
      ...(params.sourceLines.length > 0 ? params.sourceLines : ["- none"])
    );
  }

  if (
    (params.requestedMode === "raw" || params.requestedMode === "summary_plus_raw") &&
    params.rawExcerpt
  ) {
    responseLines.push("RAW_EXCERPT:", params.rawExcerpt);
  }

  responseLines.push("<<END_SYS_SEARCH_RESPONSE>>");
  return responseLines.join("\n");
}

export function buildProtocolSourceLines(
  sources: SourceItem[],
  engine: string
): string[] {
  return sources.slice(0, 5).map((source) => {
    if (engine === "youtube_search") {
      return [
        `- ${source.title || "Untitled"}`,
        source.channelName ? `  Channel: ${source.channelName}` : "",
        source.duration ? `  Duration: ${source.duration}` : "",
        source.viewCount ? `  Views: ${Number(source.viewCount).toLocaleString()} views` : "",
        source.link ? `  URL: ${source.link}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return `- ${source.title || "Untitled"}${source.link ? ` | ${source.link}` : ""}`;
  });
}

export function buildYouTubeTranscriptResponseBlock(params: {
  taskId: string;
  actionId: string;
  url: string;
  outputMode: string;
  title: string;
  channel: string;
  summary: string;
  rawExcerpt?: string;
  libraryItemId?: string;
}) {
  const lines = [
    "<<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `URL: ${params.url}`,
    `OUTPUT_MODE: ${params.outputMode}`,
    `TITLE: ${params.title}`,
    `CHANNEL: ${params.channel}`,
    "SUMMARY:",
    params.summary,
  ];

  if (params.rawExcerpt) {
    lines.push("RAW_EXCERPT:", params.rawExcerpt);
  }

  if (params.libraryItemId) {
    lines.push(`LIBRARY_ITEM_ID: ${params.libraryItemId}`);
  }

  lines.push("<<END_SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>");
  return lines.join("\n");
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
