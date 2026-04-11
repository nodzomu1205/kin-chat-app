import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import { buildTaskChatBridgeContext, shouldInjectTaskContext } from "@/lib/taskChatBridge";
import {
  buildUserResponseBlock,
  extractTaskProtocolEvents,
} from "@/lib/taskRuntimeProtocol";
import { normalizeUsage } from "@/lib/tokenStats";
import { parseSearchContinuation } from "@/lib/search-domain/continuations";
import type { Message, ReferenceLibraryItem, SourceItem } from "@/types/chat";
import type { ChatBridgeSettings, TaskRuntimeState } from "@/types/taskProtocol";
import type { GptInstructionMode, ResponseMode } from "@/components/panels/gpt/gptPanelTypes";
import type { SearchEngine, SearchMode } from "@/types/task";

type ProtocolLimitEvent = {
  type: "ask_gpt" | "search_request" | "user_question" | "library_reference";
  taskId?: string;
  actionId?: string;
};

type PendingRequestLike = {
  id: string;
  taskId: string;
  actionId: string;
  body: string;
};

type ParsedInputLike = {
  searchQuery?: string;
  freeText?: string;
  title?: string;
  userInstruction?: string;
};

function resolveProtocolSearchOverrides(params: {
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
    default:
      return {
        searchMode: params.fallbackMode,
        searchEngines: params.fallbackEngines,
        searchLocation: location,
      };
  }
}

function extractInlineSearchQuery(text: string) {
  if (!text) return "";
  const normalized = text.normalize("NFKC");
  const lines = normalized.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/^(?:検索|search)\s*[:：]\s*(.+)$/i);
    if (match) {
      return match[1]?.trim() || "";
    }
  }

  return "";
}

type WrappedSearchResponse = {
  query?: string;
  outputMode?: string;
  summary?: string;
  rawExcerpt?: string;
} | null;

type SearchRecord = {
  rawResultId: string;
};

type MemoryResultLike = {
  summaryUsage?: Parameters<typeof normalizeUsage>[0];
};

type SearchSource = {
  title?: string;
  link?: string;
};

const SEARCH_DEBUG_ENABLED = false;
const CONTEXT_DEBUG_ENABLED = false;

type ChatApiResponse = {
  reply?: string;
  usage?: Parameters<typeof normalizeUsage>[0];
  searchUsed?: boolean;
  searchQuery?: string;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchEvidence?: string;
  sources?: SearchSource[];
};

type RunSendToGptFlowArgs = {
  gptInput: string;
  gptLoading: boolean;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  taskProtocolRuntime: TaskRuntimeState;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedInputLike;
  buildDocumentReferenceContext: () => string;
  buildLibraryReferenceContext: () => string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  getProtocolLimitViolation: (event: ProtocolLimitEvent) => string | null;
  shouldInjectTaskContextWithSettings: (userInput: string) => boolean;
  parseWrappedSearchResponse: (text: string) => WrappedSearchResponse;
  getProvisionalMemory: (
    text: string,
    options?: {
      currentTaskTitle?: string;
      activeDocumentTitle?: string;
      lastSearchQuery?: string;
    }
  ) => unknown;
  currentTaskTitle?: string;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  activeDocumentTitle?: string;
  lastSearchQuery?: string;
  handleGptMemory: (recent: Message[]) => Promise<MemoryResultLike>;
  chatRecentLimit: number;
  gptStateRef: MutableRefObject<{ recentMessages?: Message[] }>;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  setGptState: Dispatch<SetStateAction<any>>;
  instructionMode?: GptInstructionMode;
  responseMode: ResponseMode;
  currentTaskId: string | null;
  taskProtocolAnswerPendingRequest: (requestId: string, answerText: string) => void;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
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
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
  applySearchUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applyChatUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applySummaryUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
};

