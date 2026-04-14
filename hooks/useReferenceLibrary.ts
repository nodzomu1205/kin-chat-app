import { useEffect, useMemo, useState } from "react";
import type {
  LibraryItemModeOverride,
  LibraryReferenceMode,
} from "@/components/panels/gpt/gptPanelTypes";
import type { ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchContext } from "@/types/task";

const LIBRARY_ORDER_KEY = "reference_library_order";
const LIBRARY_AUTO_REFERENCE_ENABLED_KEY = "library_auto_reference_enabled";
const LIBRARY_REFERENCE_COUNT_KEY = "library_reference_count";
const LIBRARY_REFERENCE_MODE_KEY = "library_reference_mode";
const LIBRARY_INDEX_RESPONSE_COUNT_KEY = "library_index_response_count";
const LIBRARY_ITEM_MODE_OVERRIDES_KEY = "library_item_mode_overrides";
const SELECTED_TASK_LIBRARY_ITEM_ID_KEY = "selected_task_library_item_id";

export const DEFAULT_LIBRARY_REFERENCE_COUNT = 4;
export const DEFAULT_LIBRARY_REFERENCE_MODE: LibraryReferenceMode = "summary_only";
export const DEFAULT_LIBRARY_INDEX_RESPONSE_COUNT = 12;

function estimateTokenCount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

function buildFallbackSummary(text: string, fallbackTitle: string) {
  const trimmed = text.trim();
  if (!trimmed) return fallbackTitle;
  const normalized = trimmed.replace(/\s+/g, " ").trim();
  const withoutTitle = normalized.startsWith(fallbackTitle)
    ? normalized.slice(fallbackTitle.length).trimStart()
    : normalized;
  const basis = withoutTitle || normalized;
  const sentenceParts = basis
    .split(/(?<=[。．.!?！？])/)
    .map((part) => part.trim())
    .filter(Boolean);
  const summary = (sentenceParts.slice(0, 2).join(" ") || basis).trim();
  return summary.length > 220 ? `${summary.slice(0, 220).trimEnd()}...` : summary;
}

