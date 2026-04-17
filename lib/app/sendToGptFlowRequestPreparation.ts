import { buildTaskChatBridgeContext } from "@/lib/taskChatBridge";
import {
  deriveProtocolSearchContext,
  resolveProtocolLimitViolation,
} from "@/lib/app/sendToGptFlowContext";
import { buildFinalRequestText } from "@/lib/app/sendToGptFlowRequestText";
import type {
  ParsedInputLike,
  PendingRequestLike,
  PreparedRequestExecutionContext,
  PreparedRequestFinalizeContext,
  PreparedRequestGateContext,
} from "@/lib/app/sendToGptFlowTypes";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";
import type { TaskProtocolEvent, TaskRuntimeState } from "@/types/taskProtocol";

type DerivedProtocolSearchContext = ReturnType<typeof deriveProtocolSearchContext>;

export function prepareSendToGptRequest(params: {
  rawText: string;
  currentTaskId: string | null;
  taskProtocolRuntime: TaskRuntimeState;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedInputLike;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
  getProtocolLimitViolation: Parameters<typeof resolveProtocolLimitViolation>[0]["getProtocolLimitViolation"];
  shouldInjectTaskContextWithSettings: (userInput: string) => boolean;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  buildLibraryReferenceContext: () => string;
  createUserMessage: (rawText: string) => Message;
}) {
  const derivedContext = deriveProtocolSearchContext({
    rawText: params.rawText,
    findPendingRequest: params.findPendingRequest,
    applyPrefixedTaskFieldsFromText: params.applyPrefixedTaskFieldsFromText,
    searchMode: params.searchMode,
    searchEngines: params.searchEngines,
    searchLocation: params.searchLocation,
    getContinuationTokenForSeries: params.getContinuationTokenForSeries,
    getAskAiModeLinkForQuery: params.getAskAiModeLinkForQuery,
  });

  return buildPreparedRequestArtifacts({
    rawText: params.rawText,
    currentTaskId: params.currentTaskId,
    taskProtocolRuntime: params.taskProtocolRuntime,
    shouldInjectTaskContextWithSettings: params.shouldInjectTaskContextWithSettings,
    referenceLibraryItems: params.referenceLibraryItems,
    libraryIndexResponseCount: params.libraryIndexResponseCount,
    buildLibraryReferenceContext: params.buildLibraryReferenceContext,
    createUserMessage: params.createUserMessage,
    getProtocolLimitViolation: params.getProtocolLimitViolation,
    derivedContext,
  });
}

export function buildPreparedRequestArtifacts(params: {
  rawText: string;
  currentTaskId: string | null;
  taskProtocolRuntime: TaskRuntimeState;
  shouldInjectTaskContextWithSettings: (userInput: string) => boolean;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  buildLibraryReferenceContext: () => string;
  createUserMessage: (rawText: string) => Message;
  getProtocolLimitViolation: Parameters<typeof resolveProtocolLimitViolation>[0]["getProtocolLimitViolation"];
  derivedContext: DerivedProtocolSearchContext;
}) {
  const taskContext = resolveInjectedTaskContext({
    rawText: params.rawText,
    currentTaskId: params.currentTaskId,
    taskProtocolRuntime: params.taskProtocolRuntime,
    shouldInjectTaskContextWithSettings: params.shouldInjectTaskContextWithSettings,
  });
  const limitViolation = resolvePreparedRequestLimitViolation({
    derivedContext: params.derivedContext,
    currentTaskId: params.currentTaskId,
    getProtocolLimitViolation: params.getProtocolLimitViolation,
  });

  return {
    ...params.derivedContext,
    userMsg: params.createUserMessage(params.rawText),
    limitViolation,
    finalRequestText: buildPreparedFinalRequestText({
      rawText: params.rawText,
      currentTaskId: params.currentTaskId,
      taskContext,
      derivedContext: params.derivedContext,
      referenceLibraryItems: params.referenceLibraryItems,
      libraryIndexResponseCount: params.libraryIndexResponseCount,
    }),
    libraryReferenceContext: params.buildLibraryReferenceContext(),
    effectiveDocumentReferenceContext: "",
  };
}

