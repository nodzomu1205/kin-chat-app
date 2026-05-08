import type { ReferenceLibraryItem } from "@/types/chat";
import type { SearchContext } from "@/types/task";

const PORTABLE_SEARCH_CONTEXT_KIND = "kin.search_context";

export type SearchContextSidecarPayload = {
  kind: typeof PORTABLE_SEARCH_CONTEXT_KIND;
  version: "0.1";
  title?: string;
  filename?: string;
  exportedAt?: string;
  context: SearchContext;
};

function sanitizePortableBaseName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_")
    .replace(/\.(?:txt|md|markdown|json)$/iu, "");
}

export function buildSearchContextSidecarFileName(args: {
  filename?: string;
  title?: string;
}) {
  const rawName = sanitizePortableBaseName(
    args.filename || args.title || "search-context"
  );
  return `${rawName || "search-context"}.search-context.json`;
}

export function buildSearchContextFromLibraryItem(
  item: ReferenceLibraryItem
): SearchContext | null {
  if (item.itemType !== "search") return null;
  const rawResultId = item.rawResultId || item.sourceId;
  if (!rawResultId) return null;
  const askAiModeItems = item.askAiModeItems || [];
  return {
    rawResultId,
    query: item.title || "Search result",
    summaryText: item.summary || "",
    rawText: item.excerptText || "",
    sources: item.sources || [],
    metadata: {
      ...(askAiModeItems.length > 0 ? { askAiModeItems } : {}),
    },
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

export function buildSearchContextSidecarText(args: {
  title?: string;
  filename?: string;
  context: SearchContext;
  exportedAt?: string;
}) {
  const payload: SearchContextSidecarPayload = {
    kind: PORTABLE_SEARCH_CONTEXT_KIND,
    version: "0.1",
    title: args.title,
    filename: args.filename,
    exportedAt: args.exportedAt || new Date().toISOString(),
    context: args.context,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseSearchContextSidecarText(
  text?: string | null
): SearchContext | null {
  if (!text?.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const payload = parsed as Partial<SearchContextSidecarPayload>;
  if (payload.kind !== PORTABLE_SEARCH_CONTEXT_KIND) return null;
  if (!isSearchContext(payload.context)) return null;
  return payload.context;
}

function isSearchContext(value: unknown): value is SearchContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<SearchContext>;
  return (
    typeof context.rawResultId === "string" &&
    !!context.rawResultId.trim() &&
    typeof context.query === "string" &&
    typeof context.rawText === "string" &&
    Array.isArray(context.sources) &&
    typeof context.createdAt === "string"
  );
}
