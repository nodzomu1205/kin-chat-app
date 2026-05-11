import { useEffect, useMemo, useState } from "react";
import type {
  LibraryRagIndexState,
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
} from "@/lib/app/reference-library/referenceLibraryState";
import {
  buildReferenceLibraryDocumentItem,
  buildReferenceLibrarySearchItem,
} from "@/lib/app/ingest/ingestDocumentModel";
import { fetchRagLibraryReferenceContext } from "@/lib/app/reference-library/ragLibrarySearchClient";
import { indexLibraryItemForRag } from "@/lib/app/reference-library/ragLibraryIndexClient";
import { appendRagLibraryReferenceLog } from "@/lib/app/reference-library/ragLibraryReferenceLog";
import { readRagLibraryCandidateDocumentIds } from "@/lib/app/reference-library/ragLibraryDbCandidateStorage";
import { normalizeUsage } from "@/lib/shared/tokenStats";

const LIBRARY_ORDER_KEY = "reference_library_order";
const LIBRARY_AUTO_REFERENCE_ENABLED_KEY = "library_auto_reference_enabled";
const LIBRARY_REFERENCE_COUNT_KEY = "library_reference_count";
const LIBRARY_REFERENCE_MODE_KEY = "library_reference_mode";
const LIBRARY_RAG_REFERENCE_ENABLED_KEY = "library_rag_reference_enabled";
const LIBRARY_RAG_REFERENCE_COUNT_KEY = "library_rag_reference_count";
const LIBRARY_RAG_CANDIDATE_COUNT_KEY = "library_rag_candidate_count";
const LIBRARY_RAG_SIMILARITY_THRESHOLD_KEY = "library_rag_similarity_threshold";
const LIBRARY_INDEX_RESPONSE_COUNT_KEY = "library_index_response_count";
const IMAGE_LIBRARY_REFERENCE_ENABLED_KEY = "image_library_reference_enabled";
const IMAGE_LIBRARY_REFERENCE_COUNT_KEY = "image_library_reference_count";
const IMAGE_LIBRARY_CARD_LIMIT_KEY = "image_library_card_limit";
const LIBRARY_ITEM_MODE_OVERRIDES_KEY = "library_item_mode_overrides";
const LIBRARY_RAG_INDEX_STATES_KEY = "library_rag_index_states";
const SELECTED_TASK_LIBRARY_ITEM_ID_KEY = "selected_task_library_item_id";

export const DEFAULT_LIBRARY_REFERENCE_COUNT = 4;
export const DEFAULT_LIBRARY_REFERENCE_MODE: LibraryReferenceMode = "summary_only";
export const DEFAULT_LIBRARY_RAG_REFERENCE_COUNT = 10;
export const DEFAULT_LIBRARY_RAG_CANDIDATE_COUNT = 100;
export const DEFAULT_LIBRARY_RAG_SIMILARITY_THRESHOLD = 0.3;
export const DEFAULT_LIBRARY_INDEX_RESPONSE_COUNT = 12;
export const DEFAULT_IMAGE_LIBRARY_REFERENCE_COUNT = 6;
export const DEFAULT_IMAGE_LIBRARY_CARD_LIMIT = 50;