export async function runSendToGptFlow({
  gptInput,
  gptLoading,
  processMultipartTaskDoneText,
  taskProtocolRuntime,
  findPendingRequest,
  applyPrefixedTaskFieldsFromText,
  buildDocumentReferenceContext,
  buildLibraryReferenceContext,
  referenceLibraryItems,
  libraryIndexResponseCount,
  getProtocolLimitViolation,
  shouldInjectTaskContextWithSettings,
  parseWrappedSearchResponse,
  getProvisionalMemory,
  currentTaskTitle,
  searchMode,
  searchEngines,
  searchLocation,
  activeDocumentTitle,
  lastSearchQuery,
  handleGptMemory,
  chatRecentLimit,
  gptStateRef,
  setGptMessages,
  setGptInput,
  setGptLoading,
  setGptState,
  instructionMode = "normal",
  responseMode,
  currentTaskId,
  taskProtocolAnswerPendingRequest,
  ingestProtocolMessage,
  recordSearchContext,
  getContinuationTokenForSeries,
  getAskAiModeLinkForQuery,
  applySearchUsage,
  applyChatUsage,
  applySummaryUsage,
}: RunSendToGptFlowArgs) {
  if (!gptInput.trim() || gptLoading) return;

  const rawText = gptInput.trim();
  const multipartHandled = processMultipartTaskDoneText(rawText, { setGptTab: true });
  if (multipartHandled) {
    const importedMessage: Message = {
      id: generateId(),
      role: "user",
      text: rawText,
    };
    setGptMessages((prev) => [...prev, importedMessage]);
    setGptInput("");
    return;
  }

  const protocolEvents = extractTaskProtocolEvents(rawText);
  const askGptEvent = protocolEvents.find((event) => event.type === "ask_gpt");
  const searchRequestEvent = protocolEvents.find(
    (event) => event.type === "search_request"
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
  const reqAnswerMatch = rawText.match(/^REQ\s+([A-Z]\d+)\s+.+?:\s*([\s\S]*)$/i);
  const requestAnswerId = reqAnswerMatch?.[1]?.trim() || "";
  const requestAnswerBody = reqAnswerMatch?.[2]?.trim() || "";
  const requestToAnswer = requestAnswerId
    ? findPendingRequest(requestAnswerId)
    : null;
  const parsedInput = applyPrefixedTaskFieldsFromText(rawText);
  const inlineSearchQuery = extractInlineSearchQuery(rawText);
  const effectiveParsedSearchQuery = parsedInput.searchQuery || inlineSearchQuery;
  const continuationDetails = parseSearchContinuation(
    searchRequestEvent?.query || parsedInput.searchQuery || inlineSearchQuery || ""
  );
  const protocolSearchOverrides = resolveProtocolSearchOverrides({
    requestedEngine: searchRequestEvent?.searchEngine,
    requestedLocation: searchRequestEvent?.searchLocation,
    fallbackMode: searchMode,
    fallbackEngines: searchEngines,
    fallbackLocation: searchLocation,
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
  const searchSeriesId = aiContinuationEnabled ? continuationDetails.seriesId : undefined;
  const continuationToken = searchSeriesId
    ? getContinuationTokenForSeries(searchSeriesId)
    : "";
  const askAiModeLink =
    aiContinuationEnabled && !continuationToken
      ? getAskAiModeLinkForQuery(
          continuationDetails.cleanQuery ||
            searchRequestEvent?.query ||
            effectiveParsedSearchQuery ||
            ""
        )
      : "";

  const hasSearch = !!effectiveParsedSearchQuery;
  const hasTaskDirectives = !!(parsedInput.title || parsedInput.userInstruction);

  if (hasTaskDirectives && !hasSearch && !parsedInput.freeText) {
    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "タスクのタイトルや追加指示を更新しました。",
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      },
    ]);
    setGptInput("");
    return;
  }

  const requestText = [
    parsedInput.searchQuery ? `検索: ${parsedInput.searchQuery}` : "",
    parsedInput.freeText || "",
  ]
    .filter(Boolean)
    .join("\n");

  const normalizedRequestText = [
    effectiveParsedSearchQuery ? `検索：${effectiveParsedSearchQuery}` : "",
    parsedInput.freeText || "",
  ]
    .filter(Boolean)
    .join("\n");

  const effectiveRequestText = [
    effectiveParsedSearchQuery
      ? `\u691c\u7d22\uFF1A${effectiveParsedSearchQuery}`
      : "",
    parsedInput.freeText || "",
  ]
    .filter(Boolean)
    .join("\n");

  let finalRequestText = effectiveRequestText || normalizedRequestText || requestText || rawText;
  // Search history is already represented in the reference library, so avoid
  // double-injecting it during normal chat turns.
  const documentReferenceContext = buildDocumentReferenceContext();
  const libraryReferenceContext = buildLibraryReferenceContext();
  const effectiveDocumentReferenceContext = libraryReferenceContext
    ? ""
    : documentReferenceContext;
  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: rawText,
  };

  const limitViolation =
    (askGptEvent &&
      getProtocolLimitViolation({
        type: "ask_gpt",
        taskId: askGptEvent.taskId,
        actionId: askGptEvent.actionId,
      })) ||
    (searchRequestEvent &&
      getProtocolLimitViolation({
        type: "search_request",
        taskId: searchRequestEvent.taskId,
        actionId: searchRequestEvent.actionId,
      })) ||
    (userQuestionEvent &&
      getProtocolLimitViolation({
        type: "user_question",
        taskId: userQuestionEvent.taskId,
        actionId: userQuestionEvent.actionId,
      })) ||
    ((libraryIndexRequestEvent || libraryItemRequestEvent) &&
      getProtocolLimitViolation({
        type: "library_reference",
        taskId:
          libraryIndexRequestEvent?.taskId ||
          libraryItemRequestEvent?.taskId,
        actionId:
          libraryIndexRequestEvent?.actionId ||
          libraryItemRequestEvent?.actionId,
      }));

  if (limitViolation) {
    setGptMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: generateId(),
        role: "gpt",
        text: limitViolation,
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      },
    ]);
    setGptInput("");
    return;
  }

  if (askGptEvent) {
    finalRequestText = [
      "You are responding to a Kindroid SYS_ASK_GPT request.",
      "Return only this exact block format and nothing outside it:",
      "<<SYS_GPT_RESPONSE>>",
      `TASK_ID: ${askGptEvent.taskId || currentTaskId || ""}`,
      `ACTION_ID: ${askGptEvent.actionId || ""}`,
      "BODY: <your answer>",
      "<<END_SYS_GPT_RESPONSE>>",
      "",
      "Request:",
      askGptEvent.body,
    ].join("\n");
  }

  if (requestToAnswer && requestAnswerBody) {
    finalRequestText = [
      "You are converting a user's plain answer into a Kindroid protocol response.",
      "Return only this exact block format and nothing outside it:",
      "<<SYS_USER_RESPONSE>>",
      `TASK_ID: ${requestToAnswer.taskId}`,
      `ACTION_ID: ${requestToAnswer.actionId}`,
      "BODY: <clean answer for Kindroid here>",
      "<<END_SYS_USER_RESPONSE>>",
      "",
      "Original Kindroid question:",
      requestToAnswer.body,
      "",
      "User answer:",
      requestAnswerBody,
    ].join("\n");
  }

  if (searchRequestEvent) {
    const requestedMode = searchRequestEvent.outputMode || "summary";
    const modeInstruction =
      requestedMode === "raw"
        ? "Prefer raw evidence excerpts and keep synthesis minimal."
        : requestedMode === "summary_plus_raw"
          ? "Return both a concise synthesis and a compact raw evidence excerpt."
          : "Return a concise synthesis only.";
    finalRequestText = [
      "You are responding to a Kindroid SYS_SEARCH_REQUEST.",
      "Use the provided search evidence seriously and return only this exact block format:",
      "<<SYS_SEARCH_RESPONSE>>",
      `TASK_ID: ${searchRequestEvent.taskId || currentTaskId || ""}`,
      `ACTION_ID: ${searchRequestEvent.actionId || ""}`,
      `QUERY: ${searchRequestEvent.query || searchRequestEvent.body || ""}`,
      `ENGINE: ${searchRequestEvent.searchEngine || effectiveSearchEngines[0] || ""}`,
      `LOCATION: ${searchRequestEvent.searchLocation || effectiveSearchLocation || ""}`,
      `OUTPUT_MODE: ${requestedMode}`,
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
      searchRequestEvent.body || searchRequestEvent.summary || "Use the search query directly.",
    ].join("\n");
  }

  if (libraryIndexRequestEvent) {
    const lines = [
      "<<SYS_LIBRARY_INDEX_RESPONSE>>",
      `TASK_ID: ${libraryIndexRequestEvent.taskId || currentTaskId || ""}`,
      `ACTION_ID: ${libraryIndexRequestEvent.actionId || ""}`,
      "BODY:",
    ];

    const compactItems = referenceLibraryItems.slice(
      0,
      Math.max(1, libraryIndexResponseCount || 1)
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
    finalRequestText = lines.join("\n");
  }

  if (libraryItemRequestEvent) {
    const itemIdMatch = rawText.match(/ITEM_ID:\s*([A-Za-z0-9:_-]+)/i);
    const requestedItemId = itemIdMatch?.[1]?.trim() || "";
    const requestedModeMatch = rawText.match(/OUTPUT_MODE:\s*(summary|summary_plus_raw|raw)/i);
    const requestedMode = requestedModeMatch?.[1]?.trim().toLowerCase() || "summary";
    const item = referenceLibraryItems.find((candidate) => candidate.id === requestedItemId);

    const lines = [
      "<<SYS_LIBRARY_ITEM_RESPONSE>>",
      `TASK_ID: ${libraryItemRequestEvent.taskId || currentTaskId || ""}`,
      `ACTION_ID: ${libraryItemRequestEvent.actionId || ""}`,
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
    finalRequestText = lines.join("\n");
  }

  const shouldInjectTaskContext =
    !!currentTaskId && shouldInjectTaskContextWithSettings(rawText);

  if (shouldInjectTaskContext) {
    const taskContext = buildTaskChatBridgeContext(taskProtocolRuntime);
    finalRequestText = `${taskContext}\n\n${finalRequestText}`;
  }

  const baseRecent = gptStateRef.current.recentMessages || [];
  const newRecent = [...baseRecent, userMsg].slice(-chatRecentLimit);
  const provisionalMemory = getProvisionalMemory(finalRequestText, {
    currentTaskTitle: shouldInjectTaskContext ? currentTaskTitle : undefined,
    activeDocumentTitle: documentReferenceContext ? activeDocumentTitle : undefined,
    lastSearchQuery,
  });
  const provisionalMemoryText =
    provisionalMemory && typeof provisionalMemory === "object"
      ? JSON.stringify(provisionalMemory)
      : String(provisionalMemory || "");

  setGptMessages((prev) => {
    const next = [...prev, userMsg];
    if (SEARCH_DEBUG_ENABLED && effectiveParsedSearchQuery) {
      next.push({
        id: generateId(),
        role: "gpt",
        text: `[search debug] client detected query: ${effectiveParsedSearchQuery}`,
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      });
    }
    if (CONTEXT_DEBUG_ENABLED) {
      next.push({
        id: generateId(),
        role: "gpt",
        text:
          `[context debug] request=${finalRequestText.length} ` +
          `memory=${provisionalMemoryText.length} ` +
          `task=${shouldInjectTaskContext ? "on" : "off"} ` +
          `searchCtx=0 ` +
          `docCtx=${effectiveDocumentReferenceContext.length} ` +
          `libraryCtx=${libraryReferenceContext.length} ` +
          `recent=${newRecent.length}`,
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      });
    }
    return next;
  });
  setGptInput("");
  setGptLoading(true);

  setGptState((prev: any) => ({
    ...prev,
    memory: provisionalMemory,
  }));

  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "chat",
        memory: provisionalMemory,
        recentMessages: newRecent,
        input: finalRequestText,
        storedSearchContext: "",
        storedDocumentContext: effectiveDocumentReferenceContext,
        storedLibraryContext: libraryReferenceContext,
        forcedSearchQuery:
          continuationDetails.cleanQuery ||
          searchRequestEvent?.query ||
          effectiveParsedSearchQuery ||
          undefined,
        searchSeriesId,
        searchContinuationToken: continuationToken || undefined,
        searchAskAiModeLink: askAiModeLink || undefined,
        searchMode: effectiveSearchMode,
        searchEngines: effectiveSearchEngines,
        searchLocation: effectiveSearchLocation,
        instructionMode,
        reasoningMode: responseMode,
      }),
    });

    const data = (await res.json()) as ChatApiResponse;
    let assistantText =
      typeof data.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : "GPT did not return a usable response.";

    if (askGptEvent && !assistantText.includes("<<SYS_GPT_RESPONSE>>")) {
      assistantText = [
        "<<SYS_GPT_RESPONSE>>",
        `TASK_ID: ${askGptEvent.taskId || currentTaskId || ""}`,
        `ACTION_ID: ${askGptEvent.actionId || ""}`,
        `BODY: ${assistantText}`,
        "<<END_SYS_GPT_RESPONSE>>",
      ].join("\n");
    }

    if (requestToAnswer && requestAnswerBody && !assistantText.includes("<<SYS_USER_RESPONSE>>")) {
      assistantText = buildUserResponseBlock({
        taskId: requestToAnswer.taskId,
        actionId: requestToAnswer.actionId,
        body: assistantText,
      });
    }

    if (searchRequestEvent) {
      const requestedMode = searchRequestEvent.outputMode || "summary";
      const wrappedSearchResponse =
        typeof data.reply === "string" && data.reply.includes("<<SYS_SEARCH_RESPONSE>>")
          ? parseWrappedSearchResponse(data.reply)
          : null;
      const recordedSearch = data.searchUsed
        ? recordSearchContext({
            mode: effectiveSearchMode,
            engines: effectiveSearchEngines,
            location: effectiveSearchLocation || undefined,
            seriesId:
              typeof data.searchSeriesId === "string"
                ? data.searchSeriesId
                : searchSeriesId,
            continuationToken:
              typeof data.searchContinuationToken === "string"
                ? data.searchContinuationToken
                : undefined,
            taskId: searchRequestEvent.taskId || currentTaskId || undefined,
            actionId: searchRequestEvent.actionId || undefined,
            query:
              continuationDetails.cleanQuery ||
              searchRequestEvent.query ||
              (typeof data.searchQuery === "string" ? data.searchQuery : "") ||
              "",
            goal: searchRequestEvent.body || searchRequestEvent.summary || "",
            outputMode:
              requestedMode === "raw" || requestedMode === "summary_plus_raw"
                ? "raw_and_summary"
                : "summary",
            summaryText:
              typeof data.reply === "string" && data.reply.trim() ? data.reply.trim() : "",
            rawText: typeof data.searchEvidence === "string" ? data.searchEvidence : "",
            metadata:
              typeof data.searchSeriesId === "string" ||
              typeof data.searchContinuationToken === "string"
                ? {
                    seriesId:
                      typeof data.searchSeriesId === "string"
                        ? data.searchSeriesId
                        : searchSeriesId,
                    subsequentRequestToken:
                      typeof data.searchContinuationToken === "string"
                        ? data.searchContinuationToken
                        : undefined,
                  }
                : undefined,
            sources: Array.isArray(data.sources)
              ? data.sources.map((source) => ({
                  title: source.title || "",
                  link: source.link || "",
                }))
              : [],
          })
        : null;

      const summaryText =
        wrappedSearchResponse?.summary ||
        (typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : "Search completed, but no summary text was returned.");
      const rawExcerpt =
        wrappedSearchResponse?.rawExcerpt ||
        (typeof data.searchEvidence === "string" && data.searchEvidence.trim()
          ? data.searchEvidence
              .trim()
              .slice(0, requestedMode === "raw" ? 2400 : 1200)
          : "");
      const sourceLines = Array.isArray(data.sources)
        ? data.sources.slice(0, 5).map((source) =>
            `- ${source.title || "Untitled"}${source.link ? ` | ${source.link}` : ""}`
          )
        : [];

      const responseLines = [
        "<<SYS_SEARCH_RESPONSE>>",
        `TASK_ID: ${searchRequestEvent.taskId || currentTaskId || ""}`,
        `ACTION_ID: ${searchRequestEvent.actionId || ""}`,
        `QUERY: ${
          wrappedSearchResponse?.query ||
          searchRequestEvent.query ||
          (typeof data.searchQuery === "string" ? data.searchQuery : "") ||
          ""
        }`,
        `ENGINE: ${
          searchRequestEvent.searchEngine || effectiveSearchEngines[0] || ""
        }`,
        `LOCATION: ${
          searchRequestEvent.searchLocation || effectiveSearchLocation || ""
        }`,
        `OUTPUT_MODE: ${wrappedSearchResponse?.outputMode || requestedMode}`,
        `RAW_RESULT_AVAILABLE: ${recordedSearch ? "YES" : "NO"}`,
        ...(recordedSearch ? [`RAW_RESULT_ID: ${recordedSearch.rawResultId}`] : []),
      ];

      if (requestedMode !== "raw") {
        responseLines.push("SUMMARY:", summaryText);
      } else {
        responseLines.push("SUMMARY:", "Raw-focused search response. See RAW_EXCERPT below.");
      }

      if (requestedMode !== "summary") {
        responseLines.push("SOURCES:", ...(sourceLines.length > 0 ? sourceLines : ["- none"]));
      }

      if ((requestedMode === "raw" || requestedMode === "summary_plus_raw") && rawExcerpt) {
        responseLines.push("RAW_EXCERPT:", rawExcerpt);
      }

      responseLines.push("<<END_SYS_SEARCH_RESPONSE>>");
      assistantText = responseLines.join("\n");
    }

    if (libraryIndexRequestEvent) {
      assistantText = finalRequestText;
    }

    if (libraryItemRequestEvent) {
      assistantText = finalRequestText;
    }

    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: assistantText,
      sources: Array.isArray(data.sources)
        ? data.sources.map((source) => ({
            title: source.title || "",
            link: source.link || "",
          }))
        : [],
      meta: {
        kind: "normal",
        sourceType: data.searchUsed ? "search" : "gpt_input",
      },
    };
    ingestProtocolMessage(assistantText, "gpt_to_kin");

    const updatedRecent = [...newRecent, assistantMsg].slice(-chatRecentLimit);

    setGptMessages((prev) => [...prev, assistantMsg]);

    if (requestToAnswer && requestAnswerBody) {
      taskProtocolAnswerPendingRequest(requestToAnswer.id, requestAnswerBody);
    }

    if (data.searchUsed && !searchRequestEvent) {
      applySearchUsage(data.usage);
      recordSearchContext({
        mode: effectiveSearchMode,
        engines: effectiveSearchEngines,
        location: effectiveSearchLocation || undefined,
        seriesId:
          typeof data.searchSeriesId === "string"
            ? data.searchSeriesId
            : searchSeriesId,
        continuationToken:
          typeof data.searchContinuationToken === "string"
            ? data.searchContinuationToken
            : undefined,
        query:
          (typeof data.searchQuery === "string" && data.searchQuery.trim()) ||
          continuationDetails.cleanQuery ||
          effectiveParsedSearchQuery ||
          finalRequestText,
        summaryText:
          typeof data.reply === "string" && data.reply.trim() ? data.reply : "",
        rawText: typeof data.searchEvidence === "string" ? data.searchEvidence : "",
        metadata:
          typeof data.searchSeriesId === "string" ||
          typeof data.searchContinuationToken === "string"
            ? {
                seriesId:
                  typeof data.searchSeriesId === "string"
                    ? data.searchSeriesId
                    : searchSeriesId,
                subsequentRequestToken:
                  typeof data.searchContinuationToken === "string"
                    ? data.searchContinuationToken
                    : undefined,
              }
            : undefined,
        sources: Array.isArray(data.sources)
          ? data.sources.map((source) => ({
              title: source.title || "",
              link: source.link || "",
            }))
          : [],
      });
    } else if (!searchRequestEvent) {
      applyChatUsage(data.usage);
    }

    if (SEARCH_DEBUG_ENABLED && effectiveParsedSearchQuery) {
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: `[search debug] api searchUsed=${String(
            data.searchUsed
          )} searchQuery=${String(data.searchQuery || "")}`,
          meta: {
            kind: "task_info",
            sourceType: "manual",
          },
        },
      ]);
    }

    if (searchRequestEvent) {
      applySearchUsage(data.usage);
    }

    const memoryResult = await handleGptMemory(updatedRecent);
    applySummaryUsage(memoryResult.summaryUsage);
  } catch (error) {
    console.error(error);
    setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "GPT request failed.",
      },
    ]);
  } finally {
    setGptLoading(false);
  }
}
