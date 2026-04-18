import {
  resolveUploadKindFromFile,
} from "@/lib/app/gptTaskClient";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import { normalizeUsage } from "@/lib/tokenStats";

export type SharedIngestOptions = {
  kind: UploadKind;
  mode: IngestMode;
  detail: ImageDetail;
  readPolicy: FileReadPolicy;
  compactCharLimit: number;
  simpleImageCharLimit: number;
};

export type SharedIngestResult = {
  result?: {
    title?: string;
    selectedLines?: unknown[];
    rawText?: string;
    structuredSummary?: unknown[];
    kinCompact?: unknown[];
    kinDetailed?: unknown[];
  };
  usage?: Parameters<typeof normalizeUsage>[0];
  error?: string;
  kinBlocks?: string[];
};

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

export async function requestFileIngest(params: {
  file: File;
  options: SharedIngestOptions;
}) {
  const resolvedKind = resolveUploadKindFromFile(
    params.file,
    params.options.kind
  );
  const form = buildIngestRequestFormData({
    file: params.file,
    resolvedKind,
    options: params.options,
  });
  const response = await fetch("/api/ingest", {
    method: "POST",
    body: form,
  });
  const data = (await response.json()) as SharedIngestResult;

  return {
    response,
    data,
    resolvedKind,
  };
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
