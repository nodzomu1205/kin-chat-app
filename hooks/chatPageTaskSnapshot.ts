import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";
import { cleanImportSummarySource } from "@/lib/app/ingest/importSummaryText";
import { buildCanonicalSummarySource } from "@/lib/app/ingest/ingestDocumentModel";
import {
  requestGeneratedLibrarySummary,
} from "@/lib/app/reference-library/librarySummaryClient";
import { normalizeLibrarySummaryIngestUsage } from "@/lib/app/ingest/ingestUsage";
import {
  buildStoredDocumentFromTaskDraft,
  buildTaskDraftLibrarySummarySource,
} from "@/lib/app/task-draft/taskDraftLibrary";

export function buildChatPageTaskSnapshotDocument(
  args: Pick<ChatPageWorkspaceViewArgs, "task">
) {
  return buildStoredDocumentFromTaskDraft(args.task.currentTaskDraft);
}

export async function saveChatPageTaskSnapshot(
  args: Pick<ChatPageWorkspaceViewArgs, "task" | "usage"> &
    Partial<Pick<ChatPageWorkspaceViewArgs, "gpt">>
) {
  const nextDocument = buildChatPageTaskSnapshotDocument(args);
  if (!nextDocument) return false;

  const summarySource = buildCanonicalSummarySource(
    buildTaskDraftLibrarySummarySource(args.task.currentTaskDraft)
  );
  let generatedSummary = nextDocument.summary || "";

  if (args.gpt?.autoGenerateLibrarySummary !== false && summarySource.trim()) {
    try {
      const summaryResult = await requestGeneratedLibrarySummary({
        title: nextDocument.title,
        text: summarySource,
      });
      if (summaryResult.summary?.trim()) {
        generatedSummary = cleanImportSummarySource(summaryResult.summary).trim();
      }
      args.usage.applyIngestUsage(
        normalizeLibrarySummaryIngestUsage(summaryResult.usage)
      );
    } catch (error) {
      console.warn("Task snapshot summary generation failed", error);
    }
  }

  args.usage.recordIngestedDocument({
    ...nextDocument,
    summary: generatedSummary,
  });
  return true;
}
