import type {
  NormalizedSearchPayload,
  SearchRequest,
} from "@/lib/search-domain/types";
import {
  buildAiModePayload,
  buildAiModeSummary,
  buildAskAiModeBlock,
  extractAiModeTables,
  normalizeAskAiModeItems,
  type AskAiModeItem,
  type AiModeTextBlock,
} from "@/lib/search-domain/normalizerAiModeBuilders";
import {
  buildLocalSearchPayload,
  collectLocalLikeItems,
  localResultsToSources,
  normalizeLocalResults,
  type LocalResult,
} from "@/lib/search-domain/normalizerLocalBuilders";
import {
  buildRawBlock,
} from "@/lib/search-domain/normalizerRawBlocks";
import {
  buildYoutubeSearchPayload,
  normalizeYoutubeSources,
  type YoutubeVideoResult,
} from "@/lib/search-domain/normalizerYoutubeBuilders";
import type { SearchSourceItem } from "@/types/task";

type OrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
};

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeSources(
  items: OrganicResult[],
  sourceType: string
): SearchSourceItem[] {
  return items
    .filter((item) => item.title && item.link)
    .map((item) => ({
      title: item.title || "Untitled",
      link: item.link || "",
      snippet: item.snippet,
      sourceType,
      publishedAt: item.date,
    }));
}

function dedupeSources(items: SearchSourceItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.link}::${item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildGoogleSearchPayload(args: {
  request: SearchRequest;
  sources: SearchSourceItem[];
  askAiModeItems: AskAiModeItem[];
}): NormalizedSearchPayload {
  const rawSections = [buildRawBlock("Google Search", args.sources)];
  const askAiModeBlock = buildAskAiModeBlock(args.askAiModeItems);
  if (askAiModeBlock) rawSections.push(askAiModeBlock);

  return {
    summaryText:
      args.sources.length > 0
        ? `${args.request.query} について、検索結果から ${args.sources.length} 件の参考情報を整理しました。`
        : `${args.request.query} について検索結果で有効な参考情報を見つけられませんでした。`,
    rawText: rawSections.join("\n\n"),
    sources: args.sources,
    metadata: {
      engine: "google_search",
      resultCount: args.sources.length,
      askAiModeItems: args.askAiModeItems,
    },
  };
}

export function buildGoogleNewsPayload(args: {
  request: SearchRequest;
  sources: SearchSourceItem[];
}): NormalizedSearchPayload {
  return {
    summaryText:
      args.sources.length > 0
        ? `${args.request.query} について、ニュース検索から ${args.sources.length} 件の関連記事を整理しました。`
        : `${args.request.query} についてニュース検索で関連記事を見つけられませんでした。`,
    rawText: buildRawBlock("Google News", args.sources),
    sources: args.sources,
    metadata: { engine: "google_news", resultCount: args.sources.length },
  };
}

export function buildMergedNormalizedPayload(
  payloads: NormalizedSearchPayload[]
): NormalizedSearchPayload {
  const summaryText = payloads
    .map((payload) => payload.summaryText?.trim())
    .filter(Boolean)
    .join("\n");
  const aiSummary = payloads
    .map((payload) => payload.aiSummary?.trim())
    .filter(Boolean)
    .join("\n\n");
  const rawText = payloads
    .map((payload) => payload.rawText?.trim())
    .filter(Boolean)
    .join("\n\n");
  const sources = dedupeSources(
    payloads.flatMap((payload) => payload.sources ?? [])
  );

  return {
    summaryText,
    aiSummary,
    rawText,
    sources,
    localResults: payloads.flatMap((payload) => payload.localResults ?? []),
    products: payloads.flatMap((payload) => payload.products ?? []),
    metadata: {
      engines: payloads
        .map((payload) => payload.metadata?.engine)
        .filter(Boolean),
      rawBlocks: payloads.flatMap((payload) =>
        Array.isArray(payload.metadata?.rawBlocks)
          ? (payload.metadata?.rawBlocks as unknown[])
          : []
      ),
    },
  };
}

export {
  buildAiModePayload,
  buildAiModeSummary,
  buildLocalSearchPayload,
  buildYoutubeSearchPayload,
  collectLocalLikeItems,
  extractAiModeTables,
  localResultsToSources,
  normalizeLocalResults,
  normalizeAskAiModeItems,
  normalizeYoutubeSources,
};

export type { AiModeTextBlock, LocalResult, YoutubeVideoResult };
