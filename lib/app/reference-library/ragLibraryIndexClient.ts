import type { LibraryRagIndexState } from "@/components/panels/gpt/gptPanelTypes";
import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import type { ReferenceLibraryItem } from "@/types/chat";

type LibraryRagIndexApiResponse = {
  ok?: boolean;
  indexed?: boolean;
  documentId?: string;
  libraryItemId?: string;
  chunkCount?: number;
  usage?: TokenUsage;
  skippedReason?: string;
  error?: string;
};

export async function indexLibraryItemForRag(
  item: ReferenceLibraryItem
): Promise<LibraryRagIndexState> {
  try {
    const response = await fetch("/api/library-rag/index", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ item }),
    });

    const data = (await response.json().catch(() => ({}))) as LibraryRagIndexApiResponse;
    if (!response.ok || data.ok === false) {
      return {
        status: "error",
        itemUpdatedAt: item.updatedAt,
        error: data.error || response.statusText || "RAG indexing failed.",
      };
    }

    if (!data.indexed) {
      return {
        status: "skipped",
        itemUpdatedAt: item.updatedAt,
        skippedReason: data.skippedReason || "not_indexed",
      };
    }

    return {
      status: "indexed",
      itemUpdatedAt: item.updatedAt,
      indexedAt: new Date().toISOString(),
      chunkCount: data.chunkCount || 0,
      usage: data.usage,
    };
  } catch (error) {
    return {
      status: "error",
      itemUpdatedAt: item.updatedAt,
      error: error instanceof Error ? error.message : "RAG indexing failed.",
    };
  }
}
