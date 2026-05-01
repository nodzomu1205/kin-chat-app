import type { StoredDocument } from "@/types/chat";
import type { TaskDraft } from "@/types/task";
import { buildLibraryFilenameWithCharCount } from "@/lib/app/ingest/ingestDocumentModel";
import {
  ensurePresentationPlanDocumentId,
  buildPresentationTaskPlanFromText,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";

function trimLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getTaskDraftLibraryTitle(taskDraft: TaskDraft) {
  const title =
    taskDraft.title.trim() ||
    taskDraft.taskName.trim() ||
    taskDraft.userInstruction.trim().slice(0, 48);

  if (taskDraft.mode === "presentation") {
    return title ? `PPT Design - ${title}` : "PPT Design";
  }
  return title ? `Task Snapshot - ${title}` : "Task Snapshot";
}

export function buildTaskDraftLibraryText(taskDraft: TaskDraft) {
  const sections = [
    taskDraft.userInstruction.trim()
      ? ["Instruction", taskDraft.userInstruction.trim()].join("\n")
      : "",
    taskDraft.body.trim() ? taskDraft.body.trim() : "",
    taskDraft.mergedText.trim() && taskDraft.mergedText.trim() !== taskDraft.body.trim()
      ? ["Full", taskDraft.mergedText.trim()].join("\n")
      : "",
    taskDraft.deepenText.trim() &&
    taskDraft.deepenText.trim() !== taskDraft.mergedText.trim() &&
    taskDraft.deepenText.trim() !== taskDraft.body.trim()
      ? ["Deepen", taskDraft.deepenText.trim()].join("\n")
      : "",
    taskDraft.prepText.trim() &&
    taskDraft.prepText.trim() !== taskDraft.deepenText.trim() &&
    taskDraft.prepText.trim() !== taskDraft.mergedText.trim() &&
    taskDraft.prepText.trim() !== taskDraft.body.trim()
      ? ["Prep", taskDraft.prepText.trim()].join("\n")
      : "",
  ].filter(Boolean);

  return sections.join("\n\n").trim();
}

export function buildTaskDraftLibrarySummarySource(taskDraft: TaskDraft) {
  return [
    taskDraft.userInstruction.trim(),
    taskDraft.body.trim(),
    taskDraft.mergedText.trim(),
    taskDraft.deepenText.trim(),
    taskDraft.prepText.trim(),
  ]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join("\n\n")
    .trim();
}

export function buildTaskDraftLibrarySummary(taskDraft: TaskDraft) {
  const summarySource =
    taskDraft.body.trim() ||
    taskDraft.mergedText.trim() ||
    taskDraft.deepenText.trim() ||
    taskDraft.prepText.trim() ||
    taskDraft.userInstruction.trim();

  const compact = trimLine(summarySource);
  if (!compact) return "Saved task snapshot";
  return compact.length > 220 ? `${compact.slice(0, 220).trimEnd()}...` : compact;
}

export function buildStoredDocumentFromTaskDraft(
  taskDraft: TaskDraft
): Omit<StoredDocument, "id" | "sourceType"> | null {
  const presentationPlan =
    taskDraft.mode === "presentation" && taskDraft.presentationPlan
      ? ensurePresentationPlanDocumentId(taskDraft.presentationPlan)
      : null;
  const text =
    taskDraft.mode === "presentation" && presentationPlan
      ? formatPresentationTaskPlanText(presentationPlan)
      : buildTaskDraftLibraryText(taskDraft);
  if (!text) return null;

  const now = new Date().toISOString();
  const title = getTaskDraftLibraryTitle(taskDraft);
  const structuredPayload =
    taskDraft.mode === "presentation"
      ? presentationPlan ||
        buildPresentationTaskPlanFromText({
          title: taskDraft.title || taskDraft.taskName || title,
          text,
        })
      : undefined;

  return {
    artifactType:
      taskDraft.mode === "presentation" ? "presentation_plan" : "task_snapshot",
    title,
    filename: buildLibraryFilenameWithCharCount(`${title}.txt`, text),
    text,
    summary: buildTaskDraftLibrarySummary(taskDraft),
    taskId: taskDraft.taskId || undefined,
    taskTitle: taskDraft.title || taskDraft.taskName || undefined,
    charCount: text.length,
    structuredPayload,
    createdAt: now,
    updatedAt: now,
  };
}
