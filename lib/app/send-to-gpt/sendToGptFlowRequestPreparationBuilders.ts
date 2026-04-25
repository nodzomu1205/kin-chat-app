import { buildTaskChatBridgeContext } from "@/lib/taskChatBridge";
import { buildFinalRequestText } from "@/lib/app/send-to-gpt/sendToGptFlowRequestText";
import type {
  PendingRequestLike,
  PreparedRequestContextSource,
  PreparedRequestExecutionContext,
  PreparedRequestFinalizeContext,
  PreparedRequestGateContext,
} from "@/lib/app/send-to-gpt/sendToGptFlowTypes";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
import type { SearchEngine } from "@/types/task";
import type { TaskRuntimeState } from "@/types/taskProtocol";

type PreparedFinalRequestDerivedContext = {
  parsedInput: PreparedRequestContextSource["parsedInput"];
  effectiveParsedSearchQuery: string;
  askGptEvent?: PreparedRequestContextSource["askGptEvent"];
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  searchRequestEvent?: PreparedRequestContextSource["searchRequestEvent"];
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  libraryIndexRequestEvent?: PreparedRequestContextSource["searchRequestEvent"];
  libraryItemRequestEvent?: PreparedRequestContextSource["searchRequestEvent"];
};

export function buildPreparedRequestArtifactBase(params: {
  derivedContext: Omit<
    PreparedRequestContextSource,
    | "userMsg"
    | "limitViolation"
    | "finalRequestText"
    | "libraryReferenceContext"
    | "effectiveDocumentReferenceContext"
  >;
  rawText: string;
  currentTaskId: string | null;
  taskProtocolRuntime: TaskRuntimeState;
  shouldInjectTaskContextWithSettings: (userInput: string) => boolean;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  createUserMessage: (rawText: string) => Message;
  buildLibraryReferenceContext: () => string;
  buildLimitViolation: () => string | null;
}) {
  const taskContext = resolveInjectedTaskContext({
    rawText: params.rawText,
    currentTaskId: params.currentTaskId,
    taskProtocolRuntime: params.taskProtocolRuntime,
    shouldInjectTaskContextWithSettings: params.shouldInjectTaskContextWithSettings,
  });

  return {
    ...params.derivedContext,
    userMsg: params.createUserMessage(params.rawText),
    limitViolation: params.buildLimitViolation(),
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

export function buildPreparedRequestGateFields(
  preparedRequest: PreparedRequestContextSource
): PreparedRequestGateContext {
  return {
    parsedInput: preparedRequest.parsedInput,
    effectiveParsedSearchQuery: preparedRequest.effectiveParsedSearchQuery,
    limitViolation: preparedRequest.limitViolation,
    userMsg: preparedRequest.userMsg,
    youtubeTranscriptRequestEvent: preparedRequest.youtubeTranscriptRequestEvent,
  };
}

export function buildPreparedRequestExecutionFields(
  preparedRequest: PreparedRequestContextSource
): PreparedRequestExecutionContext {
  return {
    finalRequestText: preparedRequest.finalRequestText,
    storedDocumentContext: preparedRequest.effectiveDocumentReferenceContext,
    storedLibraryContext: preparedRequest.libraryReferenceContext,
    cleanQuery: preparedRequest.continuationDetails.cleanQuery,
    searchRequestEvent: preparedRequest.searchRequestEvent,
    effectiveParsedSearchQuery: preparedRequest.effectiveParsedSearchQuery,
    searchSeriesId: preparedRequest.searchSeriesId,
    continuationToken: preparedRequest.continuationToken,
    askAiModeLink: preparedRequest.askAiModeLink,
    effectiveSearchMode: preparedRequest.effectiveSearchMode,
    effectiveSearchEngines: preparedRequest.effectiveSearchEngines,
    effectiveSearchLocation: preparedRequest.effectiveSearchLocation,
    askGptEvent: preparedRequest.askGptEvent,
    requestToAnswer: preparedRequest.requestToAnswer,
    requestAnswerBody: preparedRequest.requestAnswerBody,
  };
}

export function buildPreparedRequestFinalizeFields(
  preparedRequest: PreparedRequestExecutionContext
): PreparedRequestFinalizeContext {
  return {
    searchRequestEvent: preparedRequest.searchRequestEvent,
    effectiveSearchMode: preparedRequest.effectiveSearchMode,
    effectiveSearchEngines: preparedRequest.effectiveSearchEngines,
    effectiveSearchLocation: preparedRequest.effectiveSearchLocation,
    searchSeriesId: preparedRequest.searchSeriesId,
    cleanQuery: preparedRequest.cleanQuery,
    effectiveParsedSearchQuery: preparedRequest.effectiveParsedSearchQuery,
    finalRequestText: preparedRequest.finalRequestText,
    requestToAnswer: preparedRequest.requestToAnswer,
    requestAnswerBody: preparedRequest.requestAnswerBody,
  };
}

export function buildPreparedFinalRequestText(params: {
  rawText: string;
  currentTaskId: string | null;
  taskContext: string;
  derivedContext: PreparedFinalRequestDerivedContext;
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
