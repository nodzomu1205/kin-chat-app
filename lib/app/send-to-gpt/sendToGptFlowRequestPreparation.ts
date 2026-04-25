import {
  deriveProtocolSearchContext,
  resolveProtocolLimitViolation,
} from "@/lib/app/send-to-gpt/sendToGptFlowContext";
import type {
  ParsedInputLike,
  PendingRequestLike,
} from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import type {
  PreparedRequestContextSource,
  PreparedRequestExecutionContext,
  PreparedRequestFinalizeContext,
  PreparedRequestGateContext,
} from "@/lib/app/send-to-gpt/sendToGptPreparedRequestTypes";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";
import type { TaskRuntimeState } from "@/types/taskProtocol";
import {
  buildPreparedFinalRequestText as buildPreparedFinalRequestTextFromBuilder,
  buildPreparedRequestArtifactBase,
  buildPreparedRequestExecutionFields,
  buildPreparedRequestFinalizeFields,
  buildPreparedRequestGateFields,
} from "@/lib/app/send-to-gpt/sendToGptFlowRequestPreparationBuilders";

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
  return buildPreparedRequestArtifactBase({
    derivedContext: params.derivedContext,
    rawText: params.rawText,
    currentTaskId: params.currentTaskId,
    taskProtocolRuntime: params.taskProtocolRuntime,
    shouldInjectTaskContextWithSettings:
      params.shouldInjectTaskContextWithSettings,
    referenceLibraryItems: params.referenceLibraryItems,
    libraryIndexResponseCount: params.libraryIndexResponseCount,
    createUserMessage: params.createUserMessage,
    buildLibraryReferenceContext: params.buildLibraryReferenceContext,
    buildLimitViolation: () =>
      resolvePreparedRequestLimitViolation({
        derivedContext: params.derivedContext,
        currentTaskId: params.currentTaskId,
        getProtocolLimitViolation: params.getProtocolLimitViolation,
      }),
  });
}

export function buildPreparedRequestGateContext(params: {
  preparedRequest: PreparedRequestGateContext;
}): PreparedRequestGateContext {
  return buildPreparedRequestGateFields(
    params.preparedRequest as PreparedRequestContextSource
  );
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
  return buildPreparedRequestExecutionFields(
    params.preparedRequest as PreparedRequestContextSource
  );
}

export function buildPreparedRequestFinalizeContext(params: {
  preparedRequest: PreparedRequestExecutionContext;
}): PreparedRequestFinalizeContext {
  return buildPreparedRequestFinalizeFields(params.preparedRequest);
}

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
  return buildPreparedFinalRequestTextFromBuilder(params);
}
