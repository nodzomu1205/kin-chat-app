import { buildAssistantResponseArtifacts } from "@/lib/app/send-to-gpt/sendToGptFlowResponse";
import type {
  ChatApiRequestPayload,
  ChatApiSearchLike,
} from "@/lib/app/send-to-gpt/sendToGptApiTypes";
import type {
  GptAssistantRequestPayloadArgs,
  RequestGptAssistantArtifactsArgs,
} from "@/lib/app/send-to-gpt/sendToGptFlowArtifactTypes";
import type { SourceItem } from "@/types/chat";
import {
  buildChatApiSearchRequestPayload,
  buildGptAssistantRequestArgs,
} from "@/lib/app/send-to-gpt/sendToGptFlowRequestBuilders";

export async function requestGptAssistantArtifacts(
  args: RequestGptAssistantArtifactsArgs
): Promise<{
  data: ChatApiSearchLike;
  assistantText: string;
  normalizedSources: SourceItem[];
}> {
  const requestArgs = buildGptAssistantRequestArgs(args);
  const data = await fetchChatApiSearchData(
    buildGptAssistantRequestPayload(requestArgs)
  );

  const { assistantText, normalizedSources } = buildAssistantResponseArtifacts({
    data,
    parseWrappedSearchResponse: args.parseWrappedSearchResponse,
    askGptEvent: args.askGptEvent,
    currentTaskId: args.currentTaskId,
    requestToAnswer: args.requestToAnswer,
    requestAnswerBody: args.requestAnswerBody,
    searchRequestEvent: args.searchRequestEvent,
    effectiveSearchMode: args.effectiveSearchMode,
    effectiveSearchEngines: args.effectiveSearchEngines,
    effectiveSearchLocation: args.effectiveSearchLocation,
    searchSeriesId: args.searchSeriesId,
    cleanQuery: args.cleanQuery,
    recordSearchContext: args.recordSearchContext,
  });

  return {
    data,
    assistantText,
    normalizedSources,
  };
}

export function buildGptAssistantRequestPayload(
  args: GptAssistantRequestPayloadArgs
) {
  return buildChatApiSearchRequestPayload(args);
}

async function fetchChatApiSearchData(payload: ChatApiRequestPayload) {
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as ChatApiSearchLike & {
    error?: unknown;
  };

  if (!res.ok) {
    const message =
      typeof data?.error === "string" && data.error.trim()
        ? data.error.trim()
        : `Chat API request failed (${res.status} ${res.statusText || "unknown"})`;
    throw new Error(message);
  }

  return data;
}
