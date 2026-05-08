import { buildSearchResultSnippetSeed } from "@/lib/search-domain/extractorBuilders";

export function extractOrganicResults(
  raw: Record<string, unknown>,
  key: "organic_results" | "news_results"
) {
  const value = raw[key];
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function normalizeSnippet(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function mergeResultSnippets(args: {
  originalSnippet?: unknown;
  fetchedSnippet?: string;
}) {
  const original = normalizeSnippet(args.originalSnippet);
  const fetched = normalizeSnippet(args.fetchedSnippet);
  if (!original) return fetched;
  if (!fetched) return original;
  if (original === fetched || fetched.includes(original)) return fetched;
  if (original.includes(fetched)) return original;
  return `${original}\n\nExtracted evidence:\n${fetched}`;
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
    args.items.slice(0, args.limit).map(async (item) => {
      const fetchedSnippet = await args.fetchPageSnippet(
        buildSearchResultSnippetSeed(item),
        args.query
      );
      return {
        ...item,
        snippet: mergeResultSnippets({
          originalSnippet: item.snippet,
          fetchedSnippet,
        }),
      };
    })
  );
}
