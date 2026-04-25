import type {
  ParsedInputLike,
  PendingRequestLike,
} from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import type { SearchEngine, SearchMode } from "@/types/task";
import {
  buildDerivedSearchContext,
  buildProtocolInteractionContext,
} from "@/lib/app/send-to-gpt/sendToGptFlowContextBuilders";
import {
  extractInlineSearchQuery,
  resolveAiContinuationArtifacts,
  resolveProtocolSearchOverrides,
} from "@/lib/app/send-to-gpt/sendToGptFlowContextResolvers";
export {
  extractInlineSearchQuery,
  resolveAiContinuationArtifacts,
  resolveProtocolLimitViolation,
  resolveProtocolSearchOverrides,
} from "@/lib/app/send-to-gpt/sendToGptFlowContextResolvers";

export function extractProtocolInteractionContext(params: {
  rawText: string;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
}) {
  return buildProtocolInteractionContext({
    rawText: params.rawText,
    findPendingRequest: params.findPendingRequest,
    resolveRequestAnswerContext,
  });
}

export function resolveDerivedSearchContext(params: {
  rawText: string;
  parsedInput: ParsedInputLike;
  searchRequestEvent?: {
    query?: string;
    searchEngine?: string;
    searchLocation?: string;
  };
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
}) {
  return buildDerivedSearchContext({
    parsedInput: params.parsedInput,
    searchRequestEvent: params.searchRequestEvent,
    searchMode: params.searchMode,
    searchEngines: params.searchEngines,
    searchLocation: params.searchLocation,
    inlineSearchQuery: extractInlineSearchQuery(params.rawText),
    resolveProtocolSearchOverrides,
    resolveAiContinuationArtifacts,
    getContinuationTokenForSeries: params.getContinuationTokenForSeries,
    getAskAiModeLinkForQuery: params.getAskAiModeLinkForQuery,
  });
}

export function resolveRequestAnswerContext(params: {
  rawText: string;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
}) {
  const reqAnswerMatch = params.rawText.match(
    /^REQ\s+([A-Z]\d+)\s+.+?:\s*([\s\S]*)$/i
  );
  const requestAnswerId = reqAnswerMatch?.[1]?.trim() || "";
  const requestAnswerBody = reqAnswerMatch?.[2]?.trim() || "";
  const requestToAnswer = requestAnswerId
    ? params.findPendingRequest(requestAnswerId)
    : null;

  return {
    requestToAnswer,
    requestAnswerBody,
  };
}

export function deriveProtocolSearchContext(params: {
  rawText: string;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedInputLike;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
}) {
  const protocolContext = extractProtocolInteractionContext({
    rawText: params.rawText,
    findPendingRequest: params.findPendingRequest,
  });
  const parsedInput = params.applyPrefixedTaskFieldsFromText(params.rawText);
  const derivedSearchContext = resolveDerivedSearchContext({
    rawText: params.rawText,
    parsedInput,
    searchRequestEvent: protocolContext.searchRequestEvent,
    searchMode: params.searchMode,
    searchEngines: params.searchEngines,
    searchLocation: params.searchLocation,
    getContinuationTokenForSeries: params.getContinuationTokenForSeries,
    getAskAiModeLinkForQuery: params.getAskAiModeLinkForQuery,
  });

  return {
    ...protocolContext,
    parsedInput,
    ...derivedSearchContext,
  };
}
