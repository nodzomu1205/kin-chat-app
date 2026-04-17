import type {
  LibraryItemModeOverride,
  LibraryReferenceMode,
} from "@/components/panels/gpt/gptPanelTypes";
import type { ReferenceLibraryItem } from "@/types/chat";

export function reconcileReferenceLibraryOrder(
  baseItemIds: string[],
  storedOrder: string[]
) {
  const idSet = new Set(baseItemIds);
  const kept = storedOrder.filter((id) => idSet.has(id));
  const missing = baseItemIds.filter((id) => !kept.includes(id));
  return [...missing, ...kept];
}

export function moveReferenceLibraryOrderItem(
  currentOrder: string[],
  itemId: string,
  direction: "up" | "down"
) {
  const next = [...currentOrder];
  const index = next.findIndex((id) => id === itemId);
  if (index < 0) return next;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= next.length) return next;
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function resolveSelectedLibraryItemId(
  selectedTaskLibraryItemId: string,
  libraryItems: Pick<ReferenceLibraryItem, "id">[]
) {
  if (!selectedTaskLibraryItemId) return "";
  return libraryItems.some((item) => item.id === selectedTaskLibraryItemId)
    ? selectedTaskLibraryItemId
    : "";
}

export function getTaskLibraryItemBySelection(
  libraryItems: ReferenceLibraryItem[],
  selectedTaskLibraryItemId: string
) {
  const resolvedId = resolveSelectedLibraryItemId(
    selectedTaskLibraryItemId,
    libraryItems
  );
  if (!resolvedId) return null;
  return libraryItems.find((item) => item.id === resolvedId) || null;
}

export function getEffectiveLibraryItemMode(params: {
  itemId: string;
  libraryReferenceMode: LibraryReferenceMode;
  libraryItemModeOverrides: Record<string, LibraryItemModeOverride>;
}) {
  const override = params.libraryItemModeOverrides[params.itemId];
  return override && override !== "default"
    ? (override as LibraryReferenceMode)
    : params.libraryReferenceMode;
}

export function buildReferenceLibraryContext(params: {
  autoLibraryReferenceEnabled: boolean;
  libraryReferenceCount: number;
  libraryItems: ReferenceLibraryItem[];
  libraryReferenceMode: LibraryReferenceMode;
  libraryItemModeOverrides: Record<string, LibraryItemModeOverride>;
  sourceDisplayCount: number;
}) {
  if (!params.autoLibraryReferenceEnabled || params.libraryReferenceCount <= 0) {
    return "";
  }

  const targets = params.libraryItems.slice(0, params.libraryReferenceCount);
  if (targets.length === 0) return "";

  const lines = ["<<STORED_LIBRARY_CONTEXT>>"];

  targets.forEach((item, index) => {
    const effectiveMode = getEffectiveLibraryItemMode({
      itemId: item.id,
      libraryReferenceMode: params.libraryReferenceMode,
      libraryItemModeOverrides: params.libraryItemModeOverrides,
    });
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
      item.sources
        .slice(0, Math.max(1, params.sourceDisplayCount))
        .forEach((source) => {
          lines.push(`- ${source.title}${source.link ? ` | ${source.link}` : ""}`);
        });
    }
    lines.push("");
  });

  lines.push("<<END_STORED_LIBRARY_CONTEXT>>");
  return lines.join("\n").trim();
}

export function estimateReferenceLibraryTokens(params: {
  autoLibraryReferenceEnabled: boolean;
  libraryReferenceCount: number;
  libraryItems: ReferenceLibraryItem[];
  libraryReferenceMode: LibraryReferenceMode;
  libraryItemModeOverrides: Record<string, LibraryItemModeOverride>;
  sourceDisplayCount: number;
}) {
  const context = buildReferenceLibraryContext(params);
  if (!context) return 0;
  const trimmed = context.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}
