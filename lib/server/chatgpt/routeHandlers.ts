import { NextResponse } from "next/server";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";
import {
  buildChatRouteResponse,
  buildMapLinkShortcutResponse,
} from "@/lib/server/chatgpt/responseBuilders";
import {
  normalizeChatMessages,
  normalizeInstructionMode,
  normalizeMemoryInput,
  normalizeReasoningMode,
} from "@/lib/server/chatgpt/requestNormalization";
import {
  buildChatCompletionMessages,
  buildChatPromptMetrics,
  buildChatSearchPayload,
  buildMemoryCompactionPrompt,
  wantsGoogleMapsLink,
} from "@/lib/server/chatgpt/routeBuilders";
import { executeSearchRequest } from "@/lib/server/chatgpt/searchExecution";
import { resolveSearchRequest } from "@/lib/server/chatgpt/searchRequest";

export async function handleChatRoute(body: Record<string, unknown>) {
  const {
    memory,
    recentMessages,
    input,
    instructionMode,
    reasoningMode,
    storedSearchContext,
    storedDocumentContext,
    storedLibraryContext,
    forcedSearchQuery,
    searchSeriesId,
    searchContinuationToken,
    searchAskAiModeLink,
    searchMode,
    searchEngines,
    searchLocation,
  } = body;

  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "input missing" }, { status: 400 });
  }

  const normalizedMemory = normalizeMemoryInput(memory);
  const safeInstructionMode = normalizeInstructionMode(instructionMode);
  const safeReasoningMode = normalizeReasoningMode(reasoningMode);

  const resolvedSearch = resolveSearchRequest({
    input,
    forcedSearchQuery:
      typeof forcedSearchQuery === "string" ? forcedSearchQuery : undefined,
    searchSeriesId:
      typeof searchSeriesId === "string" ? searchSeriesId : undefined,
  });
  const searchQuery = resolvedSearch.searchQuery;
  const parsedContinuation = resolvedSearch.continuation;
  const useSearch = resolvedSearch.useSearch;

  let searchPromptText = "";
  let searchEvidenceText = "";
  let sources: {
    title: string;
    link: string;
    snippet?: string;
    sourceType?: string;
    publishedAt?: string;
    thumbnailUrl?: string;
    channelName?: string;
    duration?: string;
    viewCount?: string | number;
    videoId?: string;
  }[] = [];
  let returnedSearchContinuationToken = "";

  const buildSearchPayload = () =>
    buildChatSearchPayload({
      sources,
      searchUsed: useSearch,
      searchQuery: parsedContinuation.cleanQuery || searchQuery || "",
      searchSeriesId: resolvedSearch.effectiveSeriesId,
      searchContinuationToken: returnedSearchContinuationToken,
      searchEvidence: searchEvidenceText,
    });

  if (useSearch && searchQuery) {
    const executedSearch = await executeSearchRequest({
      query: parsedContinuation.cleanQuery || searchQuery,
      searchMode,
      searchEngines,
      searchSeriesId: resolvedSearch.effectiveSeriesId || undefined,
      searchContinuationToken:
        typeof searchContinuationToken === "string"
          ? searchContinuationToken
          : undefined,
      searchAskAiModeLink:
        typeof searchAskAiModeLink === "string"
          ? searchAskAiModeLink
          : undefined,
      searchLocation:
        typeof searchLocation === "string" ? searchLocation : undefined,
    });

    searchPromptText = executedSearch.searchPromptText;
    searchEvidenceText = executedSearch.searchEvidenceText;
    returnedSearchContinuationToken =
      executedSearch.returnedSearchContinuationToken;
    sources = executedSearch.sources;

    if (wantsGoogleMapsLink(input)) {
      const mapLikeSource =
        executedSearch.rawSources.find((source) => {
          const link =
            typeof source.link === "string" ? source.link.toLowerCase() : "";
          return (
            link.includes("google.com/maps") ||
            link.includes("maps.google") ||
            link.includes("google.com/search")
          );
        }) || null;

      if (mapLikeSource?.link) {
        return NextResponse.json(
          buildMapLinkShortcutResponse({
            title: mapLikeSource.title,
            link: mapLikeSource.link,
            search: buildSearchPayload(),
          })
        );
      }
    }
  }

  const messages = buildChatCompletionMessages({
    normalizedMemory,
    reasoningMode: safeReasoningMode,
    instructionMode: safeInstructionMode,
    input,
    recentMessages,
    storedLibraryContext,
    storedSearchContext,
    storedDocumentContext,
      searchQuery:
        useSearch && searchQuery ? parsedContinuation.cleanQuery || searchQuery : "",
    searchText: searchPromptText,
  });
  const promptMetrics = buildChatPromptMetrics({
    messages,
    normalizedMemory,
    reasoningMode: safeReasoningMode,
    instructionMode: safeInstructionMode,
    input,
    recentMessages,
    storedLibraryContext,
    storedSearchContext,
    storedDocumentContext,
      searchQuery:
        useSearch && searchQuery ? parsedContinuation.cleanQuery || searchQuery : "",
    searchText: searchPromptText,
  });

  const { text: reply, usage, usageDetails } = await callOpenAIResponses(
    { input: messages },
    "GPT reply not found."
  );

  return NextResponse.json(
    buildChatRouteResponse({
      reply,
      usage,
      usageDetails,
      search: buildSearchPayload(),
      promptMetrics,
    })
  );
}

export async function handleCompactRecentRoute(body: Record<string, unknown>) {
  const { memory, messages } = body;
  const normalizedMemory = normalizeMemoryInput(memory);
  const safeMessages = normalizeChatMessages(messages);
  const recentKeep =
    typeof body.recentKeep === "number" && Number.isFinite(body.recentKeep)
      ? Math.max(1, Math.floor(body.recentKeep))
      : 4;
  const prompt = buildMemoryCompactionPrompt({
    normalizedMemory,
    safeMessages,
    recentKeep,
  });

  const { text: compactedText, usage } = await callOpenAIResponses(
    { input: prompt },
    ""
  );

  return NextResponse.json({
    compactedText: compactedText.trim(),
    usage,
  });
}

export async function handleMemoryInterpretRoute(body: Record<string, unknown>) {
  const { input } = body;

  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "input missing" }, { status: 400 });
  }

  const { text: reply, usage, usageDetails } = await callOpenAIResponses(
    { input },
    "{}"
  );

  return NextResponse.json({
    reply,
    usage,
    usageDetails,
  });
}

