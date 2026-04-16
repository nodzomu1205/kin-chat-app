import type { StoredDocument } from "@/types/chat";

export type StoredDocumentUiActionArgs = {
  getStoredDocument: (documentId: string) => StoredDocument | null;
  setGptInput: React.Dispatch<React.SetStateAction<string>>;
  isMobile: boolean;
  setActiveTab: React.Dispatch<React.SetStateAction<"kin" | "gpt">>;
};

export function useStoredDocumentUiActions({
  getStoredDocument,
  setGptInput,
  isMobile,
  setActiveTab,
}: StoredDocumentUiActionArgs) {
  const loadStoredDocumentToGptInput = (documentId: string) => {
    const document = getStoredDocument(documentId);
    if (!document) return;
    setGptInput(document.text);
    if (isMobile) setActiveTab("gpt");
  };

  const downloadStoredDocument = (documentId: string) => {
    const document = getStoredDocument(documentId);
    if (!document || typeof window === "undefined") return;
    const blob = new Blob([document.text], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${document.filename.replace(/[^\w.-]+/g, "_") || "document"}.txt`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return {
    loadStoredDocumentToGptInput,
    downloadStoredDocument,
  };
}
