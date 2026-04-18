import { parseTaskInput } from "@/lib/taskInputParser";
import { resolveDraftTitle } from "@/lib/app/contextNaming";
import type { TaskDraft } from "@/types/task";

export type TaskCharConstraint = {
  rule: "exact" | "at_least" | "up_to" | "around";
  limit: number;
} | null;

export function buildRemovedSearchContextDraft(
  draft: TaskDraft,
  rawResultId: string,
  updatedAt: string
) {
  return draft.searchContext?.rawResultId === rawResultId
    ? {
        ...draft,
        searchContext: null,
        updatedAt,
      }
    : draft;
}

export function resolveCurrentTaskCharConstraint(
  currentTaskIntentConstraints: string[]
): TaskCharConstraint {
  const constraints = currentTaskIntentConstraints || [];
  for (const item of constraints) {
    let match = item.match(/exactly\s+(\d+)\s+Japanese characters/i);
    if (match) return { rule: "exact", limit: Number(match[1]) };
    match = item.match(/at or above\s+(\d+)\s+Japanese characters/i);
    if (match) return { rule: "at_least", limit: Number(match[1]) };
    match = item.match(/at or under\s+(\d+)\s+Japanese characters/i);
    if (match) return { rule: "up_to", limit: Number(match[1]) };
    match = item.match(/around\s+(\d+)\s+Japanese characters/i);
    if (match) return { rule: "around", limit: Number(match[1]) };
  }
  return null;
}

export function buildUpdatedTaskDraft(
  draft: TaskDraft,
  patch: Partial<TaskDraft>,
  updatedAt: string
) {
  return {
    ...draft,
    ...patch,
    updatedAt,
  };
}

export function buildTaskDraftFromPrefixedText(
  draft: TaskDraft,
  text: string,
  updatedAt: string
) {
  const parsed = parseTaskInput(text);
  if (!parsed.title && !parsed.userInstruction) {
    return {
      draft,
      parsed,
    };
  }

  return {
    draft: {
      ...draft,
      title: parsed.title || draft.title,
      taskName: parsed.title?.trim() ? parsed.title.trim() : draft.taskName,
      userInstruction: parsed.userInstruction || draft.userInstruction,
      updatedAt,
    },
    parsed,
  };
}

export function resolveTaskTitle(
  draft: TaskDraft,
  params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }
) {
  return resolveDraftTitle(draft, params);
}

export function resolveTaskBaseText(draft: TaskDraft) {
  if (draft.body.trim()) return draft.body.trim();
  if (draft.mergedText.trim()) return draft.mergedText.trim();
  if (draft.deepenText.trim()) return draft.deepenText.trim();
  if (draft.prepText.trim()) return draft.prepText.trim();
  return "";
}
