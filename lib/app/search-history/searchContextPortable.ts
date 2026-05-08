import type { ReferenceLibraryItem } from "@/types/chat";
import type { SearchContext } from "@/types/task";
import { buildPortableSidecarFileName } from "@/lib/app/reference-library/portableSidecarNames";

const PORTABLE_SEARCH_CONTEXT_KIND = "kin.search_context";

export type SearchContextSidecarPayload = {
  kind: typeof PORTABLE_SEARCH_CONTEXT_KIND;
  version: "0.1";
  title?: string;
  filename?: string;
  exportedAt?: string;
  context: SearchContext;
};

export function buildSearchContextSidecarFileName(args: {
  filename?: string;
  title?: string;
}) {
  return buildPortableSidecarFileName({
    filename: args.filename,
    title: args.title,
    fallbackBaseName: "search-context",
    marker: "search-context",
  });
}

export function buildSearchContextFromLibraryItem(
  item: ReferenceLibraryItem
): SearchContext | null {
  if (item.itemType !== "search") return null;
  const rawResultId = item.rawResultId || item.sourceId;
  if (!rawResultId) return null;
  const askAiModeItems = item.askAiModeItems || [];
  const summaryText = item.summary || "";
  return {
    rawResultId,
    query: item.title || "Search result",
    summaryText,
    rawText: item.excerptText || "",
    sources: item.sources || [],
    metadata: {
      ...(askAiModeItems.length > 0 ? { askAiModeItems } : {}),
      ...(summaryText.trim() ? { librarySummaryGenerated: true } : {}),
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

export function buildSearchContextSidecarArtifact(args: {
  title?: string;
  filename?: string;
  context: SearchContext;
}) {
  return {
    fileName: buildSearchContextSidecarFileName({
      filename: args.filename,
      title: args.title,
    }),
    text: buildSearchContextSidecarText({
      title: args.title,
      filename: args.filename,
      context: args.context,
    }),
    mimeType: "application/json",
  };
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
  return markSearchContextSummaryReusable(payload.context);
}

export function buildPortableSearchContextImport(args: {
  context: SearchContext;
  filename: string;
  taskId?: string;
}) {
  const context = {
    ...args.context,
    taskId: args.taskId || args.context.taskId,
  };
  return {
    context,
    title: context.query || args.filename,
    charCount: context.rawText.length,
  };
}

function markSearchContextSummaryReusable(context: SearchContext): SearchContext {
  if (!context.summaryText?.trim()) return context;
  return {
    ...context,
    metadata: {
      ...(context.metadata || {}),
      librarySummaryGenerated: true,
    },
  };
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
