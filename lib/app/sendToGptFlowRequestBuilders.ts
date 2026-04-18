import { buildChatApiRequestPayload } from "@/lib/app/sendToGptFlowRequestPayload";
import type {
  GptAssistantRequestPayloadArgs,
  RequestGptAssistantArtifactsArgs,
} from "@/lib/app/sendToGptFlowTypes";

export function buildGptAssistantRequestArgs(
  args: RequestGptAssistantArtifactsArgs
): GptAssistantRequestPayloadArgs {
  return {
    requestMemory: args.requestMemory,
    recentMessages: args.recentMessages,
    finalRequestText: args.finalRequestText,
    storedDocumentContext: args.storedDocumentContext,
    storedLibraryContext: args.storedLibraryContext,
    cleanQuery: args.cleanQuery,
    searchRequestEvent: args.searchRequestEvent,
    effectiveParsedSearchQuery: args.effectiveParsedSearchQuery,
    searchSeriesId: args.searchSeriesId,
    continuationToken: args.continuationToken,
    askAiModeLink: args.askAiModeLink,
    effectiveSearchMode: args.effectiveSearchMode,
    effectiveSearchEngines: args.effectiveSearchEngines,
    effectiveSearchLocation: args.effectiveSearchLocation,
    instructionMode: args.instructionMode,
    responseMode: args.responseMode,
  };
}

export function buildChatApiSearchRequestPayload(
  args: GptAssistantRequestPayloadArgs
) {
  return buildChatApiRequestPayload({
    requestMemory: args.requestMemory,
    recentMessages: args.recentMessages,
    input: args.finalRequestText,
    storedDocumentContext: args.storedDocumentContext,
    storedLibraryContext: args.storedLibraryContext,
    forcedSearchQuery:
      args.cleanQuery ||
      args.searchRequestEvent?.query ||
      args.effectiveParsedSearchQuery ||
      undefined,
    searchSeriesId: args.searchSeriesId,
    searchContinuationToken: args.continuationToken || undefined,
    searchAskAiModeLink: args.askAiModeLink || undefined,
    searchMode: args.effectiveSearchMode,
    searchEngines: args.effectiveSearchEngines,
    searchLocation: args.effectiveSearchLocation,
    instructionMode: args.instructionMode,
    reasoningMode: args.responseMode,
  });
}