function toDocumentLibraryItem(item: StoredDocument): ReferenceLibraryItem {
  const detailPrefix =
    item.artifactType === "task_result"
      ? "成果物"
      : item.artifactType === "task_snapshot"
        ? "タスク保存"
        : item.sourceType === "kin_created"
          ? "Kin作成"
          : "取込";

  const subtitleParts = [
    detailPrefix,
    item.taskTitle || item.filename,
    item.kinName || "",
    item.completedAt
      ? new Date(item.completedAt).toLocaleString("ja-JP", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  ].filter(Boolean);

  return {
    id: `doc:${item.id}`,
    sourceId: item.id,
    itemType: item.sourceType,
    artifactType: item.artifactType,
    title: item.title,
    subtitle: subtitleParts.join(" / "),
    summary: item.summary?.trim() || buildFallbackSummary(item.text, item.title),
    excerptText: item.text,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    filename: item.filename,
    taskId: item.taskId,
    taskTitle: item.taskTitle,
    kinName: item.kinName,
    completedAt: item.completedAt,
  };
}

function toSearchLibraryItem(item: SearchContext): ReferenceLibraryItem {
  const askAiModeItems = Array.isArray(item.metadata?.askAiModeItems)
    ? (item.metadata.askAiModeItems as ReferenceLibraryItem["askAiModeItems"])
    : undefined;

  return {
    id: `search:${item.rawResultId}`,
    sourceId: item.rawResultId,
    itemType: "search",
    title: item.query,
    subtitle: item.rawResultId,
    summary:
      item.summaryText?.trim() ||
      buildFallbackSummary(item.rawText || "", item.query),
    excerptText: item.rawText || "",
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
    rawResultId: item.rawResultId,
    taskId: item.taskId,
    sources: item.sources,
    askAiModeItems,
  };
}

export function useReferenceLibrary(params: {
  storedDocuments: StoredDocument[];
  searchHistory: SearchContext[];
  searchHistoryStorageMB: number;
  documentStorageMB: number;
  multipartStorageMB: number;
  sourceDisplayCount?: number;
}) {
  const {
    storedDocuments,
    searchHistory,
    searchHistoryStorageMB,
    documentStorageMB,
    multipartStorageMB,
    sourceDisplayCount = 3,
  } = params;

  const [libraryOrder, setLibraryOrder] = useState<string[]>([]);
  const [autoLibraryReferenceEnabled, setAutoLibraryReferenceEnabled] = useState(true);
  const [libraryReferenceCount, setLibraryReferenceCount] = useState(
    DEFAULT_LIBRARY_REFERENCE_COUNT
  );
  const [libraryReferenceMode, setLibraryReferenceMode] =
    useState<LibraryReferenceMode>(DEFAULT_LIBRARY_REFERENCE_MODE);
  const [libraryIndexResponseCount, setLibraryIndexResponseCount] = useState(
    DEFAULT_LIBRARY_INDEX_RESPONSE_COUNT
  );
  const [libraryItemModeOverrides, setLibraryItemModeOverrides] = useState<
    Record<string, LibraryItemModeOverride>
  >({});
  const [selectedTaskLibraryItemId, setSelectedTaskLibraryItemId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedOrder = window.localStorage.getItem(LIBRARY_ORDER_KEY);
    const savedAutoEnabled = window.localStorage.getItem(
      LIBRARY_AUTO_REFERENCE_ENABLED_KEY
    );
    const savedCount = window.localStorage.getItem(LIBRARY_REFERENCE_COUNT_KEY);
    const savedMode = window.localStorage.getItem(LIBRARY_REFERENCE_MODE_KEY);
    const savedIndexCount = window.localStorage.getItem(LIBRARY_INDEX_RESPONSE_COUNT_KEY);
    const savedOverrides = window.localStorage.getItem(
      LIBRARY_ITEM_MODE_OVERRIDES_KEY
    );
    const savedSelectedTaskLibraryItemId = window.localStorage.getItem(
      SELECTED_TASK_LIBRARY_ITEM_ID_KEY
    );

    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as string[];
        if (Array.isArray(parsed)) setLibraryOrder(parsed.filter(Boolean));
      } catch {}
    }

    if (savedAutoEnabled) {
      setAutoLibraryReferenceEnabled(savedAutoEnabled === "true");
    }

    if (savedCount) {
      const parsed = Number(savedCount);
      if (Number.isFinite(parsed) && parsed >= 0) setLibraryReferenceCount(parsed);
    }

    if (savedMode === "summary_only" || savedMode === "summary_with_excerpt") {
      setLibraryReferenceMode(savedMode);
    }

    if (savedIndexCount) {
      const parsed = Number(savedIndexCount);
      if (Number.isFinite(parsed) && parsed >= 1) setLibraryIndexResponseCount(parsed);
    }

    if (savedOverrides) {
      try {
        const parsed = JSON.parse(savedOverrides) as Record<
          string,
          LibraryItemModeOverride
        >;
        if (parsed && typeof parsed === "object") setLibraryItemModeOverrides(parsed);
      } catch {}
    }
    if (savedSelectedTaskLibraryItemId) {
      setSelectedTaskLibraryItemId(savedSelectedTaskLibraryItemId);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LIBRARY_ORDER_KEY, JSON.stringify(libraryOrder));
  }, [libraryOrder]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LIBRARY_AUTO_REFERENCE_ENABLED_KEY,
      String(autoLibraryReferenceEnabled)
    );
  }, [autoLibraryReferenceEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LIBRARY_REFERENCE_COUNT_KEY,
      String(libraryReferenceCount)
    );
  }, [libraryReferenceCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LIBRARY_REFERENCE_MODE_KEY, libraryReferenceMode);
  }, [libraryReferenceMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LIBRARY_INDEX_RESPONSE_COUNT_KEY,
      String(libraryIndexResponseCount)
    );
  }, [libraryIndexResponseCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LIBRARY_ITEM_MODE_OVERRIDES_KEY,
      JSON.stringify(libraryItemModeOverrides)
    );
  }, [libraryItemModeOverrides]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedTaskLibraryItemId) {
      window.localStorage.setItem(
        SELECTED_TASK_LIBRARY_ITEM_ID_KEY,
        selectedTaskLibraryItemId
      );
    } else {
      window.localStorage.removeItem(SELECTED_TASK_LIBRARY_ITEM_ID_KEY);
    }
  }, [selectedTaskLibraryItemId]);

  const baseItems = useMemo(() => {
  const documentItems = storedDocuments.map(toDocumentLibraryItem);
    const searchItems = searchHistory.map(toSearchLibraryItem);
    return [...documentItems, ...searchItems].sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    );
  }, [searchHistory, storedDocuments]);

  useEffect(() => {
    setLibraryOrder((prev) => {
      const ids = new Set(baseItems.map((item) => item.id));
      const kept = prev.filter((id) => ids.has(id));
      const missing = baseItems.map((item) => item.id).filter((id) => !kept.includes(id));
      if (missing.length === 0 && kept.length === prev.length) return prev;
      return [...missing, ...kept];
    });
  }, [baseItems]);

  const libraryItems = useMemo(() => {
    if (libraryOrder.length === 0) return baseItems;
    const byId = new Map(baseItems.map((item) => [item.id, item]));
    const ordered: ReferenceLibraryItem[] = [];
    libraryOrder.forEach((id) => {
      const item = byId.get(id);
      if (item) {
        ordered.push(item);
        byId.delete(id);
      }
    });
    return [...ordered, ...Array.from(byId.values())];
  }, [baseItems, libraryOrder]);

  const libraryItemsWithOverrides = useMemo(
    () =>
      libraryItems.map((item) => ({
        ...item,
        modeOverride: libraryItemModeOverrides[item.id] || "default",
      })),
    [libraryItemModeOverrides, libraryItems]
  );

  const moveLibraryItem = (itemId: string, direction: "up" | "down") => {
    setLibraryOrder((prev) => {
      const next = prev.length > 0 ? [...prev] : libraryItems.map((item) => item.id);
      const index = next.findIndex((id) => id === itemId);
      if (index < 0) return next;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return next;
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const getTaskLibraryItem = () =>
    libraryItemsWithOverrides.find((item) => item.id === selectedTaskLibraryItemId) || null;

  const setLibraryItemModeOverride = (
    itemId: string,
    mode: LibraryItemModeOverride
  ) => {
    setLibraryItemModeOverrides((prev) => {
      if (mode === "default") {
        if (!(itemId in prev)) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: mode,
      };
    });
  };

  const getEffectiveMode = (itemId: string): LibraryReferenceMode =>
    libraryItemModeOverrides[itemId] &&
    libraryItemModeOverrides[itemId] !== "default"
      ? (libraryItemModeOverrides[itemId] as LibraryReferenceMode)
      : libraryReferenceMode;

  const buildLibraryReferenceContext = () => {
    if (!autoLibraryReferenceEnabled || libraryReferenceCount <= 0) return "";
    const targets = libraryItemsWithOverrides.slice(0, libraryReferenceCount);
    if (targets.length === 0) return "";

    const lines = ["<<STORED_LIBRARY_CONTEXT>>"];

    targets.forEach((item, index) => {
      const effectiveMode = getEffectiveMode(item.id);
      lines.push(`[LIB ${index + 1}]`);
      lines.push(`TITLE: ${item.title}`);
      lines.push(`SUMMARY: ${item.summary}`);
      if (effectiveMode === "summary_with_excerpt" && item.excerptText.trim()) {
        lines.push(`EXCERPT: ${item.excerptText.trim().slice(0, 1200)}`);
      }
      if (
        effectiveMode === "summary_with_excerpt" &&
        item.itemType === "search" &&
        item.sources?.length
      ) {
        lines.push("SOURCES:");
        item.sources.slice(0, Math.max(1, sourceDisplayCount)).forEach((source) => {
          lines.push(`- ${source.title}${source.link ? ` | ${source.link}` : ""}`);
        });
      }
      lines.push("");
    });

    lines.push("<<END_STORED_LIBRARY_CONTEXT>>");
    return lines.join("\n").trim();
  };

  const estimateLibraryReferenceTokens = () => {
    if (!autoLibraryReferenceEnabled || libraryReferenceCount <= 0) return 0;
    const targets = libraryItemsWithOverrides.slice(0, libraryReferenceCount);
    if (targets.length === 0) return 0;
    const text = targets
      .map((item, index) => {
        const effectiveMode = getEffectiveMode(item.id);
        const parts = [
          `[LIB ${index + 1}]`,
          `TITLE: ${item.title}`,
          `SUMMARY: ${item.summary}`,
        ];
        if (effectiveMode === "summary_with_excerpt" && item.excerptText.trim()) {
          parts.push(`EXCERPT: ${item.excerptText.trim().slice(0, 1200)}`);
        }
        if (effectiveMode === "summary_with_excerpt" && item.itemType === "search" && item.sources?.length) {
          parts.push(
            ...item.sources
              .slice(0, Math.max(1, sourceDisplayCount))
              .map((source) => `SOURCE: ${source.title}${source.link ? ` | ${source.link}` : ""}`)
          );
        }
        return parts.join("\n");
      })
      .join("\n\n");
    return estimateTokenCount(text);
  };

  const libraryStorageMB =
    searchHistoryStorageMB + documentStorageMB + multipartStorageMB;

  return {
    libraryItems: libraryItemsWithOverrides,
    selectedTaskLibraryItemId,
    setSelectedTaskLibraryItemId,
    autoLibraryReferenceEnabled,
    setAutoLibraryReferenceEnabled,
    libraryReferenceMode,
    setLibraryReferenceMode,
    libraryIndexResponseCount,
    setLibraryIndexResponseCount,
    libraryReferenceCount,
    setLibraryReferenceCount,
    libraryStorageMB,
    libraryItemModeOverrides,
    setLibraryItemModeOverride,
    moveLibraryItem,
    getTaskLibraryItem,
    buildLibraryReferenceContext,
    estimateLibraryReferenceTokens,
  };
}
