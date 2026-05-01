import type { StoredDocument } from "@/types/chat";
import { isGeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import { hydrateGeneratedImagePayload } from "@/lib/app/image/imageAssetStorage";

export type StoredDocumentUiActionArgs = {
  getStoredDocument: (documentId: string) => StoredDocument | null;
  setGptInput: React.Dispatch<React.SetStateAction<string>>;
  focusGptPanel: () => boolean;
};

export function useStoredDocumentUiActions({
  getStoredDocument,
  setGptInput,
  focusGptPanel,
}: StoredDocumentUiActionArgs) {
  const loadStoredDocumentToGptInput = (documentId: string) => {
    const document = getStoredDocument(documentId);
    if (!document) return;
    setGptInput(document.text);
    focusGptPanel();
  };

  const downloadStoredDocument = async (documentId: string) => {
    const document = getStoredDocument(documentId);
    if (!document || typeof window === "undefined") return;
    const imagePayload = isGeneratedImageLibraryPayload(document.structuredPayload)
      ? await hydrateGeneratedImagePayload(document.structuredPayload)
      : null;
    if (imagePayload?.base64) {
      const bytes = base64ToBytes(imagePayload.base64);
      const blob = new Blob([bytes], { type: imagePayload.mimeType || "image/png" });
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${imagePayload.imageId}.${imageExtension(imagePayload.mimeType)}`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      return;
    }
    const blob = new Blob([document.text], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download =
      document.filename.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_") ||
      "document.txt";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return {
    loadStoredDocumentToGptInput,
    downloadStoredDocument,
  };
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function imageExtension(mimeType?: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}
