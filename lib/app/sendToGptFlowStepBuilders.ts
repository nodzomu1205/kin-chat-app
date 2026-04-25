import { generateId } from "@/lib/uuid";
import {
  buildPreparedRequestContexts,
  prepareSendToGptRequest,
} from "@/lib/app/sendToGptFlowRequestPreparation";
import { prepareSendToGptMemoryContext } from "@/lib/app/sendToGptFlowState";
import type {
  ChatApiSearchLike,
  ParsedInputLike,
  PreparedRequestFinalizeContext,
  RunSendToGptFlowArgs,
} from "@/lib/app/sendToGptFlowTypes";
import type { Message, SourceItem } from "@/types/chat";

export type SendToGptFlowStepArgs = RunSendToGptFlowArgs & {
  extractInlineUrlTarget: (text: string) => string | null;
  shouldRespondToTaskDirectiveOnlyInput: (params: {
    parsedInput: ParsedInputLike;
    effectiveParsedSearchQuery: string;
  }) => boolean;
  taskDirectiveOnlyResponseText: string;
};

export function buildSendToGptFlowStepArgs(
  args: RunSendToGptFlowArgs & {
    extractInlineUrlTarget: SendToGptFlowStepArgs["extractInlineUrlTarget"];
    shouldRespondToTaskDirectiveOnlyInput: SendToGptFlowStepArgs["shouldRespondToTaskDirectiveOnlyInput"];
    taskDirectiveOnlyResponseText: string;
  }
): SendToGptFlowStepArgs {
  return {
    ...args,
  };
}

export function buildSendToGptPrePreparationGateArgs(args: {
  flowArgs: SendToGptFlowStepArgs;
  rawText: string;
}) {
  return {
    rawText: args.rawText,
    processMultipartTaskDoneText: args.flowArgs.processMultipartTaskDoneText,
    extractInlineUrlTarget: args.flowArgs.extractInlineUrlTarget,
    setGptMessages: args.flowArgs.setGptMessages,
    setGptInput: args.flowArgs.setGptInput,
    setGptLoading: args.flowArgs.setGptLoading,
  };
}

export function buildPreparedSendToGptRequestBundle(args: {
  flowArgs: SendToGptFlowStepArgs;
  rawText: string;
}) {
  const preparedRequest = prepareSendToGptRequest({
    rawText: args.rawText,
    currentTaskId: args.flowArgs.currentTaskId,
    taskProtocolRuntime: args.flowArgs.taskProtocolRuntime,
    findPendingRequest: args.flowArgs.findPendingRequest,
    applyPrefixedTaskFieldsFromText:
      args.flowArgs.applyPrefixedTaskFieldsFromText,
    searchMode: args.flowArgs.searchMode,
    searchEngines: args.flowArgs.searchEngines,
    searchLocation: args.flowArgs.searchLocation,
    getContinuationTokenForSeries: args.flowArgs.getContinuationTokenForSeries,
    getAskAiModeLinkForQuery: args.flowArgs.getAskAiModeLinkForQuery,
    getProtocolLimitViolation: args.flowArgs.getProtocolLimitViolation,
    shouldInjectTaskContextWithSettings:
      args.flowArgs.shouldInjectTaskContextWithSettings,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
    libraryIndexResponseCount: args.flowArgs.libraryIndexResponseCount,
    buildLibraryReferenceContext: args.flowArgs.buildLibraryReferenceContext,
    createUserMessage: (text) => ({
      id: generateId(),
      role: "user",
      text,
    }),
  });

  return {
    preparedRequest,
    preparedRequestContexts: buildPreparedRequestContexts({
      preparedRequest,
    }),
  };
}

export function buildSendToGptPreparedRequestGateArgs(args: {
  flowArgs: SendToGptFlowStepArgs;
  preparedRequest: ReturnType<
    typeof buildPreparedSendToGptRequestBundle
  >["preparedRequestContexts"]["gate"];
}) {
  return {
    preparedRequest: args.preparedRequest,
    shouldRespondToTaskDirectiveOnlyInput:
      args.flowArgs.shouldRespondToTaskDirectiveOnlyInput,
    taskDirectiveOnlyResponseText: args.flowArgs.taskDirectiveOnlyResponseText,
    currentTaskId: args.flowArgs.currentTaskId,
    onHandleYoutubeTranscriptRequest:
      args.flowArgs.onHandleYoutubeTranscriptRequest,
    setGptMessages: args.flowArgs.setGptMessages,
    setGptInput: args.flowArgs.setGptInput,
    setGptLoading: args.flowArgs.setGptLoading,
    setKinInput: args.flowArgs.setKinInput,
    setPendingKinInjectionBlocks: args.flowArgs.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.flowArgs.setPendingKinInjectionIndex,
    setActiveTabToKin: args.flowArgs.setActiveTabToKin,
    recordIngestedDocument: args.flowArgs.recordIngestedDocument,
    ingestProtocolMessage: args.flowArgs.ingestProtocolMessage,
    gptStateRef: args.flowArgs.gptStateRef,
    chatRecentLimit: args.flowArgs.chatRecentLimit,
    handleGptMemory: args.flowArgs.handleGptMemory,
    applyChatUsage: args.flowArgs.applyChatUsage,
    applyCompressionUsage: args.flowArgs.applyCompressionUsage,
    applyIngestUsage: args.flowArgs.applyIngestUsage,
  };
}

