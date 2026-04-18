import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { SharedIngestOptions, SharedIngestResult } from "@/lib/app/ingestClient";

export function buildIngestRequestFormData(params: {
  file: File;
  resolvedKind: UploadKind;
  options: SharedIngestOptions;
}) {
  const form = new FormData();
  form.append("file", params.file);
  form.append("kind", params.resolvedKind);
  form.append("mode", params.options.mode);
  form.append("detail", params.options.detail);
  form.append("readPolicy", params.options.readPolicy);
  form.append("compactCharLimit", String(params.options.compactCharLimit));
  form.append(
    "simpleImageCharLimit",
    String(params.options.simpleImageCharLimit)
  );
  return form;
}

export function resolveIngestFileTitle(params: {
  data: SharedIngestResult;
  fallback: string;
}) {
  const title = params.data?.result?.title;
  return typeof title === "string" && title.trim()
    ? title.trim()
    : params.fallback;
}

export function resolveIngestErrorMessage(params: {
  data: SharedIngestResult;
  fallback: string;
}) {
  return typeof params.data?.error === "string" && params.data.error.trim()
    ? params.data.error.trim()
    : params.fallback;
}

export function buildSharedIngestOptions(params: {
  kind: UploadKind;
  mode: IngestMode;
  detail: ImageDetail;
  readPolicy: FileReadPolicy;
  compactCharLimit: number;
  simpleImageCharLimit: number;
}): SharedIngestOptions {
  return {
    kind: params.kind,
    mode: params.mode,
    detail: params.detail,
    readPolicy: params.readPolicy,
    compactCharLimit: params.compactCharLimit,
    simpleImageCharLimit: params.simpleImageCharLimit,
  };
}
