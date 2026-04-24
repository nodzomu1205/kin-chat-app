import { NextResponse } from "next/server";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";
import { cleanImportSummarySource } from "@/lib/app/importSummaryText";
import { parseTaskInput } from "@/lib/taskInputParser";
import { generateLibrarySummary } from "@/lib/server/librarySummary/summaryService";
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

export function isPlainSearchOnlyInput(input: string) {
  const parsed = parseTaskInput(input);
  return !!(
    parsed.searchQuery.trim() &&
    !parsed.freeText.trim() &&
    !parsed.title.trim() &&
    !parsed.userInstruction.trim()
  );
}

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
  let generatedSearchSummary = "";
  let searchSummaryGenerated = false;
  let searchContextText = "";
  let searchSummaryUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let searchSummaryUsageDetails: Record<string, unknown> | null = null;

  const buildSearchPayload = () =>
    buildChatSearchPayload({
      sources,
      searchUsed: useSearch,
      searchQuery: parsedContinuation.cleanQuery || searchQuery || "",
      searchSeriesId: resolvedSearch.effectiveSeriesId,
      searchContinuationToken: returnedSearchContinuationToken,
      searchEvidence: searchEvidenceText,
      searchSummaryText: generatedSearchSummary || searchPromptText,
      searchSummaryGenerated,
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
    searchContextText = searchEvidenceText || searchPromptText;
    returnedSearchContinuationToken =
      executedSearch.returnedSearchContinuationToken;
    sources = executedSearch.sources;

    if (searchEvidenceText.trim()) {
      try {
        const {
          text: summaryReply,
          usage: summaryUsage,
          usageDetails: summaryUsageDetails,
        } = await generateLibrarySummary({
          title: parsedContinuation.cleanQuery || searchQuery,
          text: searchEvidenceText,
        });
        generatedSearchSummary = cleanImportSummarySource(summaryReply).trim();
        if (summaryUsage) {
          searchSummaryUsage = summaryUsage;
        }
        searchSummaryUsageDetails =
          summaryUsageDetails && typeof summaryUsageDetails === "object"
            ? summaryUsageDetails
            : null;
        if (generatedSearchSummary) {
          searchPromptText = generatedSearchSummary;
          searchSummaryGenerated = true;
        }
      } catch (error) {
        console.warn("Search summary generation failed", error);
      }
    }

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

    if (isPlainSearchOnlyInput(input) && searchPromptText.trim()) {
      return NextResponse.json(
        buildChatRouteResponse({
          reply: searchPromptText,
          usage: searchSummaryUsage,
          usageDetails: searchSummaryUsageDetails,
          search: buildSearchPayload(),
          promptMetrics: {
            messageCount: 0,
            systemMessageCount: 0,
            recentMessageCount: 0,
            totalChars: 0,
            systemChars: 0,
            baseSystemChars: 0,
            memoryChars: 0,
            storedLibraryChars: 0,
            storedSearchChars: 0,
            storedDocumentChars: 0,
            searchPromptChars: 0,
            recentChars: 0,
            recentUserChars: 0,
            recentAssistantChars: 0,
            rawInputChars: input.length,
            wrappedInputChars: input.length,
          },
        })
      );
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
    searchText: searchContextText,
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
    searchText: searchContextText,
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