export function buildSendToGptExecutionBundle(args: {
  flowArgs: SendToGptFlowStepArgs;
  preparedRequest: ReturnType<
    typeof buildPreparedSendToGptRequestBundle
  >["preparedRequest"];
  executionContext: ReturnType<
    typeof buildPreparedSendToGptRequestBundle
  >["preparedRequestContexts"]["execution"];
}) {
  const { memoryContext, requestMemory } = prepareSendToGptMemoryContext({
    gptState: args.flowArgs.gptStateRef.current,
    userMessage: args.preparedRequest.userMsg,
    chatRecentLimit: args.flowArgs.chatRecentLimit,
  });

  return {
    memoryContext,
    requestStartArgs: {
      userMessage: args.preparedRequest.userMsg,
      setGptMessages: args.flowArgs.setGptMessages,
      setGptInput: args.flowArgs.setGptInput,
      setGptLoading: args.flowArgs.setGptLoading,
    },
    assistantRequestArgs: {
      requestMemory,
      recentMessages: memoryContext.recentWithUser,
      ...args.executionContext,
      instructionMode: args.flowArgs.instructionMode ?? "normal",
      responseMode: args.flowArgs.responseMode,
      parseWrappedSearchResponse: args.flowArgs.parseWrappedSearchResponse,
      currentTaskId: args.flowArgs.currentTaskId,
      recordSearchContext: args.flowArgs.recordSearchContext,
    },
  };
}

export function buildSendToGptFlowPreparedPhase(args: {
  flowArgs: SendToGptFlowStepArgs;
  rawText: string;
}) {
  const prePreparationGateArgs = buildSendToGptPrePreparationGateArgs({
    flowArgs: args.flowArgs,
    rawText: args.rawText,
  });
  const preparedRequestBundle = buildPreparedSendToGptRequestBundle({
    flowArgs: args.flowArgs,
    rawText: args.rawText,
  });
  const preparedRequestGateArgs = buildSendToGptPreparedRequestGateArgs({
    flowArgs: args.flowArgs,
    preparedRequest: preparedRequestBundle.preparedRequestContexts.gate,
  });
  const executionBundle = buildSendToGptExecutionBundle({
    flowArgs: args.flowArgs,
    preparedRequest: preparedRequestBundle.preparedRequest,
    executionContext: preparedRequestBundle.preparedRequestContexts.execution,
  });

  return {
    prePreparationGateArgs,
    preparedRequestBundle,
    preparedRequestGateArgs,
    executionBundle,
  };
}

export function buildSendToGptFinalizeArgs(args: {
  flowArgs: SendToGptFlowStepArgs;
  preparedRequest: PreparedRequestFinalizeContext;
  memoryContext: {
    recentWithUser: Message[];
    previousCommittedTopic?: string;
  };
  data: ChatApiSearchLike;
  assistantText: string;
  normalizedSources: SourceItem[];
}) {
  return {
    data: args.data,
    assistantText: args.assistantText,
    normalizedSources: args.normalizedSources,
    memoryContext: args.memoryContext,
    chatRecentLimit: args.flowArgs.chatRecentLimit,
    preparedRequest: args.preparedRequest,
    ingestProtocolMessage: args.flowArgs.ingestProtocolMessage,
    taskProtocolAnswerPendingRequest:
      args.flowArgs.taskProtocolAnswerPendingRequest,
    setGptMessages: args.flowArgs.setGptMessages,
    applySearchUsage: args.flowArgs.applySearchUsage,
    applyChatUsage: args.flowArgs.applyChatUsage,
    recordSearchContext: args.flowArgs.recordSearchContext,
    handleGptMemory: args.flowArgs.handleGptMemory,
    applyCompressionUsage: args.flowArgs.applyCompressionUsage,
  };
}