export function buildPreparedRequestGateContext(params: {
  preparedRequest: PreparedRequestGateContext;
}): PreparedRequestGateContext {
  return {
    parsedInput: params.preparedRequest.parsedInput,
    effectiveParsedSearchQuery:
      params.preparedRequest.effectiveParsedSearchQuery,
    limitViolation: params.preparedRequest.limitViolation,
    userMsg: params.preparedRequest.userMsg,
    youtubeTranscriptRequestEvent:
      params.preparedRequest.youtubeTranscriptRequestEvent,
  };
}

export function buildPreparedRequestExecutionContext(params: {
  preparedRequest: {
    finalRequestText: string;
    effectiveDocumentReferenceContext: string;
    libraryReferenceContext: string;
    continuationDetails: {
      cleanQuery?: string;
    };
    searchRequestEvent?: {
      query?: string;
      taskId?: string;
      actionId?: string;
      body?: string;
      summary?: string;
      searchEngine?: string;
      searchLocation?: string;
      outputMode?: string;
    };
    effectiveParsedSearchQuery: string;
    searchSeriesId?: string;
    continuationToken?: string;
    askAiModeLink?: string;
    effectiveSearchMode: SearchMode;
    effectiveSearchEngines: SearchEngine[];
    effectiveSearchLocation: string;
    askGptEvent?: {
      taskId?: string;
      actionId?: string;
      body?: string;
      summary?: string;
      query?: string;
      searchEngine?: string;
      searchLocation?: string;
      outputMode?: string;
    };
    requestToAnswer?: PendingRequestLike | null;
    requestAnswerBody?: string;
  };
}): PreparedRequestExecutionContext {
  return {
    finalRequestText: params.preparedRequest.finalRequestText,
    storedDocumentContext:
      params.preparedRequest.effectiveDocumentReferenceContext,
    storedLibraryContext: params.preparedRequest.libraryReferenceContext,
    cleanQuery: params.preparedRequest.continuationDetails.cleanQuery,
    searchRequestEvent: params.preparedRequest.searchRequestEvent,
    effectiveParsedSearchQuery:
      params.preparedRequest.effectiveParsedSearchQuery,
    searchSeriesId: params.preparedRequest.searchSeriesId,
    continuationToken: params.preparedRequest.continuationToken,
    askAiModeLink: params.preparedRequest.askAiModeLink,
    effectiveSearchMode: params.preparedRequest.effectiveSearchMode,
    effectiveSearchEngines: params.preparedRequest.effectiveSearchEngines,
    effectiveSearchLocation: params.preparedRequest.effectiveSearchLocation,
    askGptEvent: params.preparedRequest.askGptEvent,
    requestToAnswer: params.preparedRequest.requestToAnswer,
    requestAnswerBody: params.preparedRequest.requestAnswerBody,
  };
}

export function buildPreparedRequestFinalizeContext(params: {
  preparedRequest: PreparedRequestExecutionContext;
}): PreparedRequestFinalizeContext {
  return {
    searchRequestEvent: params.preparedRequest.searchRequestEvent,
    effectiveSearchMode: params.preparedRequest.effectiveSearchMode,
    effectiveSearchEngines: params.preparedRequest.effectiveSearchEngines,
    effectiveSearchLocation: params.preparedRequest.effectiveSearchLocation,
    searchSeriesId: params.preparedRequest.searchSeriesId,
    cleanQuery: params.preparedRequest.cleanQuery,
    effectiveParsedSearchQuery:
      params.preparedRequest.effectiveParsedSearchQuery,
    finalRequestText: params.preparedRequest.finalRequestText,
    requestToAnswer: params.preparedRequest.requestToAnswer,
    requestAnswerBody: params.preparedRequest.requestAnswerBody,
  };
}

