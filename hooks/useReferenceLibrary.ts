import { useEffect, useMemo, useState } from "react";
import type {
  LibraryItemModeOverride,
  LibraryReferenceMode,
} from "@/components/panels/gpt/gptPanelTypes";
import type { ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchContext } from "@/types/task";
import {
  buildReferenceLibraryContext,
  estimateReferenceLibraryTokens,
  getTaskLibraryItemBySelection,
  moveReferenceLibraryOrderItem,
  reconcileReferenceLibraryOrder,
  resolveSelectedLibraryItemId,
} from "@/lib/app/referenceLibraryState";
import {
  buildCanonicalDocumentSummary,
  buildReferenceLibraryDocumentItem,
} from "@/lib/app/ingestDocumentModel";
import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/importSummaryText";

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

function loadInitialReferenceLibraryState() {
  const initialState = {
    libraryOrder: [] as string[],
    autoLibraryReferenceEnabled: true,
    libraryReferenceCount: DEFAULT_LIBRARY_REFERENCE_COUNT,
    libraryReferenceMode: DEFAULT_LIBRARY_REFERENCE_MODE,
    libraryIndexResponseCount: DEFAULT_LIBRARY_INDEX_RESPONSE_COUNT,
    libraryItemModeOverrides: {} as Record<string, LibraryItemModeOverride>,
    selectedTaskLibraryItemId: "",
  };

  if (typeof window === "undefined") {
    return initialState;
  }

  const savedOrder = window.localStorage.getItem(LIBRARY_ORDER_KEY);
  const savedAutoEnabled = window.localStorage.getItem(
    LIBRARY_AUTO_REFERENCE_ENABLED_KEY
  );
  const savedCount = window.localStorage.getItem(LIBRARY_REFERENCE_COUNT_KEY);
  const savedMode = window.localStorage.getItem(LIBRARY_REFERENCE_MODE_KEY);
  const savedIndexCount = window.localStorage.getItem(
    LIBRARY_INDEX_RESPONSE_COUNT_KEY
  );
  const savedOverrides = window.localStorage.getItem(
    LIBRARY_ITEM_MODE_OVERRIDES_KEY
  );
  const savedSelectedTaskLibraryItemId = window.localStorage.getItem(
    SELECTED_TASK_LIBRARY_ITEM_ID_KEY
  );

  if (savedOrder) {
    try {
      const parsed = JSON.parse(savedOrder) as string[];
      if (Array.isArray(parsed)) {
        initialState.libraryOrder = parsed.filter(Boolean);
      }
    } catch {}
  }

  if (savedAutoEnabled) {
    initialState.autoLibraryReferenceEnabled = savedAutoEnabled === "true";
  }

  if (savedCount) {
    const parsed = Number(savedCount);
    if (Number.isFinite(parsed) && parsed >= 0) {
      initialState.libraryReferenceCount = parsed;
    }
  }

  if (savedMode === "summary_only" || savedMode === "summary_with_excerpt") {
    initialState.libraryReferenceMode = savedMode;
  }

  if (savedIndexCount) {
    const parsed = Number(savedIndexCount);
    if (Number.isFinite(parsed) && parsed >= 1) {
      initialState.libraryIndexResponseCount = parsed;
    }
  }

  if (savedOverrides) {
    try {
      const parsed = JSON.parse(savedOverrides) as Record<
        string,
        LibraryItemModeOverride
      >;
      if (parsed && typeof parsed === "object") {
        initialState.libraryItemModeOverrides = parsed;
      }
    } catch {}
  }

  if (savedSelectedTaskLibraryItemId) {
    initialState.selectedTaskLibraryItemId = savedSelectedTaskLibraryItemId;
  }

  return initialState;
}

function buildFallbackSummary(text: string, fallbackTitle: string) {
  return buildCanonicalDocumentSummary(text, fallbackTitle);
}

function toDocumentLibraryItem(item: StoredDocument): ReferenceLibraryItem {
  return buildReferenceLibraryDocumentItem(item);
}

