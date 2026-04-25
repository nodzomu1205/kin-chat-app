import {
  resolveUploadKindFromFile,
} from "@/lib/app/gpt-task/gptTaskClient";
import {
  buildSharedIngestOptions,
  buildIngestRequestFormData,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
} from "@/lib/app/ingest/ingestClientBuilders";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import { normalizeUsage } from "@/lib/shared/tokenStats";

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
  const rawText = await response.text();
  let data: SharedIngestResult = {};

  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText) as SharedIngestResult;
    } catch {
      if (response.ok) {
        throw new Error("Invalid /api/ingest JSON response.");
      }
      data = {
        error: `Ingest request failed with a non-JSON response (${response.status} ${response.statusText || "unknown"}).`,
      };
    }
  } else if (response.ok) {
    throw new Error("Empty /api/ingest response.");
  } else {
    data = {
      error: `Ingest request failed with an empty response (${response.status} ${response.statusText || "unknown"}).`,
    };
  }

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