function loadInitialReferenceLibraryState() {
  const initialState = {
    libraryOrder: [] as string[],
    autoLibraryReferenceEnabled: true,
    libraryReferenceCount: DEFAULT_LIBRARY_REFERENCE_COUNT,
    libraryReferenceMode: DEFAULT_LIBRARY_REFERENCE_MODE,
    libraryRagReferenceEnabled: false,
    libraryRagReferenceCount: DEFAULT_LIBRARY_RAG_REFERENCE_COUNT,
    libraryRagCandidateCount: DEFAULT_LIBRARY_RAG_CANDIDATE_COUNT,
    libraryRagSimilarityThreshold: DEFAULT_LIBRARY_RAG_SIMILARITY_THRESHOLD,
    libraryIndexResponseCount: DEFAULT_LIBRARY_INDEX_RESPONSE_COUNT,
    imageLibraryReferenceEnabled: true,
    imageLibraryReferenceCount: DEFAULT_IMAGE_LIBRARY_REFERENCE_COUNT,
    imageLibraryCardLimit: DEFAULT_IMAGE_LIBRARY_CARD_LIMIT,
    libraryItemModeOverrides: {} as Record<string, LibraryItemModeOverride>,
    libraryRagIndexStates: {} as Record<string, LibraryRagIndexState>,
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
  const savedRagEnabled = window.localStorage.getItem(
    LIBRARY_RAG_REFERENCE_ENABLED_KEY
  );
  const savedRagCount = window.localStorage.getItem(
    LIBRARY_RAG_REFERENCE_COUNT_KEY
  );
  const savedRagCandidateCount = window.localStorage.getItem(
    LIBRARY_RAG_CANDIDATE_COUNT_KEY
  );
  const savedRagSimilarityThreshold = window.localStorage.getItem(
    LIBRARY_RAG_SIMILARITY_THRESHOLD_KEY
  );
  const savedIndexCount = window.localStorage.getItem(
    LIBRARY_INDEX_RESPONSE_COUNT_KEY
  );
  const savedImageLibraryReferenceEnabled = window.localStorage.getItem(
    IMAGE_LIBRARY_REFERENCE_ENABLED_KEY
  );
  const savedImageLibraryReferenceCount = window.localStorage.getItem(
    IMAGE_LIBRARY_REFERENCE_COUNT_KEY
  );
  const savedImageLibraryCardLimit = window.localStorage.getItem(
    IMAGE_LIBRARY_CARD_LIMIT_KEY
  );
  const savedOverrides = window.localStorage.getItem(
    LIBRARY_ITEM_MODE_OVERRIDES_KEY
  );
  const savedRagIndexStates = window.localStorage.getItem(
    LIBRARY_RAG_INDEX_STATES_KEY
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

  if (savedImageLibraryReferenceEnabled) {
    initialState.imageLibraryReferenceEnabled =
      savedImageLibraryReferenceEnabled === "true";
  }

  if (savedRagEnabled) {
    initialState.libraryRagReferenceEnabled = savedRagEnabled === "true";
  }

  if (savedRagCount) {
    const parsed = Number(savedRagCount);
    if (Number.isFinite(parsed) && parsed >= 0) {
      initialState.libraryRagReferenceCount = parsed;
    }
  }

  if (savedRagCandidateCount) {
    const parsed = Number(savedRagCandidateCount);
    if (Number.isFinite(parsed) && parsed >= 1) {
      initialState.libraryRagCandidateCount = parsed;
    }
  }

  if (savedRagSimilarityThreshold) {
    const parsed = Number(savedRagSimilarityThreshold);
    if (Number.isFinite(parsed) && parsed >= -1 && parsed <= 1) {
      initialState.libraryRagSimilarityThreshold = parsed;
    }
  }

  if (savedImageLibraryReferenceCount) {
    const parsed = Number(savedImageLibraryReferenceCount);
    if (Number.isFinite(parsed) && parsed >= 0) {
      initialState.imageLibraryReferenceCount = parsed;
    }
  }

  if (savedImageLibraryCardLimit) {
    const parsed = Number(savedImageLibraryCardLimit);
    if (Number.isFinite(parsed) && parsed >= 0) {
      initialState.imageLibraryCardLimit = parsed;
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

  if (savedRagIndexStates) {
    try {
      const parsed = JSON.parse(savedRagIndexStates) as Record<
        string,
        LibraryRagIndexState
      >;
      if (parsed && typeof parsed === "object") {
        initialState.libraryRagIndexStates = parsed;
      }
    } catch {}
  }

  if (savedSelectedTaskLibraryItemId) {
    initialState.selectedTaskLibraryItemId = savedSelectedTaskLibraryItemId;
  }

  return initialState;
}

function toDocumentLibraryItem(item: StoredDocument): ReferenceLibraryItem {
  return buildReferenceLibraryDocumentItem(item);
}

function toSearchLibraryItem(item: SearchContext): ReferenceLibraryItem {
  const askAiModeItems = Array.isArray(item.metadata?.askAiModeItems)
    ? (item.metadata.askAiModeItems as ReferenceLibraryItem["askAiModeItems"])
    : undefined;

  return buildReferenceLibrarySearchItem({
    rawResultId: item.rawResultId,
    mode: item.mode,
    engine: item.engine,
    engines: item.engines,
    query: item.query,
    summary: item.summaryText || "",
    rawText: item.rawText || "",
    createdAt: item.createdAt,
    taskId: item.taskId,
    sources: item.sources,
    askAiModeItems,
  });
}

export function useReferenceLibrary(params: {
  storedDocuments: StoredDocument[];
  searchHistory: SearchContext[];
  searchHistoryStorageMB: number;
  documentStorageMB: number;
  multipartStorageMB: number;
  sourceDisplayCount?: number;
  applyRagIndexUsage?: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applyRagReferenceUsage?: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applyRagTaskReferenceUsage?: (
    usage: Parameters<typeof normalizeUsage>[0]
  ) => void;
}) {
  const {
    storedDocuments,
    searchHistory,
    searchHistoryStorageMB,
    documentStorageMB,
    multipartStorageMB,
    sourceDisplayCount = 3,
    applyRagIndexUsage,
    applyRagReferenceUsage,
    applyRagTaskReferenceUsage,
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
  const [libraryRagReferenceEnabled, setLibraryRagReferenceEnabled] = useState(
    initialState.libraryRagReferenceEnabled
  );
  const [libraryRagReferenceCount, setLibraryRagReferenceCount] = useState(
    initialState.libraryRagReferenceCount
  );
  const [libraryRagCandidateCount, setLibraryRagCandidateCount] = useState(
    initialState.libraryRagCandidateCount
  );
  const [libraryRagSimilarityThreshold, setLibraryRagSimilarityThreshold] =
    useState(initialState.libraryRagSimilarityThreshold);
  const [libraryIndexResponseCount, setLibraryIndexResponseCount] = useState(
    initialState.libraryIndexResponseCount
  );
  const [imageLibraryReferenceEnabled, setImageLibraryReferenceEnabled] =
    useState(initialState.imageLibraryReferenceEnabled);
  const [imageLibraryReferenceCount, setImageLibraryReferenceCount] = useState(
    initialState.imageLibraryReferenceCount
  );
  const [imageLibraryCardLimit, setImageLibraryCardLimit] = useState(
    initialState.imageLibraryCardLimit
  );
  const [libraryItemModeOverrides, setLibraryItemModeOverrides] = useState<
    Record<string, LibraryItemModeOverride>
  >(initialState.libraryItemModeOverrides);
  const [libraryRagIndexStates, setLibraryRagIndexStates] = useState<
    Record<string, LibraryRagIndexState>
  >(initialState.libraryRagIndexStates);
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
      LIBRARY_RAG_REFERENCE_ENABLED_KEY,
      String(libraryRagReferenceEnabled)
    );
  }, [libraryRagReferenceEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LIBRARY_RAG_REFERENCE_COUNT_KEY,
      String(libraryRagReferenceCount)
    );
  }, [libraryRagReferenceCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LIBRARY_RAG_CANDIDATE_COUNT_KEY,
      String(libraryRagCandidateCount)
    );
  }, [libraryRagCandidateCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LIBRARY_RAG_SIMILARITY_THRESHOLD_KEY,
      String(libraryRagSimilarityThreshold)
    );
  }, [libraryRagSimilarityThreshold]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      IMAGE_LIBRARY_REFERENCE_ENABLED_KEY,
      String(imageLibraryReferenceEnabled)
    );
  }, [imageLibraryReferenceEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      IMAGE_LIBRARY_REFERENCE_COUNT_KEY,
      String(imageLibraryReferenceCount)
    );
  }, [imageLibraryReferenceCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      IMAGE_LIBRARY_CARD_LIMIT_KEY,
      String(imageLibraryCardLimit)
    );
  }, [imageLibraryCardLimit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LIBRARY_ITEM_MODE_OVERRIDES_KEY,
      JSON.stringify(libraryItemModeOverrides)
    );
  }, [libraryItemModeOverrides]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LIBRARY_RAG_INDEX_STATES_KEY,
      JSON.stringify(libraryRagIndexStates)
    );
  }, [libraryRagIndexStates]);

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

  const resolvedLibraryRagIndexStates = useMemo(() => {
    const next: Record<string, LibraryRagIndexState> = {};
    libraryItemsWithOverrides.forEach((item) => {
      const state = libraryRagIndexStates[item.id];
      if (!state) {
        next[item.id] = { status: "idle" };
        return;
      }
      next[item.id] =
        state.status === "indexed" && state.itemUpdatedAt !== item.updatedAt
          ? { ...state, status: "stale" }
          : state;
    });
    return next;
  }, [libraryItemsWithOverrides, libraryRagIndexStates]);

  const indexLibraryItemForRagById = async (itemId: string) => {
    const item = getLibraryItemById(itemId);
    if (!item || item.artifactType === "generated_image") return;
    setLibraryRagIndexStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: "indexing",
        itemUpdatedAt: item.updatedAt,
      },
    }));
    const result = await indexLibraryItemForRag(item);
    if (result.usage) {
      applyRagIndexUsage?.(result.usage);
    }
    setLibraryRagIndexStates((prev) => ({
      ...prev,
      [itemId]: result,
    }));
  };

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

  const buildLibraryReferenceContext = (options?: { ragReferenceContext?: string }) => {
    return buildReferenceLibraryContext({
      autoLibraryReferenceEnabled,
      libraryReferenceCount,
      libraryRagReferenceEnabled,
      libraryRagReferenceCount,
      libraryItems: libraryItemsWithOverrides,
      libraryReferenceMode,
      libraryItemModeOverrides,
      sourceDisplayCount,
      ragReferenceContext: options?.ragReferenceContext,
    });
  };

  const buildLibraryReferenceContextForQuery = async (
    query: string,
    options?: { usageBucket?: "chat" | "task" }
  ) => {
    const ragReferenceResult =
      libraryRagReferenceEnabled && libraryRagReferenceCount > 0
        ? await fetchRagLibraryReferenceContext({
            query,
            matchCount: libraryRagReferenceCount,
            candidateCount: libraryRagCandidateCount,
            matchThreshold: libraryRagSimilarityThreshold,
            documentIds: readRagLibraryCandidateDocumentIds(),
          })
        : { context: "", matches: [], usage: undefined };
    if (ragReferenceResult.usage) {
      if (options?.usageBucket === "task") {
        applyRagTaskReferenceUsage?.(ragReferenceResult.usage);
      } else {
        applyRagReferenceUsage?.(ragReferenceResult.usage);
      }
    }
    appendRagLibraryReferenceLog({
      usageBucket: options?.usageBucket === "task" ? "task" : "chat",
      query,
      context: ragReferenceResult.context,
      matches: ragReferenceResult.matches,
      skippedReason: ragReferenceResult.skippedReason,
    });

    return buildLibraryReferenceContext({
      ragReferenceContext: ragReferenceResult.context,
    });
  };

  const estimateLibraryReferenceTokens = () => {
    return estimateReferenceLibraryTokens({
      autoLibraryReferenceEnabled,
      libraryReferenceCount,
      libraryRagReferenceEnabled,
      libraryRagReferenceCount,
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
    libraryRagIndexStates: resolvedLibraryRagIndexStates,
    selectedTaskLibraryItemId: resolvedSelectedTaskLibraryItemId,
    setSelectedTaskLibraryItemId,
    autoLibraryReferenceEnabled,
    setAutoLibraryReferenceEnabled,
    libraryReferenceMode,
    setLibraryReferenceMode,
    libraryRagReferenceEnabled,
    setLibraryRagReferenceEnabled,
    libraryRagReferenceCount,
    libraryRagCandidateCount,
    setLibraryRagCandidateCount,
    libraryRagSimilarityThreshold,
    setLibraryRagSimilarityThreshold,
    setLibraryRagReferenceCount,
    libraryIndexResponseCount,
    setLibraryIndexResponseCount,
    imageLibraryReferenceEnabled,
    setImageLibraryReferenceEnabled,
    imageLibraryReferenceCount,
    setImageLibraryReferenceCount,
    imageLibraryCardLimit,
    setImageLibraryCardLimit,
    libraryReferenceCount,
    setLibraryReferenceCount,
    libraryStorageMB,
    libraryItemModeOverrides,
    setLibraryItemModeOverride,
    indexLibraryItemForRag: indexLibraryItemForRagById,
    moveLibraryItem,
    getTaskLibraryItem,
    getLibraryItemById,
    buildLibraryReferenceContext,
    buildLibraryReferenceContextForQuery,
    estimateLibraryReferenceTokens,
  };
}
