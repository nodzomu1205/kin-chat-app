import type { Message, StoredDocument } from "@/types/chat";
import {
  fetchDriveFileBlob,
  listDriveChildFolders,
  listDriveFolderChildren,
  uploadDriveBlobFile,
  uploadDriveTextFile,
  type DriveFolderNode,
} from "@/lib/app/google-drive/googleDriveApi";
import { buildLibraryItemDriveExport } from "@/lib/app/reference-library/referenceLibraryItemActions";
import { parsePresentationPayload } from "@/lib/app/presentation/presentationDocumentBuilders";
import {
  buildPresentationSpecFromTaskPlan,
  buildPresentationTaskPlanFromText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import {
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
  type SharedIngestOptions,
} from "@/lib/app/ingest/ingestClient";
import {
  buildCanonicalSummarySource,
} from "@/lib/app/ingest/ingestDocumentModel";
import { prepareIngestedStoredDocument } from "@/lib/app/ingest/ingestStoredDocumentPreparation";
import { normalizeUsage } from "@/lib/shared/tokenStats";
import {
  buildDriveImportFailedMessage,
  buildDriveImportSavedInfoMessage,
  buildDriveImportStoredText,
  buildDriveImportSummary,
  buildDriveFolderIndexMessage,
  buildDriveUploadCancelledMessage,
  buildDriveUploadCompletedMessage,
  buildDriveUploadDestinationPrompt,
  buildDriveUploadInvalidSelectionMessage,
  canImportDriveMimeType,
  resolveDrivePickedImportAction,
  resolveDriveUploadDestinationIndex,
  type DrivePickerDocument,
  type DrivePickerMode,
} from "@/hooks/googleDrivePickerBuilders";
import type { ReferenceLibraryItem } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";

export type DriveImportFile = {
  id: string;
  name: string;
  mimeType: string;
  path?: string;
};

export type DriveUiMessageSourceType = NonNullable<Message["meta"]>["sourceType"];

export type DriveImportFolder = {
  id: string;
  name: string;
};

export type DriveFolderImportMode = "index" | "import";

export type RunDrivePickedDocumentsImportArgs = {
  docs: DrivePickerDocument[];
  mode: DrivePickerMode;
  importDriveFile: (
    file: DriveImportFile,
    options?: { manageLoading?: boolean }
  ) => Promise<void>;
  importDriveFolder: (
    folder: DriveImportFolder,
    mode: DriveFolderImportMode
  ) => Promise<void>;
};

export async function runDrivePickedDocumentsImport({
  docs,
  mode,
  importDriveFile,
  importDriveFolder,
}: RunDrivePickedDocumentsImportArgs) {
  for (const doc of docs) {
    const action = resolveDrivePickedImportAction({ doc, mode });
    if (!action) continue;
    if (action.kind === "folder") {
      await importDriveFolder(action.folder, action.mode);
      continue;
    }
    await importDriveFile(action.file);
  }
}

export type RunDriveFileImportArgs = {
  file: DriveImportFile;
  ensureAccessToken: () => Promise<string>;
  ingestOptions: SharedIngestOptions;
  autoGenerateLibrarySummary: boolean;
  currentTaskId?: string;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
  appendUiMessage: (
    text: string,
    sourceType?: DriveUiMessageSourceType
  ) => void;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  focusGptPanel: () => boolean;
};

export async function runDriveFileImport({
  file,
  ensureAccessToken,
  ingestOptions,
  autoGenerateLibrarySummary,
  currentTaskId,
  recordIngestedDocument,
  appendUiMessage,
  applyIngestUsage,
  focusGptPanel,
}: RunDriveFileImportArgs) {
  const accessToken = await ensureAccessToken();
  const blob = await fetchDriveFileBlob({
    fileId: file.id,
    mimeType: file.mimeType,
    accessToken,
  });
  const downloadedFile = new File([blob], file.name, {
    type:
      file.mimeType === "application/vnd.google-apps.spreadsheet"
        ? "text/csv"
        : blob.type || file.mimeType || "application/octet-stream",
  });
  const { response, data } = await requestFileIngest({
    file: downloadedFile,
    options: ingestOptions,
  });
  let totalIngestUsage = normalizeUsage(data?.usage);
  if (!response.ok) {
    appendUiMessage(
      buildDriveImportFailedMessage({
        errorMessage: resolveIngestErrorMessage({
          data,
          fallback: `Failed to import ${file.name}.`,
        }),
      })
    );
    focusGptPanel();
    return;
  }

  const storedText = buildDriveImportStoredText(data?.result || {});
  const title = file.path || resolveIngestFileTitle({
    data,
    fallback: file.name,
  });
  const rawTextForSummary = buildCanonicalSummarySource(storedText);
  const preparedDocument = await prepareIngestedStoredDocument({
    title,
    filename: title,
    text: storedText,
    taskId: currentTaskId,
    autoGenerateSummary: autoGenerateLibrarySummary,
    currentUsage: totalIngestUsage,
    fallbackSummary:
      autoGenerateLibrarySummary && rawTextForSummary
        ? buildDriveImportSummary({
            result: data?.result,
            fallbackText: rawTextForSummary,
            fallbackTitle: title,
          })
        : "",
    onSummaryError: (error) => {
      console.warn("Drive import summary generation failed", error);
    },
  });
  totalIngestUsage = preparedDocument.totalUsage;

  applyIngestUsage(totalIngestUsage);

  const storedDocument = preparedDocument.storedDocument;
  recordIngestedDocument(storedDocument);
  appendUiMessage(
    buildDriveImportSavedInfoMessage({
      title,
      storedDocumentCharCount: storedDocument.charCount,
    }),
    "file_ingest"
  );
  focusGptPanel();
}

export type RunDriveFolderImportArgs = {
  folder: DriveImportFolder;
  mode: DriveFolderImportMode;
  ensureAccessToken: () => Promise<string>;
  appendUiMessage: (
    text: string,
    sourceType?: DriveUiMessageSourceType
  ) => void;
  importDriveFile: (
    file: DriveFolderNode,
    options: { manageLoading?: boolean }
  ) => Promise<void>;
  focusGptPanel: () => boolean;
};

export async function runDriveFolderImport({
  folder,
  mode,
  ensureAccessToken,
  appendUiMessage,
  importDriveFile,
  focusGptPanel,
}: RunDriveFolderImportArgs) {
  const accessToken = await ensureAccessToken();
  const entries = await listDriveFolderChildren({
    accessToken,
    folderId: folder.id,
    currentPath: folder.name,
  });
  appendUiMessage(
    buildDriveFolderIndexMessage({
      folderName: folder.name,
      entries,
    })
  );
  focusGptPanel();
  if (mode === "index") return;

  const files = entries.filter((file) => canImportDriveMimeType(file.mimeType));
  for (const file of files) {
    await importDriveFile(file, { manageLoading: false });
  }
}

export type RunDriveLibraryItemUploadArgs = {
  item: ReferenceLibraryItem;
  folderId: string;
  ensureAccessToken: () => Promise<string>;
  promptForDestination: (message: string) => string | null;
  appendUiMessage: (
    text: string,
    sourceType?: DriveUiMessageSourceType
  ) => void;
  focusGptPanel: () => boolean;
};

export async function runDriveLibraryItemUpload({
  item,
  folderId,
  ensureAccessToken,
  promptForDestination,
  appendUiMessage,
  focusGptPanel,
}: RunDriveLibraryItemUploadArgs) {
  const accessToken = await ensureAccessToken();
  let destinationFolderId = folderId;
  let destinationFolderName = "configured folder";
  const childFolders = await listDriveChildFolders({
    accessToken,
    folderId,
  });

  if (childFolders.length > 0) {
    const selectionInput = promptForDestination(
      buildDriveUploadDestinationPrompt({
        childFolders,
      })
    );
    if (selectionInput === null) {
      appendUiMessage(buildDriveUploadCancelledMessage());
      focusGptPanel();
      return "cancelled" as const;
    }
    const selectionIndex = resolveDriveUploadDestinationIndex({
      input: selectionInput,
      childFolderCount: childFolders.length,
    });
    if (selectionIndex === null) {
      appendUiMessage(buildDriveUploadInvalidSelectionMessage());
      focusGptPanel();
      return "cancelled" as const;
    }
    if (selectionIndex >= 0) {
      const selectedFolder = childFolders[selectionIndex];
      destinationFolderId = selectedFolder.id;
      destinationFolderName = selectedFolder.name;
    }
  }

  const artifacts = await buildDriveUploadArtifacts(item);
  const uploadedNames: string[] = [];
  const primaryArtifact = artifacts[0];
  const uploaded = await uploadDriveTextFile({
    accessToken,
    folderId: destinationFolderId,
    fileName: primaryArtifact.fileName,
    text: primaryArtifact.text,
    ...(primaryArtifact.mimeType ? { mimeType: primaryArtifact.mimeType } : {}),
  });
  uploadedNames.push(uploaded.name || primaryArtifact.fileName);

  for (const artifact of artifacts.slice(1)) {
    if (artifact.kind !== "blob") continue;
    const uploadedBinary = await uploadDriveBlobFile({
      accessToken,
      folderId: destinationFolderId,
      fileName: artifact.fileName,
      blob: artifact.blob,
      mimeType: artifact.mimeType,
    });
    uploadedNames.push(uploadedBinary.name || artifact.fileName);
  }

  appendUiMessage(
    buildDriveUploadCompletedMessage({
      fileName: uploadedNames.join(", "),
      destinationFolderName,
    })
  );
  focusGptPanel();
  return "uploaded" as const;
}

type DriveUploadArtifact =
  | {
      kind: "text";
      fileName: string;
      text: string;
      mimeType?: string;
    }
  | {
      kind: "blob";
      fileName: string;
      blob: Blob;
      mimeType: string;
    };

async function buildDriveUploadArtifacts(
  item: ReferenceLibraryItem
): Promise<
  [Extract<DriveUploadArtifact, { kind: "text" }>, ...DriveUploadArtifact[]]
> {
  const primary = {
    kind: "text" as const,
    ...buildLibraryItemDriveExport(item),
  };
  const pptxArtifact = await buildPresentationPptxDriveArtifact(item);
  return pptxArtifact ? [primary, pptxArtifact] : [primary];
}

async function buildPresentationPptxDriveArtifact(
  item: ReferenceLibraryItem
): Promise<Extract<DriveUploadArtifact, { kind: "blob" }> | null> {
  if (item.artifactType === "presentation_plan") {
    return buildPresentationPlanPptxDriveArtifact(item);
  }

  if (item.artifactType !== "presentation") return null;
  if (typeof fetch === "undefined") return null;

  const payload = parsePresentationPayload(item.excerptText);
  const latest = payload?.outputs[payload.outputs.length - 1];
  if (!payload || !latest?.filename) return null;

  const fetchedBlob = latest.path
    ? await fetch(latest.path)
        .then((response) => (response.ok ? response.blob() : null))
        .catch(() => null)
    : null;
  const blob =
    fetchedBlob ||
    (await renderPresentationPptxBlob({
      documentId: payload.documentId,
      spec: payload.spec,
    }));
  if (!blob) return null;

  return {
    kind: "blob",
    fileName: latest.filename,
    blob,
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
}

function isPresentationTaskPlan(value: unknown): value is PresentationTaskPlan {
  return (
    !!value &&
    typeof value === "object" &&
    (value as PresentationTaskPlan).version === "0.1-presentation-task-plan"
  );
}

async function buildPresentationPlanPptxDriveArtifact(
  item: ReferenceLibraryItem
): Promise<Extract<DriveUploadArtifact, { kind: "blob" }> | null> {
  if (typeof fetch === "undefined") return null;

  const parsedPlan = buildPresentationTaskPlanFromText({
    title: item.title,
    text: item.excerptText,
  });
  const storedPlan = isPresentationTaskPlan(item.structuredPayload)
    ? item.structuredPayload
    : null;
  const plan =
    parsedPlan.slides.length > 0
      ? {
          ...parsedPlan,
          latestPptx: storedPlan?.latestPptx || null,
        }
      : storedPlan || parsedPlan;
  const spec = buildPresentationSpecFromTaskPlan(plan);
  const latest = plan.latestPptx;
  const fetchedBlob = latest?.path
    ? await fetch(latest.path)
        .then((response) => (response.ok ? response.blob() : null))
        .catch(() => null)
    : null;
  const blob =
    fetchedBlob ||
    (await renderPresentationPptxBlob({
      documentId: item.sourceId.replace(/[^A-Za-z0-9_-]+/g, "_"),
      spec,
    }));
  if (!blob) return null;

  return {
    kind: "blob",
    fileName:
      latest?.filename ||
      `${(spec.title || item.title || "presentation-plan")
        .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_")
        .slice(0, 100)}.pptx`,
    blob,
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
}

async function renderPresentationPptxBlob(args: {
  documentId: string;
  spec: unknown;
}): Promise<Blob | null> {
  const response = await fetch("/api/presentation-render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  }).catch(() => null);
  if (!response?.ok) return null;

  const data = (await response.json().catch(() => null)) as {
    output?: {
      contentBase64?: unknown;
      mimeType?: unknown;
    };
  } | null;
  const contentBase64 = data?.output?.contentBase64;
  if (typeof contentBase64 !== "string" || !contentBase64) return null;

  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], {
    type:
      typeof data.output?.mimeType === "string"
        ? data.output.mimeType
        : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
