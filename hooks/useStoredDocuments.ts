import { useEffect, useMemo, useState } from "react";
import type { MultipartAssembly, StoredDocument } from "@/types/chat";

const INGESTED_DOCUMENTS_KEY = "ingested_documents";
const DOCUMENT_ORDER_KEY = "stored_document_order";
const DOCUMENT_OVERRIDES_KEY = "stored_document_overrides";

function buildDocumentSummary(text: string, fallbackTitle: string) {
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

function toKinStoredDocument(item: MultipartAssembly): StoredDocument {
  return {
    id: `kin:${item.id}`,
    sourceType: "kin_created",
    title: item.filename,
    filename: item.filename,
    text: item.assembledText,
    summary: item.summary || buildDocumentSummary(item.assembledText, item.filename),
    taskId: item.taskId,
    charCount: item.assembledText.length,
    createdAt: item.updatedAt,
    updatedAt: item.updatedAt,
  };
}

export function useStoredDocuments(multipartAssemblies: MultipartAssembly[]) {
  const [ingestedDocuments, setIngestedDocuments] = useState<StoredDocument[]>([]);
  const [documentOverrides, setDocumentOverrides] = useState<Record<string, Partial<StoredDocument>>>({});
  const [documentOrder, setDocumentOrder] = useState<string[]>([]);

  const kinDocuments = useMemo(
    () =>
      multipartAssemblies
        .filter((item) => item.isComplete && item.assembledText.trim().length > 0)
        .map(toKinStoredDocument),
    [multipartAssemblies]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedIngestedDocuments = window.localStorage.getItem(INGESTED_DOCUMENTS_KEY);
    const savedDocumentOrder = window.localStorage.getItem(DOCUMENT_ORDER_KEY);
    const savedDocumentOverrides = window.localStorage.getItem(DOCUMENT_OVERRIDES_KEY);

    if (savedIngestedDocuments) {
      try {
        const parsed = JSON.parse(savedIngestedDocuments) as StoredDocument[];
        if (Array.isArray(parsed)) {
          setIngestedDocuments(
            parsed.filter(
              (item) => item?.id && item?.filename && item?.text && item?.sourceType === "ingested_file"
            )
          );
        }
      } catch {}
    }

    if (savedDocumentOrder) {
      try {
        const parsed = JSON.parse(savedDocumentOrder) as string[];
        if (Array.isArray(parsed)) setDocumentOrder(parsed.filter(Boolean));
      } catch {}
    }
    if (savedDocumentOverrides) {
      try {
        const parsed = JSON.parse(savedDocumentOverrides) as Record<string, Partial<StoredDocument>>;
        if (parsed && typeof parsed === "object") setDocumentOverrides(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      INGESTED_DOCUMENTS_KEY,
      JSON.stringify(ingestedDocuments)
    );
  }, [ingestedDocuments]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DOCUMENT_ORDER_KEY, JSON.stringify(documentOrder));
  }, [documentOrder]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DOCUMENT_OVERRIDES_KEY, JSON.stringify(documentOverrides));
  }, [documentOverrides]);

  const allDocuments = useMemo(() => {
    const defaultDocuments = [...kinDocuments, ...ingestedDocuments]
      .map((item) => {
        const override = documentOverrides[item.id];
        if (!override) return item;
        const text = typeof override.text === "string" ? override.text : item.text;
        const title = typeof override.title === "string" ? override.title : item.title;
        const summary = typeof override.summary === "string" ? override.summary : item.summary;
        const updatedAt =
          typeof override.updatedAt === "string" ? override.updatedAt : item.updatedAt;
        return {
          ...item,
          ...override,
          title,
          text,
          summary,
          updatedAt,
          charCount: text.length,
        };
      })
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    if (documentOrder.length === 0) return defaultDocuments;

    const byId = new Map(defaultDocuments.map((item) => [item.id, item]));
    const ordered: StoredDocument[] = [];
    documentOrder.forEach((id) => {
      const item = byId.get(id);
      if (item) {
        ordered.push(item);
        byId.delete(id);
      }
    });
    return [...ordered, ...Array.from(byId.values())];
  }, [documentOrder, ingestedDocuments, kinDocuments]);

  useEffect(() => {
    setDocumentOrder((prev) => {
      const currentIds = new Set([...kinDocuments, ...ingestedDocuments].map((item) => item.id));
      const next = prev.filter((id) => currentIds.has(id));
      const missing = allDocuments.map((item) => item.id).filter((id) => !next.includes(id));
      if (missing.length === 0 && next.length === prev.length) return prev;
      return [...next, ...missing];
    });
  }, [allDocuments, ingestedDocuments, kinDocuments]);

  const getStoredDocument = (documentId: string) =>
    allDocuments.find((item) => item.id === documentId) || null;

  const recordIngestedDocument = (document: Omit<StoredDocument, "id" | "sourceType">) => {
    const nextDocument: StoredDocument = {
      ...document,
      summary:
        (document.summary && document.summary.trim()) ||
        buildDocumentSummary(document.text, document.filename),
      id: `ingest:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceType: "ingested_file",
    };

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
            ? {
                ...item,
                ...patch,
                updatedAt,
                charCount: (patch.text ?? item.text).length,
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
      const next = prev.length > 0 ? [...prev] : allDocuments.map((item) => item.id);
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
    documentOrder,
    documentStorageMB,
    recordIngestedDocument,
    updateStoredDocument,
    deleteStoredDocument,
    moveStoredDocument,
    getStoredDocument,
  };
}
