import { buildLimitExceededBlock, extractTaskProtocolEvents } from "@/lib/taskRuntimeProtocol";
import { shouldInjectTaskContext } from "@/lib/taskChatBridge";
import type { UseGptMessageActionsArgs } from "@/hooks/chatPageActionTypes";
import type {
  SendToGptFlowMemoryArgs,
  SendToGptFlowProtocolArgs,
  SendToGptFlowRequestArgs,
  SendToGptFlowSearchArgs,
  SendToGptFlowUiArgs,
} from "@/lib/app/sendToGptFlowTypes";

export function parseWrappedSearchResponseText(text: string) {
  const event = extractTaskProtocolEvents(text).find(
    (candidate) => candidate.type === "search_response"
  );
  if (!event) return null;

  const rawExcerptMatch = text.match(
    /RAW_EXCERPT:\s*([\s\S]*?)<<END_SYS_SEARCH_RESPONSE>>/
  );

  return {
    query: event.query,
    outputMode: event.outputMode,
    summary: event.summary || event.body || "",
    rawResultId: event.rawResultId,
    rawExcerpt: rawExcerptMatch?.[1]?.trim() || "",
  };
}

export function getProtocolLimitViolationForGptActions(
  args: UseGptMessageActionsArgs,
  event: {
    type:
      | "ask_gpt"
      | "search_request"
      | "user_question"
      | "library_reference"
      | "youtube_transcript_request";
    taskId?: string;
    actionId?: string;
  }
) {
  const kind =
    event.type === "ask_gpt"
      ? "ask_gpt"
      : event.type === "search_request"
        ? "search_request"
        : event.type === "youtube_transcript_request"
          ? "youtube_transcript_request"
          : event.type === "library_reference"
            ? "library_reference"
            : "ask_user";
  const requirement = args.taskProtocol.runtime.requirementProgress.find(
    (item) => item.kind === kind
  );
  if (!requirement || typeof requirement.targetCount !== "number") return null;
  if ((requirement.completedCount ?? 0) <= requirement.targetCount) return null;

  const label =
    kind === "ask_gpt"
      ? "GPT request"
      : kind === "search_request"
        ? "web search request"
        : kind === "youtube_transcript_request"
          ? "YouTube transcript request"
          : kind === "library_reference"
            ? "library reference request"
            : "user question";

  return buildLimitExceededBlock({
    taskId: event.taskId || args.taskProtocol.runtime.currentTaskId || "",
    actionId: event.actionId,
    summary: `This ${label} exceeds the allowed limit for the current task, so do not continue with it.`,
  });
}

export function buildCommonSendToGptFlowArgs(args: UseGptMessageActionsArgs): {
  protocolArgs: SendToGptFlowProtocolArgs;
  searchArgs: SendToGptFlowSearchArgs;
  memoryArgs: SendToGptFlowMemoryArgs;
  uiArgs: SendToGptFlowUiArgs;
  requestArgs: SendToGptFlowRequestArgs;
} {
  return {
    protocolArgs: {
      taskProtocolRuntime: args.taskProtocol.runtime,
      currentTaskId: args.taskProtocol.runtime.currentTaskId,
      findPendingRequest: (requestId: string) =>
        args.taskProtocol.runtime.pendingRequests.find(
          (item) => item.id === requestId || item.actionId === requestId
        ) || null,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getProtocolLimitViolation: (event) =>
        getProtocolLimitViolationForGptActions(args, event),
      shouldInjectTaskContextWithSettings: (userInput: string) =>
        shouldInjectTaskContext({
          userInput,
          settings: args.chatBridgeSettings,
        }),
      referenceLibraryItems: args.referenceLibraryItems,
      libraryIndexResponseCount: args.libraryIndexResponseCount,
      buildLibraryReferenceContext: args.buildLibraryReferenceContext,
      taskProtocolAnswerPendingRequest: args.taskProtocol.answerPendingRequest,
      ingestProtocolMessage: args.ingestProtocolMessage,
    },
    searchArgs: {
      searchMode: args.searchMode,
      searchEngines: args.searchEngines,
      searchLocation: args.searchLocation,
      parseWrappedSearchResponse: parseWrappedSearchResponseText,
      recordSearchContext: args.recordSearchContext,
      getContinuationTokenForSeries: args.getContinuationTokenForSeries,
      getAskAiModeLinkForQuery: args.getAskAiModeLinkForQuery,
      applySearchUsage: args.applySearchUsage,
      applyChatUsage: args.applyChatUsage,
    },
    memoryArgs: {
      handleGptMemory: args.gptMemoryRuntime.handleGptMemory,
      applySummaryUsage: args.applySummaryUsage,
      chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
      gptStateRef: args.gptMemoryRuntime.gptStateRef,
    },
    uiArgs: {
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setKinInput: args.setKinInput,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setActiveTabToKin: args.focusKinPanel,
    },
    requestArgs: {
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      instructionMode: "normal",
      processMultipartTaskDoneText: args.processMultipartTaskDoneText,
      responseMode: args.responseMode,
      recordIngestedDocument: args.recordIngestedDocument,
    },
  };
}
