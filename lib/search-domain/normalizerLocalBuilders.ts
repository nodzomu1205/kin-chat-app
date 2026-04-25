import type {
  NormalizedSearchPayload,
  SearchRequest,
} from "@/lib/search-domain/types";
import { buildLocalRawBlock } from "@/lib/search-domain/normalizerRawBlocks";
import type { SearchLocalResultItem, SearchSourceItem } from "@/types/task";

export type LocalResult = {
  title?: string;
  address?: string;
  link?: string;
  place_id_search?: string;
  website?: string;
  links?: { directions?: string };
  rating?: number;
  reviews?: number;
  description?: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

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

function resolveLocalResultLink(item: LocalResult, fallbackLink?: string) {
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

export function normalizeLocalResults(
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

export function localResultsToSources(
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

export function collectLocalLikeItems(raw: Record<string, unknown>) {
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

export function buildLocalSearchPayload(args: {
  request: SearchRequest;
  engine: "google_maps" | "google_local";
  localItems: LocalResult[];
  localResults: SearchLocalResultItem[];
  sources: SearchSourceItem[];
}): NormalizedSearchPayload {
  return {
    summaryText:
      args.localResults.length > 0
        ? `${args.request.query} について、地域関連の結果を ${args.localResults.length} 件整理しました。`
        : `${args.request.query} について、有効な地域関連結果を見つけられませんでした。`,
    rawText: buildLocalRawBlock(
      args.engine === "google_maps" ? "Google Maps" : "Google Local",
      args.localItems
    ),
    sources: args.sources,
    localResults: args.localResults,
    metadata: { engine: args.engine, resultCount: args.localResults.length },
  };
}
