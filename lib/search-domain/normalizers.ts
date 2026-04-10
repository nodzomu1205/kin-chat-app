import type {
  NormalizedSearchPayload,
  SearchEngineResult,
  SearchRequest,
} from "@/lib/search-domain/types";
import type { SearchLocalResultItem, SearchSourceItem } from "@/types/task";

type OrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
  date?: string;
};

type LocalResult = {
  title?: string;
  address?: string;
  link?: string;
  place_id_search?: string;
  website?: string;
  links?: {
    directions?: string;
  };
  rating?: number;
  reviews?: number;
  description?: string;
};

function isGoogleMapsUrl(value?: string) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    normalized.includes("google.com/maps") ||
    normalized.includes("maps.google") ||
    (normalized.includes("google.com/search") && normalized.includes("udm=1"))
  );
}

function buildGoogleMapsPlaceLink(item: LocalResult) {
  const query = [item.title, item.address].filter(Boolean).join(" ").trim();
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

type AskAiModeItem = {
  question?: string;
  title?: string;
  snippet?: string;
  link?: string;
  serpapi_link?: string;
};

type AiModeListItem = {
  snippet?: string;
};

type AiModeTextBlock = {
  type?: string;
  snippet?: string;
  list?: AiModeListItem[];
  reference_indexes?: number[];
};

type GenericRecord = Record<string, unknown>;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeSources(
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

function buildRawBlock(label: string, items: SearchSourceItem[]) {
  if (items.length === 0) return `${label}\n- No items found`;
  return [
    label,
    ...items.map((item) =>
      [
        `- ${item.title}`,
        item.link ? `  URL: ${item.link}` : "",
        item.snippet ? `  Snippet: ${item.snippet}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    ),
  ].join("\n");
}

function resolveLocalResultLink(
  item: LocalResult,
  fallbackLink?: string
) {
  const explicitMapLink = [item.link, item.place_id_search].find((link) =>
    isGoogleMapsUrl(link)
  );
  const generatedPlaceLink = buildGoogleMapsPlaceLink(item);

  return (
    explicitMapLink ||
    generatedPlaceLink ||
    fallbackLink ||
    item.links?.directions ||
    item.website ||
    ""
  );
}

function normalizeLocalResults(
  items: LocalResult[],
  fallbackLink?: string
): SearchLocalResultItem[] {
  return items
    .filter((item) => item.title)
    .map((item) => ({
      title: item.title || "Untitled",
      address: item.address,
      link: resolveLocalResultLink(item, fallbackLink),
      rating: typeof item.rating === "number" ? item.rating : undefined,
      reviews: typeof item.reviews === "number" ? item.reviews : undefined,
    }));
}

function localResultsToSources(
  items: LocalResult[],
  sourceType: string,
  fallbackLink?: string
): SearchSourceItem[] {
  return items
    .filter((item) => item.title && resolveLocalResultLink(item, fallbackLink))
    .map((item) => ({
      title: item.title || "Untitled",
      link: resolveLocalResultLink(item, fallbackLink),
      snippet: item.description || item.address,
      sourceType,
    }));
}

function buildLocalRawBlock(label: string, items: LocalResult[]) {
  if (items.length === 0) return `${label}\n- No local results found`;
  return [
    label,
    ...items.map((item) =>
      [
        `- ${item.title || "Untitled"}`,
        item.address ? `  Address: ${item.address}` : "",
        typeof item.rating === "number" ? `  Rating: ${item.rating}` : "",
        typeof item.reviews === "number" ? `  Reviews: ${item.reviews}` : "",
        item.website ? `  Website: ${item.website}` : "",
        item.links?.directions ? `  Directions: ${item.links.directions}` : "",
        item.link ? `  Link: ${item.link}` : "",
        item.place_id_search ? `  Place: ${item.place_id_search}` : "",
        item.description ? `  Description: ${item.description}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    ),
  ].join("\n");
}

function collectLocalLikeItems(raw: Record<string, unknown>) {
  const localResults = asArray<LocalResult>(raw.local_results);
  if (localResults.length > 0) return localResults;

  const placesResults = asArray<LocalResult>(raw.places_results);
  if (placesResults.length > 0) return placesResults;

  const placeResults = raw.place_results;
  if (placeResults && typeof placeResults === "object") {
    return [placeResults as LocalResult];
  }

  const placeResult = raw.place_result;
  if (placeResult && typeof placeResult === "object") {
    return [placeResult as LocalResult];
  }

  return [];
}

function normalizeAskAiModeItems(value: unknown): AskAiModeItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => item as AskAiModeItem)
    .filter(
      (item) =>
        item.question || item.title || item.snippet || item.link || item.serpapi_link
    );
}

function buildAskAiModeBlock(items: AskAiModeItem[]) {
  if (items.length === 0) return "";
  return [
    "Ask AI Mode",
    ...items.map((item) =>
      [
        `- ${item.question || item.title || item.snippet || "Ask AI follow-up"}`,
        item.link ? `  URL: ${item.link}` : "",
        item.serpapi_link ? `  SerpApi: ${item.serpapi_link}` : "",
        item.snippet ? `  Snippet: ${item.snippet}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    ),
  ].join("\n");
}

function formatReferenceIndexes(referenceIndexes?: number[]) {
  if (!referenceIndexes || referenceIndexes.length === 0) return "";
  return ` [refs: ${referenceIndexes.join(", ")}]`;
}

function normalizeComparableText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function buildAiModeSummary(blocks: AiModeTextBlock[]) {
  const snippets = blocks.flatMap((block) => {
    if (block.type === "list" && Array.isArray(block.list)) {
      return block.list
        .map((item) => item.snippet?.trim())
        .filter(Boolean) as string[];
    }
    return block.snippet?.trim() ? [block.snippet.trim()] : [];
  });

  if (snippets.length === 0) return "";

  return snippets.join("\n");
}

function buildAiModeRawBlock(blocks: AiModeTextBlock[], fullText?: string) {
  if (blocks.length === 0) {
    if (fullText?.trim()) {
      return ["Google AI Mode", "", fullText.trim()].join("\n");
    }
    return "Google AI Mode\n- No structured AI blocks available";
  }

  const lines: string[] = ["Google AI Mode"];
  const trimmedFullText = fullText?.trim() || "";
  const blockSummary = normalizeComparableText(buildAiModeSummary(blocks));

  if (
    trimmedFullText &&
    normalizeComparableText(trimmedFullText) !== blockSummary
  ) {
    lines.push("");
    lines.push(trimmedFullText);
  }

  blocks.forEach((block) => {
    const refSuffix = formatReferenceIndexes(block.reference_indexes);

    if (block.type === "heading" && block.snippet?.trim()) {
      lines.push("");
      lines.push(`## ${block.snippet.trim()}${refSuffix}`);
      return;
    }

    if (block.type === "list" && Array.isArray(block.list) && block.list.length > 0) {
      lines.push("");
      block.list.forEach((item) => {
        const text = item.snippet?.trim();
        if (text) {
          lines.push(`- ${text}${refSuffix}`);
        }
      });
      return;
    }

    if (block.snippet?.trim()) {
      lines.push("");
      lines.push(`${block.snippet.trim()}${refSuffix}`);
    }
  });

  return lines.join("\n").trim();
}

function isPlainObject(value: unknown): value is GenericRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toCellText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (isPlainObject(value)) {
    const candidateKeys = ["text", "value", "title", "label", "snippet", "name"];
    for (const key of candidateKeys) {
      const cellValue = value[key];
      if (typeof cellValue === "string" && cellValue.trim()) {
        return cellValue.trim();
      }
      if (typeof cellValue === "number" || typeof cellValue === "boolean") {
        return String(cellValue);
      }
    }
  }
  return "";
}

