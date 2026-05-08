import type { StoredDocument } from "@/types/chat";
import type { GeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import { isGeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import { hydrateGeneratedImagePayload } from "@/lib/app/image/imageAssetStorage";
import {
  buildPresentationPlanSidecarFileName,
  buildPresentationPlanSidecarText,
  isPresentationTaskPlan,
} from "@/lib/app/presentation/presentationPlanPortable";

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
    const storedImagePayload = getStoredDocumentDownloadImagePayload(document);
    const imagePayload = storedImagePayload
      ? await hydrateGeneratedImagePayload(storedImagePayload)
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
      downloadTextDocument({
        fileName: resolveStoredDocumentTextDownloadFileName(document),
        text: document.text,
      });
      return;
    }
    const presentationPlan = getStoredDocumentDownloadPresentationPlan(document);
    downloadTextDocument({
      fileName: resolveStoredDocumentTextDownloadFileName(document),
      text: document.text,
    });
    if (presentationPlan) {
      downloadTextDocument({
        fileName: buildPresentationPlanSidecarFileName({
          filename: document.filename,
          title: document.title,
        }),
        text: buildPresentationPlanSidecarText({
          title: document.title,
          filename: document.filename,
          summary: document.summary,
          plan: presentationPlan,
        }),
        mimeType: "application/json;charset=utf-8",
      });
    }
  };

  return {
    loadStoredDocumentToGptInput,
    downloadStoredDocument,
  };
}

export function getStoredDocumentDownloadPresentationPlan(
  document: Pick<StoredDocument, "artifactType" | "structuredPayload">
) {
  if (document.artifactType !== "presentation_plan") return null;
  return isPresentationTaskPlan(document.structuredPayload)
    ? document.structuredPayload
    : null;
}

export function getStoredDocumentDownloadImagePayload(
  document: Pick<StoredDocument, "artifactType" | "structuredPayload">
): GeneratedImageLibraryPayload | null {
  if (document.artifactType !== "generated_image") return null;
  return isGeneratedImageLibraryPayload(document.structuredPayload)
    ? document.structuredPayload
    : null;
}

export function resolveStoredDocumentTextDownloadFileName(
  document: Pick<StoredDocument, "filename" | "title">
) {
  const rawName = (document.filename || document.title || "document").trim();
  const sanitizedName = rawName.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_");
  const fileName = sanitizedName || "document";
  if (hasTextLikeExtension(fileName)) return fileName;
  const imageMatch = fileName.match(/\.(?:png|jpe?g|webp|gif|bmp|tiff?|heic|avif|svg)$/iu);
  if (imageMatch) {
    return `${fileName.slice(0, -imageMatch[0].length)}.txt`;
  }
  return fileName.includes(".") ? `${fileName}.txt` : `${fileName}.txt`;
}

function downloadTextDocument(args: {
  fileName: string;
  text: string;
  mimeType?: string;
}) {
  if (typeof window === "undefined") return;
  const blob = new Blob([args.text], {
    type: args.mimeType || "text/plain;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download =
    args.fileName.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_") || "document.txt";
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function hasTextLikeExtension(fileName: string) {
  return /\.(?:txt|md|markdown|json|csv|tsv|log|yaml|yml)$/iu.test(fileName);
}

function imageExtension(mimeType?: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}
