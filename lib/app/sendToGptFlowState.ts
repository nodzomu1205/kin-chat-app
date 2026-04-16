import { createEmptyMemory, type Memory } from "@/lib/memory";
import type {
  ChatApiSearchLike,
  GptStateSnapshotLike,
  PendingRequestLike,
  SearchContextRecorder,
  SearchResponseEventLike,
} from "@/lib/app/sendToGptFlowTypes";
import type { Message } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export function resolveMemoryUpdateContext(params: {
  gptState: GptStateSnapshotLike;
  userMessage: Message;
  chatRecentLimit: number;
}) {
  const baseRecent = params.gptState.recentMessages || [];
  const recentWithUser = [...baseRecent, params.userMessage].slice(
    -params.chatRecentLimit
  );
  const previousCommittedTopic =
    typeof params.gptState.memory?.context?.currentTopic === "string"
      ? params.gptState.memory.context.currentTopic
      : undefined;

  return {
    baseRecent,
    recentWithUser,
    previousCommittedTopic,
  };
}

export function resolveRequestMemory(params: {
  gptState: GptStateSnapshotLike;
}): Memory {
  return (params.gptState.memory as Memory | undefined) || createEmptyMemory();
}

export function appendRecentAssistantMessage(params: {
  recentMessages: Message[];
  assistantMessage: Message;
  chatRecentLimit: number;
}) {
  return [...params.recentMessages, params.assistantMessage].slice(
    -params.chatRecentLimit
  );
}

export function handleImplicitSearchArtifacts(params: {
  data: ChatApiSearchLike;
  searchRequestEvent?: SearchResponseEventLike;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  effectiveParsedSearchQuery?: string;
  finalRequestText: string;
  applySearchUsage: (usage: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0]) => void;
  applyChatUsage: (usage: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0]) => void;
  recordSearchContext: SearchContextRecorder;
}) {
  if (params.data.searchUsed && !params.searchRequestEvent) {
    params.applySearchUsage(params.data.usage);
    params.recordSearchContext({
      mode: params.effectiveSearchMode,
      engines: params.effectiveSearchEngines,
      location: params.effectiveSearchLocation || undefined,
      seriesId:
        typeof params.data.searchSeriesId === "string"
          ? params.data.searchSeriesId
          : params.searchSeriesId,
      continuationToken:
        typeof params.data.searchContinuationToken === "string"
          ? params.data.searchContinuationToken
          : undefined,
      query:
        (typeof params.data.searchQuery === "string" && params.data.searchQuery.trim()) ||
        params.cleanQuery ||
        params.effectiveParsedSearchQuery ||
        params.finalRequestText,
      summaryText:
        typeof params.data.reply === "string" && params.data.reply.trim()
          ? params.data.reply
          : "",
      rawText:
        typeof params.data.searchEvidence === "string" ? params.data.searchEvidence : "",
      metadata:
        typeof params.data.searchSeriesId === "string" ||
        typeof params.data.searchContinuationToken === "string"
          ? {
              seriesId:
                typeof params.data.searchSeriesId === "string"
                  ? params.data.searchSeriesId
                  : params.searchSeriesId,
              subsequentRequestToken:
                typeof params.data.searchContinuationToken === "string"
                  ? params.data.searchContinuationToken
                  : undefined,
            }
          : undefined,
      sources: params.data.sources?.map((source) => ({
        title: source.title || "",
        link: source.link || "",
        snippet: source.snippet,
        sourceType: source.sourceType,
        publishedAt: source.publishedAt,
        thumbnailUrl: source.thumbnailUrl,
        channelName: source.channelName,
        duration: source.duration,
        viewCount: source.viewCount,
        videoId: source.videoId,
      })) || [],
    });
    return;
  }

  if (!params.searchRequestEvent) {
    params.applyChatUsage(params.data.usage);
  }
}

export function applyProtocolAssistantSideEffects(params: {
  assistantText: string;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  taskProtocolAnswerPendingRequest: (requestId: string, answerText: string) => void;
}) {
  params.ingestProtocolMessage(params.assistantText, "gpt_to_kin");

  if (params.requestToAnswer && params.requestAnswerBody) {
    params.taskProtocolAnswerPendingRequest(
      params.requestToAnswer.id,
      params.requestAnswerBody
    );
  }
}
