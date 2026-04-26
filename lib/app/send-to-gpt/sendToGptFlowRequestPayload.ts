import type { ChatApiRequestPayload } from "@/lib/app/send-to-gpt/sendToGptApiTypes";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";
import type { Message } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export function buildChatApiRequestPayload(params: {
  requestMemory: unknown;
  recentMessages: Message[];
  input: string;
  storedLibraryContext: string;
  storedDocumentContext?: string;
  forcedSearchQuery?: string;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchAskAiModeLink?: string;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  instructionMode: string;
  reasoningMode: ReasoningMode;
}) {
  const payload: ChatApiRequestPayload = {
    mode: "chat",
    memory: params.requestMemory,
    recentMessages: params.recentMessages,
    input: params.input,
    storedSearchContext: "",
    storedDocumentContext: params.storedDocumentContext || "",
    storedLibraryContext: params.storedLibraryContext,
    searchMode: params.searchMode,
    searchEngines: params.searchEngines,
    searchLocation: params.searchLocation,
    instructionMode: params.instructionMode,
    reasoningMode: params.reasoningMode,
  };

  if (params.forcedSearchQuery) {
    payload.forcedSearchQuery = params.forcedSearchQuery;
  }
  if (params.searchSeriesId) {
    payload.searchSeriesId = params.searchSeriesId;
  }
  if (params.searchContinuationToken) {
    payload.searchContinuationToken = params.searchContinuationToken;
  }
  if (params.searchAskAiModeLink) {
    payload.searchAskAiModeLink = params.searchAskAiModeLink;
  }

  return payload;
}
