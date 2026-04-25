import { useEffect, useMemo, useState } from "react";
import type { MultipartAssembly, StoredDocument } from "@/types/chat";
import {
  applyStoredDocumentOverride,
  buildIngestedStoredDocument,
  buildKinStoredDocument,
  normalizeStoredDocument,
} from "@/lib/app/ingest/ingestDocumentModel";

const INGESTED_DOCUMENTS_KEY = "ingested_documents";
const DOCUMENT_ORDER_KEY = "stored_document_order";
const DOCUMENT_OVERRIDES_KEY = "stored_document_overrides";

function toKinStoredDocument(item: MultipartAssembly): StoredDocument {
  return buildKinStoredDocument(item);
}

function parseStoredDocuments(value: string | null): StoredDocument[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as StoredDocument[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          !!item?.id &&
          !!item?.filename &&
          !!item?.text &&
          item?.sourceType === "ingested_file"
      )
      .map(normalizeStoredDocument);
  } catch {
    return [];
  }
}

function parseDocumentOrder(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseDocumentOverrides(
  value: string | null
): Record<string, Partial<StoredDocument>> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as Record<string, Partial<StoredDocument>>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function sanitizeDocumentOrder(
  documentOrder: string[],
  documents: StoredDocument[]
) {
  const currentIds = new Set(documents.map((item) => item.id));
  const next = documentOrder.filter((id) => currentIds.has(id));
  const missing = documents.map((item) => item.id).filter((id) => !next.includes(id));
  return [...next, ...missing];
}

export function buildAllStoredDocuments(args: {
  kinDocuments: StoredDocument[];
  ingestedDocuments: StoredDocument[];
  documentOverrides: Record<string, Partial<StoredDocument>>;
  documentOrder: string[];
}) {
  const defaultDocuments = [...args.kinDocuments, ...args.ingestedDocuments]
    .map(normalizeStoredDocument)
    .map((item) => applyStoredDocumentOverride(item, args.documentOverrides[item.id]))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  const effectiveOrder = sanitizeDocumentOrder(args.documentOrder, defaultDocuments);
  if (effectiveOrder.length === 0) {
    return {
      allDocuments: defaultDocuments,
      documentOrder: effectiveOrder,
    };
  }

  const byId = new Map(defaultDocuments.map((item) => [item.id, item]));
  const ordered: StoredDocument[] = [];
  effectiveOrder.forEach((id) => {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  });

  return {
    allDocuments: [...ordered, ...Array.from(byId.values())],
    documentOrder: effectiveOrder,
  };
}

export function useStoredDocuments(multipartAssemblies: MultipartAssembly[]) {
  const [ingestedDocuments, setIngestedDocuments] = useState<StoredDocument[]>(() =>
    typeof window === "undefined"
      ? []
      : parseStoredDocuments(window.localStorage.getItem(INGESTED_DOCUMENTS_KEY))
  );
  const [documentOverrides, setDocumentOverrides] = useState<
    Record<string, Partial<StoredDocument>>
  >(() =>
    typeof window === "undefined"
      ? {}
      : parseDocumentOverrides(window.localStorage.getItem(DOCUMENT_OVERRIDES_KEY))
  );
  const [documentOrder, setDocumentOrder] = useState<string[]>(() =>
    typeof window === "undefined"
      ? []
      : parseDocumentOrder(window.localStorage.getItem(DOCUMENT_ORDER_KEY))
  );

  const kinDocuments = useMemo(
    () =>
      multipartAssemblies
        .filter((item) => item.isComplete && item.assembledText.trim().length > 0)
        .map(toKinStoredDocument),
    [multipartAssemblies]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      INGESTED_DOCUMENTS_KEY,
      JSON.stringify(ingestedDocuments)
    );
  }, [ingestedDocuments]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextOrder = sanitizeDocumentOrder(documentOrder, [
      ...kinDocuments,
      ...ingestedDocuments,
    ]);
    window.localStorage.setItem(DOCUMENT_ORDER_KEY, JSON.stringify(nextOrder));
  }, [documentOrder, ingestedDocuments, kinDocuments]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DOCUMENT_OVERRIDES_KEY, JSON.stringify(documentOverrides));
  }, [documentOverrides]);

  const { allDocuments, documentOrder: effectiveDocumentOrder } = useMemo(
    () =>
      buildAllStoredDocuments({
        kinDocuments,
        ingestedDocuments,
        documentOverrides,
        documentOrder,
      }),
    [documentOrder, documentOverrides, ingestedDocuments, kinDocuments]
  );

  const getStoredDocument = (documentId: string) =>
    allDocuments.find((item) => item.id === documentId) || null;

  const recordIngestedDocument = (document: Omit<StoredDocument, "id" | "sourceType">) => {
    const nextDocument = buildIngestedStoredDocument({
      id: `ingest:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...document,
    });

    setIngestedDocuments((prev) => [nextDocument, ...prev]);
    setDocumentOrder((prev) => [nextDocument.id, ...prev.filter((id) => id !== nextDocument.id)]);
    return nextDocument;
  };

  const deleteStoredDocument = (documentId: string) => {
    setIngestedDocuments((prev) => prev.filter((item) => item.id !== documentId));
    setDocumentOrder((prev) => prev.filter((id) => id !== documentId));
    setDocumentOverrides((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  };

  const updateStoredDocument = (
    documentId: string,
    patch: Partial<Pick<StoredDocument, "title" | "text" | "summary">>
  ) => {
    const updatedAt = new Date().toISOString();
    const existing = getStoredDocument(documentId);
    if (!existing) return null;

    if (existing.sourceType === "ingested_file") {
      setIngestedDocuments((prev) =>
        prev.map((item) =>
          item.id === documentId
            ? applyStoredDocumentOverride(item, {
                ...patch,
                updatedAt,
              })
            : item
        )
      );
      return;
    }

    setDocumentOverrides((prev) => ({
      ...prev,
      [documentId]: {
        ...(prev[documentId] || {}),
        ...patch,
        updatedAt,
      },
    }));
  };

  const moveStoredDocument = (documentId: string, direction: "up" | "down") => {
    setDocumentOrder((prev) => {
      const next =
        prev.length > 0
          ? [...sanitizeDocumentOrder(prev, allDocuments)]
          : effectiveDocumentOrder.length > 0
            ? [...effectiveDocumentOrder]
            : allDocuments.map((item) => item.id);
      const index = next.findIndex((id) => id === documentId);
      if (index < 0) return next;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return next;
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const documentStorageMB = useMemo(() => {
    try {
      const bytes = new TextEncoder().encode(
        JSON.stringify({ ingestedDocuments, documentOrder })
      ).length;
      return bytes / (1024 * 1024);
    } catch {
      return 0;
    }
  }, [documentOrder, ingestedDocuments]);

  return {
    ingestedDocuments,
    allDocuments,
    documentOrder: effectiveDocumentOrder,
    documentStorageMB,
    recordIngestedDocument,
    updateStoredDocument,
    deleteStoredDocument,
    moveStoredDocument,
    getStoredDocument,
  };
}
