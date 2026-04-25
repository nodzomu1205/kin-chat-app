import type { FinalizeSendToGptFlowArgs } from "@/lib/app/send-to-gpt/sendToGptFlowTypes";

export function buildFinalizeAssistantMessageArgs(args: FinalizeSendToGptFlowArgs) {
  return {
    assistantText: args.assistantText,
    normalizedSources: args.normalizedSources,
    sourceType: args.data.searchUsed ? "search" : "gpt_input",
  } as const;
}

export function buildFinalizeProtocolSideEffectArgs(
  args: FinalizeSendToGptFlowArgs
) {
  return {
    assistantText: args.assistantText,
    ingestProtocolMessage: args.ingestProtocolMessage,
    requestToAnswer: args.preparedRequest.requestToAnswer,
    requestAnswerBody: args.preparedRequest.requestAnswerBody,
    taskProtocolAnswerPendingRequest: args.taskProtocolAnswerPendingRequest,
  };
}

export function buildFinalizeImplicitSearchArgs(
  args: FinalizeSendToGptFlowArgs
) {
  return {
    data: args.data,
    searchRequestEvent: args.preparedRequest.searchRequestEvent,
    effectiveSearchMode: args.preparedRequest.effectiveSearchMode,
    effectiveSearchEngines: args.preparedRequest.effectiveSearchEngines,
    effectiveSearchLocation: args.preparedRequest.effectiveSearchLocation,
    searchSeriesId: args.preparedRequest.searchSeriesId,
    cleanQuery: args.preparedRequest.cleanQuery,
    effectiveParsedSearchQuery: args.preparedRequest.effectiveParsedSearchQuery,
    finalRequestText: args.preparedRequest.finalRequestText,
    applySearchUsage: args.applySearchUsage,
    applyChatUsage: args.applyChatUsage,
    recordSearchContext: args.recordSearchContext,
  };
}

export function buildFinalizeMemoryFollowUpArgs(args: {
  updatedRecent: FinalizeSendToGptFlowArgs["memoryContext"]["recentWithUser"];
  previousCommittedTopic?: string;
  handleGptMemory: FinalizeSendToGptFlowArgs["handleGptMemory"];
  applyChatUsage: FinalizeSendToGptFlowArgs["applyChatUsage"];
  applyCompressionUsage: FinalizeSendToGptFlowArgs["applyCompressionUsage"];
}) {
  return {
    updatedRecent: args.updatedRecent,
    previousCommittedTopic: args.previousCommittedTopic,
    handleGptMemory: args.handleGptMemory,
    applyChatUsage: args.applyChatUsage,
    applyCompressionUsage: args.applyCompressionUsage,
  };
}

