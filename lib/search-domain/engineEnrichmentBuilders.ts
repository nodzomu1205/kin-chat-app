import { buildSearchResultSnippetSeed } from "@/lib/search-domain/extractorBuilders";

export function extractOrganicResults(
  raw: Record<string, unknown>,
  key: "organic_results" | "news_results"
) {
  const value = raw[key];
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

export async function enrichSnippetResults(args: {
  items: Array<Record<string, unknown>>;
  limit: number;
  query: string;
  fetchPageSnippet: (result: {
    title?: string;
    link?: string;
    snippet?: string;
  }, query: string) => Promise<string>;
}) {
  return Promise.all(
    args.items.slice(0, args.limit).map(async (item) => ({
      ...item,
      snippet: await args.fetchPageSnippet(
        buildSearchResultSnippetSeed(item),
        args.query
      ),
    }))
  );
}
