import { parseTaskInput } from "@/lib/task/taskInputParser";
import { resolveDraftTitle } from "@/lib/app/task-support/contextNaming";
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
    const normalized = item.normalize("NFKC");
    let match = normalized.match(/exactly\s+(\d+)\s+(?:Japanese\s+)?characters/i);
    if (match) return { rule: "exact", limit: Number(match[1]) };
    match = normalized.match(/(?:at or above|at least|minimum|no less than|not less than)\s+(\d+)\s+(?:Japanese\s+)?characters/i);
    if (match) return { rule: "at_least", limit: Number(match[1]) };
    match = normalized.match(/(\d+)\s*(?:characters?|文字)\s*(?:以上|or more)/i);
    if (match) return { rule: "at_least", limit: Number(match[1]) };
    match = normalized.match(/(?:at or under|up to|within|at most|no more than|not more than)\s+(\d+)\s+(?:Japanese\s+)?characters/i);
    if (match) return { rule: "up_to", limit: Number(match[1]) };
    match = normalized.match(/(\d+)\s*(?:characters?|文字)\s*(?:以内|以下|まで|or less)/i);
    if (match) return { rule: "up_to", limit: Number(match[1]) };
    match = normalized.match(/(?:around|about|approximately)\s+(\d+)\s+(?:Japanese\s+)?characters/i);
    if (match) return { rule: "around", limit: Number(match[1]) };
    match = normalized.match(/(\d+)\s*(?:characters?|文字)\s*(?:前後|程度|くらい)/i);
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
