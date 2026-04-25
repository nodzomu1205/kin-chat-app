import {
  buildProtocolSearchMessageParts,
  buildProtocolSearchRecordArgs,
  buildSourceItems,
} from "@/lib/app/send-to-gpt/sendToGptFlowResponseBuilders";
import { buildUserResponseBlock } from "@/lib/task/taskRuntimeProtocol";
import type {
  ChatApiSearchLike,
  PendingRequestLike,
  ProtocolSearchResponseArtifactsArgs,
  ProtocolTaskEventLike,
  SearchContextRecorder,
  SearchResponseEventLike,
  SearchSource,
  WrappedSearchResponse,
} from "@/lib/app/send-to-gpt/sendToGptFlowTypes";
import type { SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export function toSourceItems(sources?: SearchSource[]): SourceItem[] {
  return buildSourceItems(sources);
}

export function wrapProtocolAssistantText(params: {
  assistantText: string;
  askGptEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
}) {
  let nextAssistantText = params.assistantText;

  if (params.askGptEvent && !nextAssistantText.includes("<<SYS_GPT_RESPONSE>>")) {
    nextAssistantText = [
      "<<SYS_GPT_RESPONSE>>",
      `TASK_ID: ${params.askGptEvent.taskId || params.currentTaskId || ""}`,
      `ACTION_ID: ${params.askGptEvent.actionId || ""}`,
      `BODY: ${nextAssistantText}`,
      "<<END_SYS_GPT_RESPONSE>>",
    ].join("\n");
  }

  if (
    params.requestToAnswer &&
    params.requestAnswerBody &&
    !nextAssistantText.includes("<<SYS_USER_RESPONSE>>")
  ) {
    nextAssistantText = buildUserResponseBlock({
      taskId: params.requestToAnswer.taskId,
      actionId: params.requestToAnswer.actionId,
      body: nextAssistantText,
    });
  }

  return nextAssistantText;
}

export function buildProtocolSearchResponseArtifacts(
  params: ProtocolSearchResponseArtifactsArgs
) {
  const requestedMode = params.searchRequestEvent.outputMode || "summary";
  const normalizedSources = toSourceItems(params.data.sources);
  const recordedSearch = params.data.searchUsed
    ? params.recordSearchContext(
        buildProtocolSearchRecordArgs({
          ...params,
          normalizedSources,
          requestedMode,
        })
      )
    : null;
  const { assistantText } = buildProtocolSearchMessageParts({
    params,
    normalizedSources,
    requestedMode,
    recordedSearch,
  });

  return {
    assistantText,
    normalizedSources,
    recordedSearch,
    requestedMode,
  };
}

export function buildAssistantResponseArtifacts(params: {
  data: ChatApiSearchLike;
  parseWrappedSearchResponse: (text: string) => WrappedSearchResponse;
  askGptEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  searchRequestEvent?: SearchResponseEventLike;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  recordSearchContext: SearchContextRecorder;
}) {
  let assistantText =
    typeof params.data.reply === "string" && params.data.reply.trim()
      ? params.data.reply.trim()
      : "GPT did not return a usable response.";
  let normalizedSources: SourceItem[] = [];

  assistantText = wrapProtocolAssistantText({
    assistantText,
    askGptEvent: params.askGptEvent,
    currentTaskId: params.currentTaskId,
    requestToAnswer: params.requestToAnswer,
    requestAnswerBody: params.requestAnswerBody,
  });

  if (params.searchRequestEvent) {
    const wrappedSearchResponse =
      typeof params.data.reply === "string" &&
      params.data.reply.includes("<<SYS_SEARCH_RESPONSE>>")
        ? params.parseWrappedSearchResponse(params.data.reply)
        : null;
    const searchArtifacts = buildProtocolSearchResponseArtifacts({
      data: params.data,
      searchRequestEvent: params.searchRequestEvent,
      currentTaskId: params.currentTaskId,
      wrappedSearchResponse,
      effectiveSearchMode: params.effectiveSearchMode,
      effectiveSearchEngines: params.effectiveSearchEngines,
      effectiveSearchLocation: params.effectiveSearchLocation,
      searchSeriesId: params.searchSeriesId,
      cleanQuery: params.cleanQuery,
      recordSearchContext: params.recordSearchContext,
    });
    normalizedSources = searchArtifacts.normalizedSources;
    assistantText = searchArtifacts.assistantText;
  } else if (params.data.searchUsed) {
    normalizedSources = toSourceItems(params.data.sources);
  }

  return {
    assistantText,
    normalizedSources,
  };
}
