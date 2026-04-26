import { buildIngestedDocumentRecord } from "@/lib/app/ingest/ingestDocumentModel";
import { resolveGeneratedImportSummary } from "@/lib/app/ingest/importSummaryGeneration";
import type { normalizeUsage } from "@/lib/shared/tokenStats";

type NormalizedUsage = ReturnType<typeof normalizeUsage>;
type IngestedDocumentRecord = ReturnType<typeof buildIngestedDocumentRecord>;

export type PrepareIngestedStoredDocumentArgs = {
  title: string;
  filename: string;
  text: string;
  taskId?: string;
  autoGenerateSummary: boolean;
  currentUsage: NormalizedUsage;
  fallbackSummary?: string;
  timestamp?: string;
  onSummaryError?: (error: unknown) => void;
};

export async function prepareIngestedStoredDocument({
  title,
  filename,
  text,
  taskId,
  autoGenerateSummary,
  currentUsage,
  fallbackSummary,
  timestamp = new Date().toISOString(),
  onSummaryError,
}: PrepareIngestedStoredDocumentArgs): Promise<{
  storedDocument: IngestedDocumentRecord;
  summary: string;
  totalUsage: NormalizedUsage;
}> {
  const summaryResult = await resolveGeneratedImportSummary({
    enabled: autoGenerateSummary,
    title,
    canonicalText: text,
    currentUsage,
    fallbackSummary,
    onError: onSummaryError,
  });

  return {
    storedDocument: buildIngestedDocumentRecord({
      title,
      filename,
      text,
      summary: summaryResult.summary,
      taskId,
      timestamp,
    }),
    summary: summaryResult.summary,
    totalUsage: summaryResult.totalUsage,
  };
}