type PreparedRequestContextSource = PreparedRequestGateContext & {
  finalRequestText: string;
  effectiveDocumentReferenceContext: string;
  libraryReferenceContext: string;
  continuationDetails: {
    cleanQuery?: string;
  };
  searchRequestEvent?: {
    query?: string;
    taskId?: string;
    actionId?: string;
    body?: string;
    summary?: string;
    searchEngine?: string;
    searchLocation?: string;
    outputMode?: string;
  };
  effectiveParsedSearchQuery: string;
  searchSeriesId?: string;
  continuationToken?: string;
  askAiModeLink?: string;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  askGptEvent?: {
    taskId?: string;
    actionId?: string;
    body?: string;
    summary?: string;
    query?: string;
    searchEngine?: string;
    searchLocation?: string;
    outputMode?: string;
  };
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
};

export function buildPreparedRequestContexts(params: {
  preparedRequest: PreparedRequestContextSource;
}) {
  const gate = buildPreparedRequestGateContext({
    preparedRequest: params.preparedRequest,
  });
  const execution = buildPreparedRequestExecutionContext({
    preparedRequest: params.preparedRequest,
  });
  const finalize = buildPreparedRequestFinalizeContext({
    preparedRequest: execution,
  });

  return {
    gate,
    execution,
    finalize,
  };
}

export function resolvePreparedRequestLimitViolation(params: {
  derivedContext: DerivedProtocolSearchContext;
  currentTaskId: string | null;
  getProtocolLimitViolation: Parameters<
    typeof resolveProtocolLimitViolation
  >[0]["getProtocolLimitViolation"];
}) {
  return resolveProtocolLimitViolation({
    askGptEvent: params.derivedContext.askGptEvent,
    searchRequestEvent: params.derivedContext.searchRequestEvent,
    youtubeTranscriptRequestEvent:
      params.derivedContext.youtubeTranscriptRequestEvent,
    userQuestionEvent: params.derivedContext.userQuestionEvent,
    libraryIndexRequestEvent: params.derivedContext.libraryIndexRequestEvent,
    libraryItemRequestEvent: params.derivedContext.libraryItemRequestEvent,
    currentTaskId: params.currentTaskId,
    getProtocolLimitViolation: params.getProtocolLimitViolation,
  });
}

export function buildPreparedFinalRequestText(params: {
  rawText: string;
  currentTaskId: string | null;
  taskContext: string;
  derivedContext: DerivedProtocolSearchContext;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
}) {
  return buildFinalRequestText({
    rawText: params.rawText,
    parsedInput: params.derivedContext.parsedInput,
    effectiveParsedSearchQuery: params.derivedContext.effectiveParsedSearchQuery,
    askGptEvent: params.derivedContext.askGptEvent,
    requestToAnswer: params.derivedContext.requestToAnswer,
    requestAnswerBody: params.derivedContext.requestAnswerBody,
    searchRequestEvent: params.derivedContext.searchRequestEvent,
    currentTaskId: params.currentTaskId,
    effectiveSearchEngines: params.derivedContext.effectiveSearchEngines,
    effectiveSearchLocation: params.derivedContext.effectiveSearchLocation,
    libraryIndexRequestEvent: params.derivedContext.libraryIndexRequestEvent,
    libraryItemRequestEvent: params.derivedContext.libraryItemRequestEvent,
    referenceLibraryItems: params.referenceLibraryItems,
    libraryIndexResponseCount: params.libraryIndexResponseCount,
    taskContext: params.taskContext,
  });
}

export function resolveInjectedTaskContext(params: {
  rawText: string;
  currentTaskId: string | null;
  taskProtocolRuntime: TaskRuntimeState;
  shouldInjectTaskContextWithSettings: (userInput: string) => boolean;
}) {
  const shouldInjectTaskContext =
    !!params.currentTaskId &&
    params.shouldInjectTaskContextWithSettings(params.rawText);

  if (!shouldInjectTaskContext) {
    return "";
  }

  return buildTaskChatBridgeContext(params.taskProtocolRuntime);
}
