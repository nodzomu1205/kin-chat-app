import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
} from "@/lib/server/ingest/routeHelpers";
import {
  chooseIntermediateLines,
  chooseLinesWithinBudget,
} from "@/lib/server/ingest/routeHelpers";

export function resolveIngestResultSelection(params: {
  uploadKind: "text" | "visual";
  readPolicy: FileReadPolicy;
  detail: ImageDetail;
  mode: IngestMode;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  normalized: {
    structuredSummary: string[];
    kinCompact: string[];
    kinDetailed: string[];
  };
}) {
  let selectedLines: string[] = [];
  let summaryLevel = "kin_compact";

  if (params.uploadKind === "visual") {
    if (params.readPolicy === "text_first") {
      selectedLines =
        params.detail === "max"
          ? params.normalized.kinDetailed.length > 0
            ? params.normalized.kinDetailed
            : params.normalized.kinCompact
          : params.detail === "detailed"
            ? chooseIntermediateLines(
                params.normalized.kinDetailed,
                params.normalized.kinCompact,
                {
                  ratio: 0.6,
                  min: Math.max(700, params.simpleImageCharLimit + 180),
                  max: 2200,
                }
              )
            : chooseLinesWithinBudget(
                params.normalized.kinCompact,
                params.normalized.structuredSummary,
                params.simpleImageCharLimit
              );
      summaryLevel =
        params.detail === "max" ? "visual_text_first_max" : "visual_text_first";
    } else if (params.readPolicy === "hybrid") {
      selectedLines =
        params.detail === "max"
          ? params.normalized.kinDetailed.length > 0
            ? params.normalized.kinDetailed
            : params.normalized.kinCompact
          : params.detail === "detailed"
            ? chooseIntermediateLines(
                params.normalized.kinDetailed,
                params.normalized.kinCompact,
                {
                  ratio: 0.62,
                  min: Math.max(720, params.simpleImageCharLimit + 220),
                  max: 2400,
                }
              )
            : chooseLinesWithinBudget(
                params.normalized.kinCompact,
                params.normalized.structuredSummary,
                params.simpleImageCharLimit
              );
      summaryLevel = params.detail === "max" ? "visual_hybrid_max" : "visual_hybrid";
    } else {
      selectedLines =
        params.detail === "simple"
          ? chooseLinesWithinBudget(
              params.normalized.kinCompact,
              params.normalized.structuredSummary,
              params.simpleImageCharLimit
            )
          : params.detail === "detailed"
            ? chooseIntermediateLines(
                params.normalized.kinDetailed,
                params.normalized.kinCompact,
                {
                  ratio: 0.65,
                  min: Math.max(760, params.simpleImageCharLimit + 260),
                  max: 2600,
                }
              )
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
          ? chooseIntermediateLines(
              params.normalized.kinDetailed,
              params.normalized.kinCompact,
              {
                ratio: 0.58,
                min: Math.max(800, params.compactCharLimit + 240),
                max: 2600,
              }
            )
          : chooseLinesWithinBudget(
              params.normalized.kinCompact,
              params.normalized.structuredSummary,
              params.compactCharLimit
            );

    summaryLevel =
      params.mode === "max"
        ? "full_text"
        : params.mode === "detailed"
          ? "detailed_text"
          : "compact_text";
  }

  return { selectedLines, summaryLevel };
}
