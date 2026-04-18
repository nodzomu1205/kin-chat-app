import {
  resolveUploadKindFromFile,
} from "@/lib/app/gptTaskClient";
import {
  buildSharedIngestOptions,
  buildIngestRequestFormData,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
} from "@/lib/app/ingestClientBuilders";
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
export {
  buildIngestRequestFormData,
  buildSharedIngestOptions,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
};
