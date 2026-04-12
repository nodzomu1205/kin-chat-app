import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Memory } from "@/lib/memory";
import { generateId } from "@/lib/uuid";
import { buildTaskChatBridgeContext, shouldInjectTaskContext } from "@/lib/taskChatBridge";
import {
  buildUserResponseBlock,
} from "@/lib/taskRuntimeProtocol";
import {
  buildEffectiveRequestText,
  buildProtocolOverrideRequestText,
  buildSearchResponseBlock as buildSearchResponseBlockHelper,
  deriveProtocolSearchContext,
  resolveProtocolLimitViolation,
  toSourceItems as toSourceItemsHelper,
  type ParsedInputLike,
  type PendingRequestLike,
} from "@/lib/app/sendToGptFlowHelpers";
import {
  extractInlineUrlTarget as extractInlineUrlTargetHelper,
  runInlineUrlShortcut,
} from "@/lib/app/sendToGptShortcutFlows";
import { normalizeUsage } from "@/lib/tokenStats";
import type { MemoryUpdateOptions } from "@/hooks/useChatPageActions";
import type { Message, ReferenceLibraryItem, SourceItem } from "@/types/chat";
import type { ChatBridgeSettings, TaskRuntimeState } from "@/types/taskProtocol";
import type { GptInstructionMode, ResponseMode } from "@/components/panels/gpt/gptPanelTypes";
import type { SearchEngine, SearchMode } from "@/types/task";

type ProtocolLimitEvent = {
  type: "ask_gpt" | "search_request" | "user_question" | "library_reference";
  taskId?: string;
  actionId?: string;
};




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

function extractInlineUrlTarget(text: string) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/^URL\s*[:：]\s*(https?:\/\/\S+)$/i);
    if (match?.[1]) {
      return match[1].trim();
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
  handleGptMemory: (
    recent: Message[],
    options?: MemoryUpdateOptions
  ) => Promise<MemoryResultLike>;
  chatRecentLimit: number;
  gptStateRef: MutableRefObject<{ recentMessages?: Message[]; memory?: Memory }>;
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

  const inlineUrlTarget = extractInlineUrlTargetHelper(rawText);
  if (inlineUrlTarget) {
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: rawText,
    };

    setGptMessages((prev) => [...prev, userMsg]);
    setGptInput("");
    setGptLoading(true);

    try {
      const response = await fetch(
        `/api/url-card?url=${encodeURIComponent(inlineUrlTarget)}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        ok?: boolean;
        source?: SourceItem;
        error?: string;
      };

      if (!response.ok || !data.source) {
        throw new Error(data.error || "URL card resolve failed");
      }
      const resolvedSource = data.source;

      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "",
          sources: [resolvedSource],
          meta: {
            kind: "normal",
            sourceType: "manual",
          },
        },
      ]);
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "gpt",
          text: "URL からカードを作成できませんでした。",
        },
      ]);
    } finally {
      setGptLoading(false);
    }

    return;
  }

  const {
    askGptEvent,
    searchRequestEvent,
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
  } = deriveProtocolSearchContext({
    rawText,
    findPendingRequest,
    applyPrefixedTaskFieldsFromText,
    searchMode,
    searchEngines,
    searchLocation,
    getContinuationTokenForSeries,
    getAskAiModeLinkForQuery,
  });

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

  let finalRequestText = buildEffectiveRequestText({
    rawText,
    parsedInput,
    effectiveParsedSearchQuery,
  });
  // Search history is already represented in the reference library, so avoid
  // double-injecting it during normal chat turns.
  const libraryReferenceContext = buildLibraryReferenceContext();
  const effectiveDocumentReferenceContext = "";
  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: rawText,
  };

  const limitViolation = resolveProtocolLimitViolation({
    askGptEvent,
    searchRequestEvent,
    userQuestionEvent,
    libraryIndexRequestEvent,
    libraryItemRequestEvent,
    currentTaskId,
    getProtocolLimitViolation,
  });

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

  finalRequestText = buildProtocolOverrideRequestText({
    askGptEvent,
    requestToAnswer,
    requestAnswerBody,
    searchRequestEvent,
    currentTaskId,
    effectiveSearchEngines,
    effectiveSearchLocation,
    libraryIndexRequestEvent,
    libraryItemRequestEvent,
    rawText,
    referenceLibraryItems,
    libraryIndexResponseCount,
    defaultText: finalRequestText,
  });

  const shouldInjectTaskContext =
    !!currentTaskId && shouldInjectTaskContextWithSettings(rawText);

  if (shouldInjectTaskContext) {
    const taskContext = buildTaskChatBridgeContext(taskProtocolRuntime);
    finalRequestText = `${taskContext}\n\n${finalRequestText}`;
  }

  const baseRecent = gptStateRef.current.recentMessages || [];
  const newRecent = [...baseRecent, userMsg].slice(-chatRecentLimit);
  const previousCommittedTopic =
    typeof gptStateRef.current?.memory?.context?.currentTopic === "string"
      ? gptStateRef.current.memory.context.currentTopic
      : undefined;
  const provisionalMemory = getProvisionalMemory(finalRequestText, {
    currentTaskTitle: shouldInjectTaskContext ? currentTaskTitle : undefined,
    activeDocumentTitle: undefined,
    lastSearchQuery: undefined,
  });
  setGptMessages((prev) => {
    return [...prev, userMsg];
  });
  setGptInput("");
  setGptLoading(true);

  gptStateRef.current = {
    ...(gptStateRef.current as any),
    memory: provisionalMemory,
  } as any;

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
            sources: toSourceItemsHelper(data.sources),
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

      assistantText = buildSearchResponseBlockHelper({
        taskId: searchRequestEvent.taskId || currentTaskId || "",
        actionId: searchRequestEvent.actionId || "",
        query:
          wrappedSearchResponse?.query ||
          searchRequestEvent.query ||
          (typeof data.searchQuery === "string" ? data.searchQuery : "") ||
          "",
        engine: searchRequestEvent.searchEngine || effectiveSearchEngines[0] || "",
        location: searchRequestEvent.searchLocation || effectiveSearchLocation || "",
        requestedMode,
        recordedSearch,
        summaryText,
        rawExcerpt,
        wrappedOutputMode: wrappedSearchResponse?.outputMode,
        sourceLines,
      });
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
      sources: toSourceItemsHelper(data.sources),
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
        sources: toSourceItemsHelper(data.sources),
      });
    } else if (!searchRequestEvent) {
      applyChatUsage(data.usage);
    }

    if (searchRequestEvent) {
      applySearchUsage(data.usage);
    }

    const memoryResult = await handleGptMemory(updatedRecent, {
      previousCommittedTopic,
    });
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
