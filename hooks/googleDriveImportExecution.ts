import type { Message, StoredDocument } from "@/types/chat";
import {
  fetchDriveFileBlob,
  listDriveChildFolders,
  listDriveFolderChildren,
  uploadDriveBlobFile,
  uploadDriveTextFile,
  type DriveFolderNode,
} from "@/lib/app/google-drive/googleDriveApi";
import {
  buildLibraryItemTextArtifacts,
} from "@/lib/app/reference-library/referenceLibraryItemActions";
import {
  isPortableJsonSidecarName,
  isPortablePresentationPlanTextName,
  portableSidecarKey,
} from "@/lib/app/reference-library/portableSidecarNames";
import { isGeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import { hydrateGeneratedImagePayload } from "@/lib/app/image/imageAssetStorage";
import {
  importImageFileToLibrary,
  type ImageLibraryImportMode,
} from "@/lib/app/image/imageImportFlow";
import { parsePresentationPayload } from "@/lib/app/presentation/presentationDocumentBuilders";
import {
  buildPortablePresentationPlanStoredDocument,
  parsePresentationPlanSidecarText,
} from "@/lib/app/presentation/presentationPlanPortable";
import { parseSearchContextSidecarText } from "@/lib/app/search-history/searchContextPortable";
import {
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
  type SharedIngestOptions,
} from "@/lib/app/ingest/ingestClient";
import {
  buildCanonicalSummarySource,
} from "@/lib/app/ingest/ingestDocumentModel";
import { extractReusableLibrarySummary } from "@/lib/app/ingest/importSummaryText";
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
  isDriveImageMimeType,
  resolveDrivePickedImportAction,
  resolveDriveUploadDestinationIndex,
  type DrivePickerDocument,
  type DrivePickedImportAction,
  type DrivePickerMode,
} from "@/hooks/googleDrivePickerBuilders";
import type { ReferenceLibraryItem } from "@/types/chat";
import type { SearchContext } from "@/types/task";

export type DriveImportFile = {
  id: string;
  name: string;
  mimeType: string;
  path?: string;
};

export type DriveImportOptions = {
  manageLoading?: boolean;
  sidecarFile?: DriveImportFile;
  sidecarText?: string;
  sidecarFileName?: string;
  forceImageLibraryImportEnabled?: boolean;
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
    options?: DriveImportOptions
  ) => Promise<void>;
  importDriveImageFile?: (
    file: DriveImportFile,
    options?: DriveImportOptions
  ) => Promise<void>;
  importDriveFolder: (
    folder: DriveImportFolder,
    mode: DriveFolderImportMode
  ) => Promise<void>;
  imageImportMode?: boolean;
};

export async function runDrivePickedDocumentsImport({
  docs,
  mode,
  importDriveFile,
  importDriveImageFile,
  importDriveFolder,
  imageImportMode = false,
}: RunDrivePickedDocumentsImportArgs) {
  const actions = docs
    .map((doc) => resolveDrivePickedImportAction({ doc, mode }))
    .filter((action): action is NonNullable<typeof action> => !!action);
  const pairedSidecarIds = new Set<string>();
  for (const action of actions) {
    if (action.kind !== "file" || !isDriveImageMimeType(action.file.mimeType)) {
      continue;
    }
    const sidecar = findMatchingDriveTextSidecar(action.file, actions);
    if (sidecar) pairedSidecarIds.add(sidecar.id);
  }
  for (const action of actions) {
    if (action.kind !== "file" || isDriveImageMimeType(action.file.mimeType)) {
      continue;
    }
    const sidecar = findMatchingDrivePortableTextSidecar(action.file, actions);
    if (sidecar) pairedSidecarIds.add(sidecar.id);
  }

  for (const action of actions) {
    if (action.kind === "folder") {
      await importDriveFolder(action.folder, action.mode);
      continue;
    }
    if (imageImportMode && !isDriveImageMimeType(action.file.mimeType)) {
      continue;
    }
    if (pairedSidecarIds.has(action.file.id)) continue;
    const sidecarFile = isDriveImageMimeType(action.file.mimeType)
      ? findMatchingDriveTextSidecar(action.file, actions)
      : findMatchingDrivePortableTextSidecar(action.file, actions);
    if (isDriveImageMimeType(action.file.mimeType) && importDriveImageFile) {
      await importDriveImageFile(action.file, {
        sidecarFile,
      });
      continue;
    }
    await importDriveFile(action.file, { sidecarFile });
  }
}

