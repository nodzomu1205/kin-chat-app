import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { createEmptyMemory, type Memory } from "@/lib/memory";
import { generateId } from "@/lib/uuid";
import { buildTaskChatBridgeContext } from "@/lib/taskChatBridge";
import {
  appendRecentAssistantMessage,
  applyProtocolAssistantSideEffects,
  buildEffectiveRequestText,
  handleImplicitSearchArtifacts,
  buildProtocolOverrideRequestText,
  buildProtocolSearchResponseArtifacts,
  deriveProtocolSearchContext,
  resolveMemoryUpdateContext,
  resolveProtocolLimitViolation,
  toSourceItems,
  wrapProtocolAssistantText,
  type ParsedInputLike,
  type PendingRequestLike,
} from "@/lib/app/sendToGptFlowHelpers";
import {
  extractInlineUrlTarget as extractInlineUrlTargetHelper,
  runInlineUrlShortcut,
} from "@/lib/app/sendToGptShortcutFlows";
import { handleYoutubeTranscriptFlow } from "@/lib/app/sendToGptYoutubeFlow";
import { normalizeUsage } from "@/lib/tokenStats";
import type { MemoryUpdateOptions } from "@/hooks/useChatPageActions";
import type { Message, ReferenceLibraryItem, SourceItem } from "@/types/chat";
import type { TaskRuntimeState } from "@/types/taskProtocol";
import type { TaskProtocolEvent } from "@/types/taskProtocol";
import type { GptInstructionMode, ResponseMode } from "@/components/panels/gpt/gptPanelTypes";
import type { SearchEngine, SearchMode } from "@/types/task";

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
  setKinInput: Dispatch<SetStateAction<string>>;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setActiveTabToKin?: () => void;
  instructionMode?: GptInstructionMode;
  responseMode: ResponseMode;
  currentTaskId: string | null;
  recordIngestedDocument: (document: {
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
    createdAt: string;
    updatedAt: string;
  }) => { id: string };
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
  onHandleYoutubeTranscriptRequest?: (params: {
    userMessage: Message;
    youtubeTranscriptRequestEvent: TaskProtocolEvent;
    currentTaskId: string | null;
  }) => Promise<boolean>;
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
  setKinInput,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setActiveTabToKin,
  instructionMode = "normal",
  responseMode,
  currentTaskId,
  recordIngestedDocument,
  taskProtocolAnswerPendingRequest,
  ingestProtocolMessage,
  recordSearchContext,
  getContinuationTokenForSeries,
  getAskAiModeLinkForQuery,
  applySearchUsage,
  applyChatUsage,
  applySummaryUsage,
  onHandleYoutubeTranscriptRequest,
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
    await runInlineUrlShortcut({
      rawText,
      inlineUrlTarget,
      setGptMessages,
      setGptInput,
      setGptLoading,
    });
    return;
  }

  const {
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
    youtubeTranscriptRequestEvent,
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

  if (youtubeTranscriptRequestEvent?.url?.trim()) {
    const handled = await handleYoutubeTranscriptFlow({
      userMsg,
      youtubeTranscriptRequestEvent,
      currentTaskId,
      onHandleYoutubeTranscriptRequest,
      setGptMessages,
      setGptInput,
      setGptLoading,
      setKinInput,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setActiveTabToKin,
      recordIngestedDocument,
      ingestProtocolMessage,
      gptStateRef,
      chatRecentLimit,
      handleGptMemory,
      applySummaryUsage,
    });
    if (handled) return;
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

  const memoryContext = resolveMemoryUpdateContext({
    gptState: gptStateRef.current,
    userMessage: userMsg,
    chatRecentLimit,
  });
  const requestMemory =
    (gptStateRef.current.memory as Memory | undefined) || createEmptyMemory();
  setGptMessages((prev) => {
    return [...prev, userMsg];
  });
  setGptInput("");
  setGptLoading(true);

  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "chat",
        memory: requestMemory,
        recentMessages: memoryContext.recentWithUser,
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
    let normalizedSources: SourceItem[] = [];

    assistantText = wrapProtocolAssistantText({
      assistantText,
      askGptEvent,
      currentTaskId,
      requestToAnswer,
      requestAnswerBody,
    });

    if (searchRequestEvent) {
      const wrappedSearchResponse =
        typeof data.reply === "string" && data.reply.includes("<<SYS_SEARCH_RESPONSE>>")
          ? parseWrappedSearchResponse(data.reply)
          : null;
      const searchArtifacts = buildProtocolSearchResponseArtifacts({
        data,
        searchRequestEvent,
        currentTaskId,
        wrappedSearchResponse,
        effectiveSearchMode,
        effectiveSearchEngines,
        effectiveSearchLocation,
        searchSeriesId,
        cleanQuery: continuationDetails.cleanQuery,
        recordSearchContext,
      });
      normalizedSources = searchArtifacts.normalizedSources;
      assistantText = searchArtifacts.assistantText;
    } else if (data.searchUsed) {
      normalizedSources = toSourceItems(data.sources);
    }

    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: assistantText,
      sources: normalizedSources,
      meta: {
        kind: "normal",
        sourceType: data.searchUsed ? "search" : "gpt_input",
      },
    };
    applyProtocolAssistantSideEffects({
      assistantText,
      ingestProtocolMessage,
      requestToAnswer,
      requestAnswerBody,
      taskProtocolAnswerPendingRequest,
    });

    const updatedRecent = appendRecentAssistantMessage({
      recentMessages: memoryContext.recentWithUser,
      assistantMessage: assistantMsg,
      chatRecentLimit,
    });

    setGptMessages((prev) => [...prev, assistantMsg]);

    handleImplicitSearchArtifacts({
      data,
      searchRequestEvent,
      effectiveSearchMode,
      effectiveSearchEngines,
      effectiveSearchLocation,
      searchSeriesId,
      cleanQuery: continuationDetails.cleanQuery,
      effectiveParsedSearchQuery,
      finalRequestText,
      applySearchUsage,
      applyChatUsage,
      recordSearchContext,
    });

    if (searchRequestEvent) {
      applySearchUsage(data.usage);
    }

    const memoryResult = await handleGptMemory(updatedRecent, {
      previousCommittedTopic: memoryContext.previousCommittedTopic,
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
