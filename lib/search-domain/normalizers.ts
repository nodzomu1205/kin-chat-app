import type {
  NormalizedSearchPayload,
  SearchEngineResult,
  SearchRequest,
} from "@/lib/search-domain/types";
import {
  asArray,
  buildAiModePayload,
  buildGoogleNewsPayload,
  buildGoogleSearchPayload,
  buildLocalSearchPayload,
  buildMergedNormalizedPayload,
  buildYoutubeSearchPayload,
  collectLocalLikeItems,
  extractAiModeTables,
  normalizeAskAiModeItems,
  normalizeLocalResults,
  normalizeSources,
  normalizeYoutubeSources,
  localResultsToSources,
  buildAiModeSummary,
  type AiModeTextBlock,
} from "@/lib/search-domain/normalizerBuilders";

type GenericRecord = Record<string, unknown>;
type OrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
};
type YoutubeVideoResult = {
  title?: string;
  link?: string;
  snippet?: string;
  published_date?: string;
  channel?: {
    name?: string;
  };
  views?: string | number;
  length?: string;
  thumbnail?: {
    static?: string;
    rich?: string;
  };
};

export function normalizeEngineResult(
  result: SearchEngineResult,
  request: SearchRequest
): NormalizedSearchPayload {
  if (result.engine === "google_search") {
    const sources = normalizeSources(
      asArray<OrganicResult>(
        (result.raw as { organic_results?: unknown }).organic_results
      ),
      "organic"
    );
    const askAiModeItems = normalizeAskAiModeItems(
      (result.raw as { ask_ai_mode?: unknown }).ask_ai_mode
    );

    return buildGoogleSearchPayload({
      request,
      sources,
      askAiModeItems,
    });
  }

  if (result.engine === "google_news") {
    const sources = normalizeSources(
      asArray<OrganicResult>(
        (result.raw as { news_results?: unknown }).news_results
      ),
      "news"
    );

    return buildGoogleNewsPayload({ request, sources });
  }

  if (result.engine === "youtube_search") {
    const videoResults = asArray<YoutubeVideoResult>(
      (result.raw as { video_results?: unknown }).video_results
    );
    const sources = normalizeYoutubeSources(videoResults);

    return buildYoutubeSearchPayload({ request, sources });
  }

  if (result.engine === "google_maps" || result.engine === "google_local") {
    const rawWithMeta = result.raw as {
      local_results?: unknown;
      places_results?: unknown;
      place_results?: unknown;
      place_result?: unknown;
      search_metadata?: {
        google_local_url?: string;
        google_maps_url?: string;
      };
    };
    const localItems = collectLocalLikeItems(rawWithMeta);
    const fallbackLocalLink =
      typeof rawWithMeta.search_metadata?.google_maps_url === "string"
        ? rawWithMeta.search_metadata.google_maps_url
        : typeof rawWithMeta.search_metadata?.google_local_url === "string"
          ? rawWithMeta.search_metadata.google_local_url
          : undefined;
    const localResults = normalizeLocalResults(localItems, fallbackLocalLink);
    const sources = localResultsToSources(
      localItems,
      result.engine === "google_maps" ? "maps" : "local",
      fallbackLocalLink
    );

    return buildLocalSearchPayload({
      request,
      engine: result.engine,
      localItems,
      localResults,
      sources,
    });
  }

  const aiData = result.raw as {
    ai_mode_result?: { text?: string; snippet?: string };
    answer_box?: { answer?: string; snippet?: string };
    text_blocks?: unknown;
    organic_results?: unknown;
  };

  const textBlocks = asArray<AiModeTextBlock>(aiData.text_blocks);
  const aiSummary =
    aiData.ai_mode_result?.text?.trim() ||
    aiData.ai_mode_result?.snippet?.trim() ||
    aiData.answer_box?.answer?.trim() ||
    aiData.answer_box?.snippet?.trim() ||
    buildAiModeSummary(textBlocks) ||
    "";

  const fallbackSources = normalizeSources(
    asArray<OrganicResult>(aiData.organic_results),
    "ai_mode"
  );

  const aiFullText =
    aiData.ai_mode_result?.text?.trim() ||
    aiData.answer_box?.answer?.trim() ||
    aiData.answer_box?.snippet?.trim() ||
    "";
  const aiTables = extractAiModeTables(result.raw as GenericRecord);

  return buildAiModePayload({
    request,
    aiSummary,
    textBlocks,
    fullText: aiFullText,
    fallbackSources,
    aiTables,
    engine: result.engine,
  });
}

export function mergeNormalizedPayloads(
  payloads: NormalizedSearchPayload[]
): NormalizedSearchPayload {
  return buildMergedNormalizedPayload(payloads);
}
