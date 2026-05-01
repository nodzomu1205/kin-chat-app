import type {
  FileReadPolicy,
  ImageDetail,
  ImageLibraryImportMode,
  IngestMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";

type StorageLike = Pick<Storage, "getItem"> | null;

export const UPLOAD_KIND_KEY = "gpt_upload_kind";
export const INGEST_MODE_KEY = "gpt_ingest_mode";
export const IMAGE_DETAIL_KEY = "gpt_image_detail";
export const FILE_READ_POLICY_KEY = "gpt_file_read_policy";
export const COMPACT_CHAR_LIMIT_KEY = "gpt_compact_char_limit";
export const SIMPLE_IMAGE_CHAR_LIMIT_KEY = "gpt_simple_image_char_limit";
export const IMAGE_LIBRARY_IMPORT_ENABLED_KEY =
  "gpt_image_library_import_enabled";
export const IMAGE_LIBRARY_IMPORT_MODE_KEY = "gpt_image_library_import_mode";
export const AUTO_GENERATE_LIBRARY_SUMMARY_KEY =
  "gpt_auto_generate_library_summary";
export const LEGACY_DRIVE_IMPORT_AUTO_SUMMARY_KEY =
  "gpt_drive_import_auto_summary";

export type PersistedGptOptionsState = {
  uploadKind: UploadKind;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  fileReadPolicy: FileReadPolicy;
  imageLibraryImportEnabled: boolean;
  imageLibraryImportMode: ImageLibraryImportMode;
  autoGenerateLibrarySummary: boolean;
};

export function getDefaultPersistedGptOptionsState(): PersistedGptOptionsState {
  return {
    uploadKind: "text",
    ingestMode: "detailed",
    imageDetail: "detailed",
    compactCharLimit: 500,
    simpleImageCharLimit: 500,
    fileReadPolicy: "text_and_layout",
    imageLibraryImportEnabled: false,
    imageLibraryImportMode: "image_only",
    autoGenerateLibrarySummary: true,
  };
}

export function loadPersistedGptOptionsState(
  storage: StorageLike
): PersistedGptOptionsState {
  const initialState = getDefaultPersistedGptOptionsState();
  if (!storage) {
    return initialState;
  }

  const savedUploadKind = storage.getItem(UPLOAD_KIND_KEY);
  if (
    savedUploadKind === "auto" ||
    savedUploadKind === "text" ||
    savedUploadKind === "image" ||
    savedUploadKind === "pdf" ||
    savedUploadKind === "mixed"
  ) {
    initialState.uploadKind = savedUploadKind;
  }

  const savedIngestMode = storage.getItem(INGEST_MODE_KEY);
  if (
    savedIngestMode === "compact" ||
    savedIngestMode === "detailed" ||
    savedIngestMode === "max"
  ) {
    initialState.ingestMode = savedIngestMode;
  } else if (savedIngestMode === "strict") {
    initialState.ingestMode = "compact";
  } else if (savedIngestMode === "creative" || savedIngestMode === "full") {
    initialState.ingestMode = "detailed";
  }

  const savedImageDetail = storage.getItem(IMAGE_DETAIL_KEY);
  if (
    savedImageDetail === "simple" ||
    savedImageDetail === "detailed" ||
    savedImageDetail === "max"
  ) {
    initialState.imageDetail = savedImageDetail;
  } else if (savedImageDetail === "low") {
    initialState.imageDetail = "simple";
  } else if (savedImageDetail === "auto") {
    initialState.imageDetail = "detailed";
  } else if (savedImageDetail === "high") {
    initialState.imageDetail = "max";
  }

  const savedFileReadPolicy = storage.getItem(FILE_READ_POLICY_KEY);
  if (
    savedFileReadPolicy === "text_first" ||
    savedFileReadPolicy === "visual_first" ||
    savedFileReadPolicy === "text_and_layout"
  ) {
    initialState.fileReadPolicy = savedFileReadPolicy;
  }

  const savedImageLibraryImportMode = storage.getItem(
    IMAGE_LIBRARY_IMPORT_MODE_KEY
  );
  if (
    savedImageLibraryImportMode === "image_only" ||
    savedImageLibraryImportMode === "image_with_description"
  ) {
    initialState.imageLibraryImportMode = savedImageLibraryImportMode;
  }

  const savedImageLibraryImportEnabled = storage.getItem(
    IMAGE_LIBRARY_IMPORT_ENABLED_KEY
  );
  if (savedImageLibraryImportEnabled === "true") {
    initialState.imageLibraryImportEnabled = true;
  } else if (savedImageLibraryImportEnabled === "false") {
    initialState.imageLibraryImportEnabled = false;
  }

  const savedAutoGenerateLibrarySummary =
    storage.getItem(AUTO_GENERATE_LIBRARY_SUMMARY_KEY) ??
    storage.getItem(LEGACY_DRIVE_IMPORT_AUTO_SUMMARY_KEY);
  if (savedAutoGenerateLibrarySummary === "true") {
    initialState.autoGenerateLibrarySummary = true;
  } else if (savedAutoGenerateLibrarySummary === "false") {
    initialState.autoGenerateLibrarySummary = false;
  }

  const savedCompactCharLimit = Number(storage.getItem(COMPACT_CHAR_LIMIT_KEY));
  if (Number.isFinite(savedCompactCharLimit) && savedCompactCharLimit >= 100) {
    initialState.compactCharLimit = Math.floor(savedCompactCharLimit);
  }

  const savedSimpleImageCharLimit = Number(
    storage.getItem(SIMPLE_IMAGE_CHAR_LIMIT_KEY)
  );
  if (
    Number.isFinite(savedSimpleImageCharLimit) &&
    savedSimpleImageCharLimit >= 100
  ) {
    initialState.simpleImageCharLimit = Math.floor(savedSimpleImageCharLimit);
  }

  return initialState;
}
