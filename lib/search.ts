import { runSearchService } from "@/lib/search-domain/searchService";
import type { SearchRequest } from "@/lib/search-domain/types";
import type { SearchContext } from "@/types/task";

export type SearchResponse = {
  text: string;
  sources: {
    title: string;
    link: string;
  }[];
};

function toLegacySearchResponse(context: SearchContext): SearchResponse {
  return {
    text: context.rawText || context.summaryText || context.aiSummary || "",
    sources: (context.sources || []).map((item) => ({
      title: item.title,
      link: item.link,
    })),
  };
}

export async function searchWithMode(request: SearchRequest): Promise<SearchContext> {
  return runSearchService(request);
}

export async function searchGoogle(query: string): Promise<SearchResponse> {
  const context = await runSearchService({
    query,
    mode: "normal",
    engines: ["google_search"],
    maxResults: 5,
  });
  return toLegacySearchResponse(context);
}
