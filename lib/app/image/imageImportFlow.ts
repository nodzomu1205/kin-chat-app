import {
  buildGeneratedImageStoredDocument,
  type GeneratedImageLibraryPayload,
} from "@/lib/app/image/imageLibrary";
import { saveGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import { readImageDimensions } from "@/lib/app/image/imageDimensions";
import {
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
  type SharedIngestOptions,
} from "@/lib/app/ingest/ingestClient";
import {
  buildCanonicalSummarySource,
  buildIngestedDocumentFilename,
} from "@/lib/app/ingest/ingestDocumentModel";
import { prepareIngestedStoredDocument } from "@/lib/app/ingest/ingestStoredDocumentPreparation";
import {
  buildDriveImportStoredText,
  buildDriveImportSummary,
} from "@/hooks/googleDrivePickerBuilders";
import { normalizeUsage } from "@/lib/shared/tokenStats";
import { generateId } from "@/lib/shared/uuid";
import type { StoredDocument } from "@/types/chat";

export type ImageLibraryImportMode = "image_only" | "image_with_description";
export type ImageImportSidecarText = {
  fileName: string;
  text: string;
};

export async function importImageFileToLibrary(args: {
  file: File;
  sidecarText?: ImageImportSidecarText;
  imageLibraryImportEnabled: boolean;
  mode: ImageLibraryImportMode;
  ingestOptions: SharedIngestOptions;
  autoGenerateLibrarySummary: boolean;
  currentTaskId?: string;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
}) {
  const base64 = await fileToBase64(args.file);
  const dimensions = await readImageDimensions({
    base64,
    mimeType: args.file.type || "image/png",
  });
  const sidecarText = args.sidecarText?.text.trim();
  const data = sidecarText
    ? null
    : await requestFileIngest({
        file: args.file,
        options: {
          ...args.ingestOptions,
          kind: "image",
        },
      });
  let totalIngestUsage = normalizeUsage(data?.data?.usage);
  if (data && !data.response.ok) {
    throw new Error(
      resolveIngestErrorMessage({
        data: data.data,
        fallback: "Image text import failed.",
      })
    );
  }

  const textLibraryContent =
    sidecarText || buildDriveImportStoredText(data?.data?.result || {});
  const fileTitle = sidecarText
    ? args.sidecarText?.fileName || args.file.name
    : resolveIngestFileTitle({
        data: data?.data || {},
        fallback: args.file.name,
      });
  let textStoredDocument: StoredDocument | null = null;
  const shouldRecordTextLibraryDocument =
    !sidecarText || !args.imageLibraryImportEnabled;
  if (shouldRecordTextLibraryDocument) {
    const rawTextForSummary = buildCanonicalSummarySource(textLibraryContent);
    const preparedDocument = await prepareIngestedStoredDocument({
      title: fileTitle,
      filename: buildIngestedDocumentFilename({
        title: fileTitle,
        fallbackFilename: args.file.name,
      }),
      text: textLibraryContent,
      taskId: args.currentTaskId,
      autoGenerateSummary: args.autoGenerateLibrarySummary,
      currentUsage: totalIngestUsage,
      fallbackSummary:
        args.autoGenerateLibrarySummary && rawTextForSummary
          ? buildDriveImportSummary({
              result: data?.data?.result,
              fallbackText: rawTextForSummary,
              fallbackTitle: fileTitle,
            })
          : "",
      onSummaryError: (error) => {
        console.warn("Image import summary generation failed", error);
      },
    });
    totalIngestUsage = preparedDocument.totalUsage;
    args.applyIngestUsage(totalIngestUsage);
    textStoredDocument = args.recordIngestedDocument(
      preparedDocument.storedDocument
    );
  }

  if (!args.imageLibraryImportEnabled) {
    return { payload: null, storedDocument: textStoredDocument };
  }

  const description =
    args.mode === "image_with_description" ? textLibraryContent.trim() : "";
  const imageId = `img_${generateId().replace(/[^A-Za-z0-9_-]+/g, "")}`;
  const payload: GeneratedImageLibraryPayload = {
    version: "0.1-generated-image",
    imageId,
    mimeType: args.file.type || "image/png",
    originalMimeType: args.file.type || "application/octet-stream",
    base64,
    prompt: `Imported image file: ${args.file.name}`,
    originalPrompt: args.file.name,
    description,
    source: "imported",
    fileName: args.file.name,
    fileSize: args.file.size,
    ...dimensions,
    alt: args.file.name,
    sourcePromptHash: imageId,
    createdAt: new Date().toISOString(),
  };

  await saveGeneratedImageAsset(payload);
  const storedDocument = args.recordIngestedDocument(
    buildGeneratedImageStoredDocument({
      payload,
      title: args.file.name,
    })
  );

  return { payload, storedDocument };
}

export async function saveImportedImageFileToLibrary(args: {
  file: File;
  description: string;
  mode: ImageLibraryImportMode;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
}) {
  const base64 = await fileToBase64(args.file);
  const dimensions = await readImageDimensions({
    base64,
    mimeType: args.file.type || "image/png",
  });
  const imageId = `img_${generateId().replace(/[^A-Za-z0-9_-]+/g, "")}`;
  const payload: GeneratedImageLibraryPayload = {
    version: "0.1-generated-image",
    imageId,
    mimeType: args.file.type || "image/png",
    originalMimeType: args.file.type || "application/octet-stream",
    base64,
    prompt: `Imported image file: ${args.file.name}`,
    originalPrompt: args.file.name,
    description:
      args.mode === "image_with_description" ? args.description.trim() : "",
    source: "imported",
    fileName: args.file.name,
    fileSize: args.file.size,
    ...dimensions,
    alt: args.file.name,
    sourcePromptHash: imageId,
    createdAt: new Date().toISOString(),
  };

  await saveGeneratedImageAsset(payload);
  const storedDocument = args.recordIngestedDocument(
    buildGeneratedImageStoredDocument({
      payload,
      title: args.file.name,
    })
  );

  return { payload, storedDocument };
}

export function buildDescriptionText(result: {
  selectedLines?: unknown[];
  rawText?: string;
  kinDetailed?: unknown[];
  kinCompact?: unknown[];
  structuredSummary?: unknown[];
}) {
  const fromArray = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  const lines =
    fromArray(result.selectedLines).length > 0
      ? fromArray(result.selectedLines)
      : result.rawText?.trim()
        ? result.rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
        : fromArray(result.kinDetailed).length > 0
          ? fromArray(result.kinDetailed)
          : fromArray(result.kinCompact).length > 0
            ? fromArray(result.kinCompact)
            : fromArray(result.structuredSummary);
  return lines.join("\n").trim();
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.split(",").pop() || "" : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
