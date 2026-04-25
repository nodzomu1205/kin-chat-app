import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
} from "@/lib/server/ingest/routeHelpers";
import {
  chooseLinesWithinBudget,
  splitRawTextIntoLines,
} from "@/lib/server/ingest/routeHelpers";

export function resolveIngestResultSelection(params: {
  uploadKind: "text" | "visual";
  readPolicy: FileReadPolicy;
  detail: ImageDetail;
  mode: IngestMode;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  normalized: {
    rawText?: string;
    structuredSummary: string[];
    kinCompact: string[];
    kinDetailed: string[];
  };
}) {
  let selectedLines: string[] = [];
  let summaryLevel = "kin_compact";
  const compactLines =
    params.normalized.kinCompact.length > 0
      ? params.normalized.kinCompact
      : chooseLinesWithinBudget(
          params.normalized.structuredSummary,
          [],
          params.uploadKind === "visual"
            ? params.simpleImageCharLimit
            : params.compactCharLimit
        );

  if (params.uploadKind === "visual") {
    if (params.readPolicy === "text_first") {
      const rawTextLines =
        params.detail === "max" && params.normalized.rawText?.trim()
          ? splitRawTextIntoLines(params.normalized.rawText)
          : [];
      selectedLines =
        rawTextLines.length > 0
          ? rawTextLines
          : params.detail === "max"
          ? params.normalized.kinDetailed.length > 0
            ? params.normalized.kinDetailed
            : params.normalized.kinCompact
          : params.detail === "detailed"
            ? params.normalized.kinDetailed.length > 0
              ? params.normalized.kinDetailed
              : params.normalized.kinCompact
            : compactLines;
      summaryLevel =
        params.detail === "max" ? "visual_text_first_max" : "visual_text_first";
    } else if (params.readPolicy === "hybrid") {
      selectedLines =
        params.detail === "max"
          ? params.normalized.kinDetailed.length > 0
            ? params.normalized.kinDetailed
            : params.normalized.kinCompact
          : params.detail === "detailed"
            ? params.normalized.kinDetailed.length > 0
              ? params.normalized.kinDetailed
              : params.normalized.kinCompact
            : compactLines;
      summaryLevel = params.detail === "max" ? "visual_hybrid_max" : "visual_hybrid";
    } else {
      selectedLines =
        params.detail === "simple"
          ? compactLines
          : params.detail === "detailed"
            ? params.normalized.kinDetailed.length > 0
              ? params.normalized.kinDetailed
              : params.normalized.kinCompact
            : params.normalized.kinDetailed.length > 0
              ? params.normalized.kinDetailed
              : params.normalized.kinCompact;

      summaryLevel =
        params.detail === "max"
          ? "visual_detail_max"
          : params.detail === "detailed"
            ? "visual_detail"
            : "visual_basic";
    }
  } else {
    selectedLines =
      params.mode === "max"
        ? params.normalized.kinDetailed.length > 0
          ? params.normalized.kinDetailed
          : params.normalized.kinCompact
        : params.mode === "detailed"
          ? params.normalized.kinDetailed.length > 0
            ? params.normalized.kinDetailed
            : params.normalized.kinCompact
          : compactLines;

    summaryLevel =
      params.mode === "max"
        ? "full_text"
        : params.mode === "detailed"
          ? "detailed_text"
          : "compact_text";
  }

  return { selectedLines, summaryLevel };
}
