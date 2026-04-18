import { NextResponse } from "next/server";
import { safeParseMemory } from "@/lib/memory";
import {
  callOpenAIResponses,
  extractOpenAIJsonObjectText,
} from "@/lib/server/chatgpt/openaiClient";
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
  buildChatSearchPayload,
  buildMemoryUpdatePrompt,
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

  let searchText = "";
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
      searchEvidence: searchText,
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

    searchText = executedSearch.searchText;
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
    searchText,
  });

  const { text: reply, usage } = await callOpenAIResponses(
    { input: messages },
    "GPT reply not found."
  );

  return NextResponse.json(
    buildChatRouteResponse({
      reply,
      usage,
      search: buildSearchPayload(),
    })
  );
}

export async function handleSummarizeRoute(body: Record<string, unknown>) {
  const { memory, messages } = body;
  const normalizedMemory = normalizeMemoryInput(memory);
  const safeMessages = normalizeChatMessages(messages);
  const prompt = buildMemoryUpdatePrompt({
    normalizedMemory,
    safeMessages,
  });

  const { text: rawMemory, usage } = await callOpenAIResponses(
    { input: prompt },
    JSON.stringify(normalizedMemory)
  );

  const parsedMemory = safeParseMemory(
    extractOpenAIJsonObjectText(rawMemory, JSON.stringify(normalizedMemory))
  );

  return NextResponse.json({
    memory: parsedMemory,
    usage,
  });
}

export async function handleMemoryInterpretRoute(body: Record<string, unknown>) {
  const { input } = body;

  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "input missing" }, { status: 400 });
  }

  const { text: reply, usage } = await callOpenAIResponses({ input }, "{}");

  return NextResponse.json({
    reply,
    usage,
  });
}
