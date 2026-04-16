import { buildTaskChatBridgeContext } from "@/lib/taskChatBridge";
import {
  deriveProtocolSearchContext,
  resolveProtocolLimitViolation,
} from "@/lib/app/sendToGptFlowContext";
import { buildFinalRequestText } from "@/lib/app/sendToGptFlowRequestText";
import type {
  ParsedInputLike,
  PendingRequestLike,
} from "@/lib/app/sendToGptFlowTypes";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";
import type { TaskRuntimeState } from "@/types/taskProtocol";

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
  const limitViolation = resolveProtocolLimitViolation({
    askGptEvent: params.derivedContext.askGptEvent,
    searchRequestEvent: params.derivedContext.searchRequestEvent,
    youtubeTranscriptRequestEvent: params.derivedContext.youtubeTranscriptRequestEvent,
    userQuestionEvent: params.derivedContext.userQuestionEvent,
    libraryIndexRequestEvent: params.derivedContext.libraryIndexRequestEvent,
    libraryItemRequestEvent: params.derivedContext.libraryItemRequestEvent,
    currentTaskId: params.currentTaskId,
    getProtocolLimitViolation: params.getProtocolLimitViolation,
  });

  return {
    ...params.derivedContext,
    userMsg: params.createUserMessage(params.rawText),
    limitViolation,
    finalRequestText: buildFinalRequestText({
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
      taskContext,
    }),
    libraryReferenceContext: params.buildLibraryReferenceContext(),
    effectiveDocumentReferenceContext: "",
  };
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
