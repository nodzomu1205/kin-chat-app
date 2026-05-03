import { buildTaskChatBridgeContext } from "@/lib/task/taskChatBridge";
import { buildFinalRequestText } from "@/lib/app/send-to-gpt/sendToGptFlowRequestText";
import type { PendingRequestLike } from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import type {
  PreparedRequestContextSource,
  PreparedRequestExecutionContext,
  PreparedRequestFinalizeContext,
  PreparedRequestGateContext,
} from "@/lib/app/send-to-gpt/sendToGptPreparedRequestTypes";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
import type { SearchEngine } from "@/types/task";
import type { TaskRuntimeState } from "@/types/taskProtocol";
import type { TaskCharConstraint } from "@/lib/app/multipart/multipartAssemblyFlow";

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
  libraryImageDataRequestEvent?: PreparedRequestContextSource["searchRequestEvent"];
  pptDesignRequestEvent?: PreparedRequestContextSource["pptDesignRequestEvent"];
  draftPreparationRequestEvent?: PreparedRequestContextSource["draftPreparationRequestEvent"];
  draftModificationRequestEvent?: PreparedRequestContextSource["draftModificationRequestEvent"];
  fileSaveRequestEvent?: PreparedRequestContextSource["fileSaveRequestEvent"];
  recentMessages?: Message[];
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
  imageLibraryReferenceCount?: number;
  createUserMessage: (rawText: string) => Message;
  buildLibraryReferenceContext: () => string;
  recentMessages?: Message[];
  currentTaskCharConstraint?: TaskCharConstraint;
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
    currentTaskCharConstraint: params.currentTaskCharConstraint,
    limitViolation: params.buildLimitViolation(),
    finalRequestText: buildPreparedFinalRequestText({
      rawText: params.rawText,
      currentTaskId: params.currentTaskId,
      taskContext,
      derivedContext: params.derivedContext,
      referenceLibraryItems: params.referenceLibraryItems,
      libraryIndexResponseCount: params.libraryIndexResponseCount,
      imageLibraryReferenceCount: params.imageLibraryReferenceCount,
      recentMessages: params.recentMessages,
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
    pptDesignRequestEvent: preparedRequest.pptDesignRequestEvent,
    fileSaveRequestEvent: preparedRequest.fileSaveRequestEvent,
    libraryReferenceContext: preparedRequest.libraryReferenceContext,
    currentTaskCharConstraint: preparedRequest.currentTaskCharConstraint,
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
    draftPreparationRequestEvent: preparedRequest.draftPreparationRequestEvent,
    pptDesignRequestEvent: preparedRequest.pptDesignRequestEvent,
    draftModificationRequestEvent: preparedRequest.draftModificationRequestEvent,
    fileSaveRequestEvent: preparedRequest.fileSaveRequestEvent,
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
  imageLibraryReferenceCount?: number;
  recentMessages?: Message[];
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
    libraryImageDataRequestEvent:
      params.derivedContext.libraryImageDataRequestEvent,
    draftPreparationRequestEvent:
      params.derivedContext.draftPreparationRequestEvent,
    pptDesignRequestEvent: params.derivedContext.pptDesignRequestEvent,
    draftModificationRequestEvent:
      params.derivedContext.draftModificationRequestEvent,
    fileSaveRequestEvent: params.derivedContext.fileSaveRequestEvent,
    referenceLibraryItems: params.referenceLibraryItems,
    libraryIndexResponseCount: params.libraryIndexResponseCount,
    imageLibraryReferenceCount: params.imageLibraryReferenceCount,
    recentMessages: params.recentMessages,
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