export type RunDriveFileImportArgs = {
  file: DriveImportFile;
  options?: DriveImportOptions;
  ensureAccessToken: () => Promise<string>;
  ingestOptions: SharedIngestOptions;
  autoGenerateLibrarySummary: boolean;
  currentTaskId?: string;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
  recordSearchContext?: (context: SearchContext) => SearchContext;
  appendUiMessage: (
    text: string,
    sourceType?: DriveUiMessageSourceType
  ) => void;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  focusGptPanel: () => boolean;
};

export async function runDriveFileImport({
  file,
  options = {},
  ensureAccessToken,
  ingestOptions,
  autoGenerateLibrarySummary,
  currentTaskId,
  recordIngestedDocument,
  recordSearchContext,
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
  const reusableLibrarySummary = isTextLikeDriveFile(file)
    ? extractReusableLibrarySummary(await downloadedFile.text().catch(() => ""))
    : "";
  const presentationSidecarText = await readDriveSidecarText({
    accessToken,
    sidecarFile: options.sidecarFile,
  });
  const portablePresentationPlan = parsePresentationPlanSidecarText(
    presentationSidecarText
  );
  if (portablePresentationPlan) {
    const text = await downloadedFile.text();
    const title =
      portablePresentationPlan.title?.trim() ||
      resolveDrivePortableTitle(file.path || file.name);
    const storedDocument = buildPortablePresentationPlanStoredDocument({
      title,
      filename: file.name,
      text,
      summary: portablePresentationPlan.summary,
      plan: portablePresentationPlan.plan,
      taskId: currentTaskId,
    });
    recordIngestedDocument(storedDocument);
    appendUiMessage(
      buildDriveImportSavedInfoMessage({
        title,
        storedDocumentCharCount: storedDocument.charCount,
      }),
      "file_ingest"
    );
    focusGptPanel();
    return;
  }
  const portableSearchContext = parseSearchContextSidecarText(
    presentationSidecarText
  );
  if (portableSearchContext && recordSearchContext) {
    recordSearchContext({
      ...portableSearchContext,
      taskId: currentTaskId || portableSearchContext.taskId,
    });
    appendUiMessage(
      buildDriveImportSavedInfoMessage({
        title: portableSearchContext.query || file.name,
        storedDocumentCharCount: portableSearchContext.rawText.length,
      }),
      "search"
    );
    focusGptPanel();
    return;
  }
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
    fallbackSummary: reusableLibrarySummary ||
      (autoGenerateLibrarySummary && rawTextForSummary
        ? buildDriveImportSummary({
            result: data?.result,
            fallbackText: rawTextForSummary,
            fallbackTitle: title,
          })
        : ""),
    reuseFallbackSummary: !!reusableLibrarySummary,
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

export async function runDriveImageFileImport(args: {
  file: DriveImportFile;
  sidecarFile?: DriveImportFile;
  sidecarText?: string;
  sidecarFileName?: string;
  ensureAccessToken: () => Promise<string>;
  ingestOptions: SharedIngestOptions;
  autoGenerateLibrarySummary: boolean;
  currentTaskId?: string;
  imageLibraryImportEnabled: boolean;
  forceImageLibraryImportEnabled?: boolean;
  imageLibraryImportMode: ImageLibraryImportMode;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
  appendUiMessage: (
    text: string,
    sourceType?: DriveUiMessageSourceType
  ) => void;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  focusGptPanel: () => boolean;
}) {
  const accessToken = await args.ensureAccessToken();
  const blob = await fetchDriveFileBlob({
    fileId: args.file.id,
    mimeType: args.file.mimeType,
    accessToken,
  });
  if (!blob.type.startsWith("image/") && !args.file.mimeType.startsWith("image/")) {
    args.appendUiMessage(
      buildDriveImportFailedMessage({
        errorMessage: `Image import supports image files only: ${args.file.name}`,
      })
    );
    args.focusGptPanel();
    return;
  }
  const downloadedFile = new File([blob], args.file.name, {
    type: blob.type || args.file.mimeType || "image/png",
  });
  const sidecarText =
    args.sidecarText ||
    (await readDriveSidecarText({
      accessToken,
      sidecarFile: args.sidecarFile,
    }));
  const { payload } = await importImageFileToLibrary({
    file: downloadedFile,
    sidecarText: sidecarText
      ? {
          fileName:
            args.sidecarFileName || args.sidecarFile?.name || args.file.name,
          text: sidecarText,
        }
      : undefined,
    imageLibraryImportEnabled:
      args.forceImageLibraryImportEnabled || args.imageLibraryImportEnabled,
    mode: args.imageLibraryImportMode,
    ingestOptions: args.ingestOptions,
    autoGenerateLibrarySummary: args.autoGenerateLibrarySummary,
    currentTaskId: args.currentTaskId,
    recordIngestedDocument: args.recordIngestedDocument,
    applyIngestUsage: args.applyIngestUsage,
  });
  args.appendUiMessage(
    [
      payload
        ? "Image imported to the image library."
        : "Image imported as text to the library.",
      "",
      ...(payload ? [`Image ID: ${payload.imageId}`] : []),
      `File: ${payload?.fileName || args.file.name}`,
    ].join("\n"),
    "file_ingest"
  );
  args.focusGptPanel();
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
    options: DriveImportOptions
  ) => Promise<void>;
  importDriveImageFile?: (
    file: DriveFolderNode,
    options: DriveImportOptions
  ) => Promise<void>;
  focusGptPanel: () => boolean;
};

export async function runDriveFolderImport({
  folder,
  mode,
  ensureAccessToken,
  appendUiMessage,
  importDriveFile,
  importDriveImageFile,
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
  const pairedSidecarIds = new Set<string>();
  for (const file of files) {
    if (!isDriveImageMimeType(file.mimeType)) continue;
    const sidecar = findMatchingDriveTextSidecar(file, files);
    if (sidecar) pairedSidecarIds.add(sidecar.id);
  }
  for (const file of files) {
    if (isDriveImageMimeType(file.mimeType)) continue;
    const sidecar = findMatchingDrivePortableTextSidecar(file, files);
    if (sidecar) pairedSidecarIds.add(sidecar.id);
  }
  for (const file of files) {
    if (pairedSidecarIds.has(file.id)) continue;
    if (isDriveImageMimeType(file.mimeType) && importDriveImageFile) {
      await importDriveImageFile(file, {
        manageLoading: false,
        sidecarFile: findMatchingDriveTextSidecar(file, files),
      });
      continue;
    }
    await importDriveFile(file, {
      manageLoading: false,
      sidecarFile: findMatchingDrivePortableTextSidecar(file, files),
    });
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
    if (artifact.kind === "text") {
      const uploadedText = await uploadDriveTextFile({
        accessToken,
        folderId: destinationFolderId,
        fileName: artifact.fileName,
        text: artifact.text,
        ...(artifact.mimeType ? { mimeType: artifact.mimeType } : {}),
      });
      uploadedNames.push(uploadedText.name || artifact.fileName);
      continue;
    }
    const uploadedBinary =
      artifact.kind === "blob"
        ? await uploadDriveBlobFile({
            accessToken,
            folderId: destinationFolderId,
            fileName: artifact.fileName,
            blob: artifact.blob,
            mimeType: artifact.mimeType,
          })
        : null;
    if (uploadedBinary) uploadedNames.push(uploadedBinary.name || artifact.fileName);
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
  const textArtifacts = buildLibraryItemTextArtifacts(item).map((artifact) => ({
    kind: "text" as const,
    ...artifact,
  }));
  const primary = textArtifacts[0];
  if (!primary) {
    throw new Error("Library item export did not produce a text artifact.");
  }
  const imageArtifact = await buildGeneratedImageDriveArtifact(item);
  if (imageArtifact) return [primary, ...textArtifacts.slice(1), imageArtifact];
  if (textArtifacts.length > 1) return [primary, ...textArtifacts.slice(1)];
  const pptxArtifact = await buildPresentationPptxDriveArtifact(item);
  return pptxArtifact ? [primary, pptxArtifact] : [primary];
}

async function buildGeneratedImageDriveArtifact(
  item: ReferenceLibraryItem
): Promise<Extract<DriveUploadArtifact, { kind: "blob" }> | null> {
  const payload = isGeneratedImageLibraryPayload(item.structuredPayload)
    ? await hydrateGeneratedImagePayload(item.structuredPayload)
    : null;
  if (!payload || typeof atob === "undefined") return null;
  if (!payload.base64) return null;
  const binary = atob(payload.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return {
    kind: "blob",
    fileName: `${payload.imageId}.${imageExtension(payload.mimeType)}`,
    blob: new Blob([bytes], { type: payload.mimeType || "image/png" }),
    mimeType: payload.mimeType || "image/png",
  };
}

function imageExtension(mimeType?: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function findMatchingDriveTextSidecar(
  imageFile: DriveImportFile,
  files: Array<DriveImportFile | DrivePickedImportAction>
): DriveImportFile | undefined {
  const imageKey = portableSidecarKey(imageFile.name);
  if (!imageKey) return undefined;
  const imageFolder = driveFolderPath(imageFile.path);
  for (const candidate of files) {
    const file = "kind" in candidate
      ? candidate.kind === "file"
        ? candidate.file
        : null
      : candidate;
    if (!file || file.id === imageFile.id) continue;
    if (isDriveImageMimeType(file.mimeType)) continue;
    if (!canImportDriveMimeType(file.mimeType)) continue;
    const candidatePath =
      "path" in file && typeof file.path === "string" ? file.path : undefined;
    if (driveFolderPath(candidatePath) !== imageFolder) {
      continue;
    }
    if (portableSidecarKey(file.name) === imageKey) return file;
  }
  return undefined;
}

function findMatchingDrivePortableTextSidecar(
  textFile: DriveImportFile,
  files: Array<DriveImportFile | DrivePickedImportAction>
): DriveImportFile | undefined {
  if (isDriveImageMimeType(textFile.mimeType)) return undefined;
  if (!isPortablePresentationPlanTextName(textFile.name)) return undefined;
  const textKey = portableSidecarKey(textFile.name);
  if (!textKey) return undefined;
  const textFolder = driveFolderPath(textFile.path);
  for (const candidate of files) {
    const file = "kind" in candidate
      ? candidate.kind === "file"
        ? candidate.file
        : null
      : candidate;
    if (!file || file.id === textFile.id) continue;
    if (!isPortableJsonSidecarName(file.name)) continue;
    const candidatePath =
      "path" in file && typeof file.path === "string" ? file.path : undefined;
    if (driveFolderPath(candidatePath) !== textFolder) continue;
    if (portableSidecarKey(file.name) === textKey) return file;
  }
  return undefined;
}

function driveFolderPath(path?: string) {
  if (!path) return "";
  const slashIndex = path.lastIndexOf("/");
  return slashIndex >= 0 ? path.slice(0, slashIndex) : "";
}

function resolveDrivePortableTitle(fileName: string) {
  const lastSlashIndex = fileName.lastIndexOf("/");
  const baseName = lastSlashIndex >= 0 ? fileName.slice(lastSlashIndex + 1) : fileName;
  return baseName.replace(/\.[^.]+$/u, "").trim() || fileName;
}

function isTextLikeDriveFile(file: DriveImportFile) {
  if (file.mimeType.startsWith("text/")) return true;
  return /\.(txt|md|markdown)$/iu.test(file.name);
}

async function readDriveSidecarText(args: {
  accessToken: string;
  sidecarFile?: DriveImportFile;
}) {
  if (!args.sidecarFile) return "";
  const blob = await fetchDriveFileBlob({
    fileId: args.sidecarFile.id,
    mimeType: args.sidecarFile.mimeType,
    accessToken: args.accessToken,
  });
  return blob.text();
}

async function buildPresentationPptxDriveArtifact(
  item: ReferenceLibraryItem
): Promise<Extract<DriveUploadArtifact, { kind: "blob" }> | null> {
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

async function renderPresentationPptxBlob(args: {
  documentId: string;
  spec?: unknown;
  frameSpec?: unknown;
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
