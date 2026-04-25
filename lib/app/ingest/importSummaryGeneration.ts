import {
  normalizeLibrarySummaryUsage,
  requestGeneratedLibrarySummary,
} from "@/lib/app/reference-library/librarySummaryClient";
import { cleanImportSummarySource } from "@/lib/app/ingest/importSummaryText";
import { buildCanonicalSummarySource } from "@/lib/app/ingest/ingestDocumentModel";
import { addUsage, normalizeUsage } from "@/lib/shared/tokenStats";

type NormalizedUsage = ReturnType<typeof normalizeUsage>;

export async function resolveGeneratedImportSummary(args: {
  enabled: boolean;
  title: string;
  canonicalText: string;
  currentUsage: NormalizedUsage;
  fallbackSummary?: string;
  onError?: (error: unknown) => void;
}) {
  const summarySourceText = buildCanonicalSummarySource(args.canonicalText);
  let summary = args.fallbackSummary
    ? cleanImportSummarySource(args.fallbackSummary).trim()
    : "";
  let totalUsage = args.currentUsage;

  if (!args.enabled || !summarySourceText.trim()) {
    return {
      summary,
      summarySourceText,
      totalUsage,
    };
  }

  try {
    const summaryResult = await requestGeneratedLibrarySummary({
      title: args.title,
      text: summarySourceText,
    });
    if (summaryResult.summary?.trim()) {
      summary = cleanImportSummarySource(summaryResult.summary).trim();
    }
    totalUsage = addUsage(
      totalUsage,
      normalizeUsage(normalizeLibrarySummaryUsage(summaryResult.usage))
    );
  } catch (error) {
    args.onError?.(error);
  }

  return {
    summary,
    summarySourceText,
    totalUsage,
  };
}
