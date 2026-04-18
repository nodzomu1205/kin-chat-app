import { useEffect, useMemo, useState } from "react";
import type { MultipartAssembly, StoredDocument } from "@/types/chat";
import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/importSummaryText";

const INGESTED_DOCUMENTS_KEY = "ingested_documents";
const DOCUMENT_ORDER_KEY = "stored_document_order";
const DOCUMENT_OVERRIDES_KEY = "stored_document_overrides";

function buildDocumentSummary(text: string, fallbackTitle: string) {
  const trimmed = cleanImportSummarySource(text).trim();
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

function toKinStoredDocument(item: MultipartAssembly): StoredDocument {
  return {
    id: `kin:${item.id}`,
    sourceType: "kin_created",
    artifactType: item.artifactType,
    title: item.filename,
    filename: item.filename,
    text: item.assembledText,
    summary: item.summary || buildDocumentSummary(item.assembledText, item.filename),
    taskId: item.taskId,
    taskTitle: item.taskTitle,
    kinName: item.kinName,
    completedAt: item.completedAt,
    charCount: item.assembledText.length,
    createdAt: item.updatedAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeStoredDocument(item: StoredDocument): StoredDocument {
  const cleanedText = cleanImportedDocumentText(item.text);
  const cleanedSummary = item.summary
    ? cleanImportSummarySource(item.summary).trim()
    : "";

  return {
    ...item,
    text: cleanedText,
    summary: cleanedSummary || buildDocumentSummary(cleanedText, item.title),
    charCount: cleanedText.length,
  };
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

function applyDocumentOverride(
  item: StoredDocument,
  override?: Partial<StoredDocument>
): StoredDocument {
  if (!override) return item;

  const text = typeof override.text === "string" ? override.text : item.text;
  const cleanedText = cleanImportedDocumentText(text);
  const title = typeof override.title === "string" ? override.title : item.title;
  const summary =
    typeof override.summary === "string"
      ? cleanImportSummarySource(override.summary).trim()
      : item.summary;
  const updatedAt =
    typeof override.updatedAt === "string" ? override.updatedAt : item.updatedAt;

  return {
    ...item,
    ...override,
    title,
    text: cleanedText,
    summary: summary || buildDocumentSummary(cleanedText, title),
    updatedAt,
    charCount: cleanedText.length,
  };
}

export function sanitizeDocumentOrder(documentOrder: string[], documents: StoredDocument[]) {
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
    .map((item) => applyDocumentOverride(item, args.documentOverrides[item.id]))
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
    const nextOrder = sanitizeDocumentOrder(documentOrder, [...kinDocuments, ...ingestedDocuments]);
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
    const cleanedText = cleanImportedDocumentText(document.text);
    const cleanedSummary = document.summary
      ? cleanImportSummarySource(document.summary).trim()
      : "";
    const nextDocument: StoredDocument = {
      ...document,
      summary:
        cleanedSummary || buildDocumentSummary(cleanedText, document.filename),
      text: cleanedText,
      id: `ingest:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceType: "ingested_file",
      charCount: cleanedText.length,
    };

    setIngestedDocuments((prev) => [normalizeStoredDocument(nextDocument), ...prev]);
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
      const nextText = cleanImportedDocumentText(patch.text ?? existing.text);
      const nextTitle = patch.title ?? existing.title;
      const nextSummary =
        typeof patch.summary === "string"
          ? cleanImportSummarySource(patch.summary).trim()
          : existing.summary || buildDocumentSummary(nextText, nextTitle);
      setIngestedDocuments((prev) =>
        prev.map((item) =>
          item.id === documentId
            ? {
                ...item,
                ...patch,
                text: nextText,
                title: nextTitle,
                summary: nextSummary,
                updatedAt,
                charCount: nextText.length,
              }
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
