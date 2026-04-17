import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  ResponseMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";

type StorageLike = Pick<Storage, "getItem"> | null;

export const RESPONSE_MODE_KEY = "gpt_response_mode";
export const UPLOAD_KIND_KEY = "gpt_upload_kind";
export const INGEST_MODE_KEY = "gpt_ingest_mode";
export const IMAGE_DETAIL_KEY = "gpt_image_detail";
export const POST_INGEST_ACTION_KEY = "gpt_post_ingest_action";
export const FILE_READ_POLICY_KEY = "gpt_file_read_policy";
export const COMPACT_CHAR_LIMIT_KEY = "gpt_compact_char_limit";
export const SIMPLE_IMAGE_CHAR_LIMIT_KEY = "gpt_simple_image_char_limit";

export type PersistedGptOptionsState = {
  responseMode: ResponseMode;
  uploadKind: UploadKind;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  postIngestAction: PostIngestAction;
  fileReadPolicy: FileReadPolicy;
};

export function getDefaultPersistedGptOptionsState(): PersistedGptOptionsState {
  return {
    responseMode: "creative",
    uploadKind: "text",
    ingestMode: "detailed",
    imageDetail: "detailed",
    compactCharLimit: 500,
    simpleImageCharLimit: 500,
    postIngestAction: "inject_only",
    fileReadPolicy: "text_and_layout",
  };
}

export function loadPersistedGptOptionsState(
  storage: StorageLike
): PersistedGptOptionsState {
  const initialState = getDefaultPersistedGptOptionsState();
  if (!storage) {
    return initialState;
  }

  const savedMode = storage.getItem(RESPONSE_MODE_KEY);
  if (savedMode === "strict" || savedMode === "creative") {
    initialState.responseMode = savedMode;
  } else if (savedMode === "balanced") {
    initialState.responseMode = "strict";
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

  const savedPostIngestAction = storage.getItem(POST_INGEST_ACTION_KEY);
  if (
    savedPostIngestAction === "inject_only" ||
    savedPostIngestAction === "inject_and_prep" ||
    savedPostIngestAction === "inject_prep_deepen" ||
    savedPostIngestAction === "attach_to_current_task"
  ) {
    initialState.postIngestAction = savedPostIngestAction;
  }

  const savedFileReadPolicy = storage.getItem(FILE_READ_POLICY_KEY);
  if (
    savedFileReadPolicy === "text_first" ||
    savedFileReadPolicy === "visual_first" ||
    savedFileReadPolicy === "text_and_layout"
  ) {
    initialState.fileReadPolicy = savedFileReadPolicy;
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