function toSearchLibraryItem(item: SearchContext): ReferenceLibraryItem {
  const cleanedRawText = cleanImportedDocumentText(item.rawText || "");
  const cleanedSummary = item.summaryText
    ? cleanImportSummarySource(item.summaryText).trim()
    : "";
  const askAiModeItems = Array.isArray(item.metadata?.askAiModeItems)
    ? (item.metadata.askAiModeItems as ReferenceLibraryItem["askAiModeItems"])
    : undefined;

  return {
    id: `search:${item.rawResultId}`,
    sourceId: item.rawResultId,
    itemType: "search",
    title: item.query,
    subtitle: item.rawResultId,
    summary: cleanedSummary || buildFallbackSummary(cleanedRawText, item.query),
    excerptText: cleanedRawText,
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

  const [initialState] = useState(loadInitialReferenceLibraryState);
  const [storedLibraryOrder, setStoredLibraryOrder] = useState<string[]>(
    initialState.libraryOrder
  );
  const [autoLibraryReferenceEnabled, setAutoLibraryReferenceEnabled] = useState(
    initialState.autoLibraryReferenceEnabled
  );
  const [libraryReferenceCount, setLibraryReferenceCount] = useState(
    initialState.libraryReferenceCount
  );
  const [libraryReferenceMode, setLibraryReferenceMode] =
    useState<LibraryReferenceMode>(initialState.libraryReferenceMode);
  const [libraryIndexResponseCount, setLibraryIndexResponseCount] = useState(
    initialState.libraryIndexResponseCount
  );
  const [libraryItemModeOverrides, setLibraryItemModeOverrides] = useState<
    Record<string, LibraryItemModeOverride>
  >(initialState.libraryItemModeOverrides);
  const [selectedTaskLibraryItemId, setSelectedTaskLibraryItemId] = useState(
    initialState.selectedTaskLibraryItemId
  );

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

  const libraryOrder = useMemo(
    () =>
      reconcileReferenceLibraryOrder(
        baseItems.map((item) => item.id),
        storedLibraryOrder
      ),
    [baseItems, storedLibraryOrder]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LIBRARY_ORDER_KEY, JSON.stringify(libraryOrder));
  }, [libraryOrder]);

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

  const resolvedSelectedTaskLibraryItemId = useMemo(
    () =>
      resolveSelectedLibraryItemId(
        selectedTaskLibraryItemId,
        libraryItemsWithOverrides
      ),
    [libraryItemsWithOverrides, selectedTaskLibraryItemId]
  );

  const moveLibraryItem = (itemId: string, direction: "up" | "down") => {
    setStoredLibraryOrder((prev) =>
      moveReferenceLibraryOrderItem(
        reconcileReferenceLibraryOrder(
          libraryItems.map((item) => item.id),
          prev
        ),
        itemId,
        direction
      )
    );
  };

  const getTaskLibraryItem = () =>
    getTaskLibraryItemBySelection(
      libraryItemsWithOverrides,
      resolvedSelectedTaskLibraryItemId
    );

  const getLibraryItemById = (itemId: string) =>
    libraryItemsWithOverrides.find((item) => item.id === itemId) || null;

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

  const buildLibraryReferenceContext = () => {
    return buildReferenceLibraryContext({
      autoLibraryReferenceEnabled,
      libraryReferenceCount,
      libraryItems: libraryItemsWithOverrides,
      libraryReferenceMode,
      libraryItemModeOverrides,
      sourceDisplayCount,
    });
  };

  const estimateLibraryReferenceTokens = () => {
    return estimateReferenceLibraryTokens({
      autoLibraryReferenceEnabled,
      libraryReferenceCount,
      libraryItems: libraryItemsWithOverrides,
      libraryReferenceMode,
      libraryItemModeOverrides,
      sourceDisplayCount,
    });
  };

  const libraryStorageMB =
    searchHistoryStorageMB + documentStorageMB + multipartStorageMB;

  return {
    libraryItems: libraryItemsWithOverrides,
    selectedTaskLibraryItemId: resolvedSelectedTaskLibraryItemId,
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
    getLibraryItemById,
    buildLibraryReferenceContext,
    estimateLibraryReferenceTokens,
  };
}