function formatTableRows(rows: unknown[]) {
  const normalizedRows = rows
    .map((row) => {
      if (Array.isArray(row)) {
        return row.map(toCellText).filter(Boolean);
      }
      if (isPlainObject(row)) {
        return Object.values(row).map(toCellText).filter(Boolean);
      }
      return [];
    })
    .filter((cells) => cells.length > 0);

  if (normalizedRows.length === 0) return "";

  return normalizedRows.map((cells) => `| ${cells.join(" | ")} |`).join("\n");
}

function extractAiModeTables(raw: GenericRecord) {
  const sections: string[] = [];
  const seen = new Set<string>();

  const visit = (value: unknown, path: string[] = []) => {
    if (Array.isArray(value)) {
      if (
        path[path.length - 1] &&
        /(table|tables|grid|rows|columns)/i.test(path[path.length - 1]) &&
        value.length > 0
      ) {
        const formatted = formatTableRows(value);
        if (formatted && !seen.has(formatted)) {
          seen.add(formatted);
          const label = path[path.length - 1]
            .replace(/_/g, " ")
            .replace(/\b\w/g, (m) => m.toUpperCase());
          sections.push(`${label}\n${formatted}`);
        }
      }

      value.forEach((item) => visit(item, path));
      return;
    }

    if (!isPlainObject(value)) return;

    Object.entries(value).forEach(([key, child]) => {
      const lowerKey = key.toLowerCase();

      if (Array.isArray(child) && /(table|tables|grid|rows)/i.test(lowerKey)) {
        const formatted = formatTableRows(child);
        if (formatted && !seen.has(formatted)) {
          seen.add(formatted);
          const label = key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
          sections.push(`${label}\n${formatted}`);
        }
      }

      visit(child, [...path, key]);
    });
  };

  visit(raw, []);
  return sections;
}

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
    const rawSections = [buildRawBlock("Google Search", sources)];
    const askAiModeBlock = buildAskAiModeBlock(askAiModeItems);
    if (askAiModeBlock) rawSections.push(askAiModeBlock);

    return {
      summaryText:
        sources.length > 0
          ? `${request.query} について、通常検索から ${sources.length} 件の候補を取得しました。`
          : `${request.query} について通常検索で明確な候補を取得できませんでした。`,
      rawText: rawSections.join("\n\n"),
      sources,
      metadata: {
        engine: result.engine,
        resultCount: sources.length,
        askAiModeItems,
      },
    };
  }

  if (result.engine === "google_news") {
    const sources = normalizeSources(
      asArray<OrganicResult>(
        (result.raw as { news_results?: unknown }).news_results
      ),
      "news"
    );

    return {
      summaryText:
        sources.length > 0
          ? `${request.query} について、ニュース検索から ${sources.length} 件の関連記事を取得しました。`
          : `${request.query} についてニュース検索で関連記事を取得できませんでした。`,
      rawText: buildRawBlock("Google News", sources),
      sources,
      metadata: { engine: result.engine, resultCount: sources.length },
    };
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
    return {
      summaryText:
        localResults.length > 0
          ? `${request.query} について、地域候補を ${localResults.length} 件取得しました。`
          : `${request.query} について、有効な地域候補を取得できませんでした。`,
      rawText: buildLocalRawBlock(
        result.engine === "google_maps" ? "Google Maps" : "Google Local",
        localItems
      ),
      sources,
      localResults,
      metadata: { engine: result.engine, resultCount: localResults.length },
    };
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
  const rawSections: string[] = [buildAiModeRawBlock(textBlocks, aiFullText)];
  const aiTables = extractAiModeTables(result.raw as GenericRecord);

  if (aiTables.length > 0) {
    rawSections.push(...aiTables);
  }

  if (fallbackSources.length > 0) {
    rawSections.push(buildRawBlock("Supporting links", fallbackSources));
  }

  return {
    summaryText:
      aiSummary || `${request.query} について AI mode の要約を取得できませんでした。`,
    aiSummary,
    rawText: rawSections.join("\n\n"),
    sources: fallbackSources,
    metadata: {
      engine: result.engine,
      resultCount: fallbackSources.length,
      rawBlocks: textBlocks,
      aiTables,
    },
  };
}

export function mergeNormalizedPayloads(
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
