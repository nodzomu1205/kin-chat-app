import type { TaskDraft } from "@/types/task";

export type SuggestLabelInput = {
  explicitTitle?: string;
  searchQuery?: string;
  freeText?: string;
  fallback?: string;
};

const DEFAULT_TASK_TITLE = "Task";
const DEFAULT_TOPIC_LABEL = "Topic";
const MAX_LABEL_LENGTH = 80;

const STOP_LABELS = new Set([
  "",
  "task",
  "prepared task",
  "deepened task",
  "reply",
  "response",
  "update",
  "note",
  "message",
  "comment",
  "chat",
  "topic",
]);

function normalizeSpace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function trimLabelPunctuation(text: string) {
  return text.replace(/^[[(\s"'`]+/, "").replace(/[\])\s"'`.,:;!?]+$/, "").trim();
}

function normalizeLabel(text: string, maxLength = MAX_LABEL_LENGTH) {
  const cleaned = trimLabelPunctuation(normalizeSpace(text));
  if (!cleaned) return "";
  return cleaned.slice(0, maxLength).trim();
}

function looksLikeFilenameLabel(text: string) {
  const normalized = normalizeLabel(text);
  if (!normalized) return false;
  if (/\[[0-9]+\s*chars\]/i.test(normalized)) return true;
  if (/\.[A-Za-z0-9]{1,8}(?:\.[A-Za-z0-9]{1,8})+$/i.test(normalized)) return true;
  return /\.[A-Za-z0-9]{1,8}$/i.test(normalized);
}

export function looksGenericLabel(text: string): boolean {
  const normalized = normalizeLabel(text, 24);
  if (!normalized) return true;
  if (looksLikeFilenameLabel(normalized)) return true;

  const lowered = normalized.toLowerCase();
  return STOP_LABELS.has(lowered) || STOP_LABELS.has(normalized);
}

export function suggestTopicLabel(input: SuggestLabelInput): string {
  const explicit = normalizeLabel(input.explicitTitle ?? "");
  if (explicit && !looksGenericLabel(explicit)) return explicit;

  const search = normalizeLabel(input.searchQuery ?? "");
  if (search && !looksGenericLabel(search)) return search;

  return normalizeLabel(input.fallback ?? DEFAULT_TOPIC_LABEL);
}

export function suggestTaskTitle(input: SuggestLabelInput): string {
  const explicit = normalizeLabel(input.explicitTitle ?? "");
  if (explicit && !looksGenericLabel(explicit)) return explicit;

  const search = normalizeLabel(input.searchQuery ?? "");
  if (search && !looksGenericLabel(search)) return search;

  return normalizeLabel(input.fallback ?? DEFAULT_TASK_TITLE);
}

export function shouldUpdateTopic(prevTopic?: string, nextTopic?: string): boolean {
  const prev = normalizeLabel(prevTopic ?? "");
  const next = normalizeLabel(nextTopic ?? "");

  if (!next) return false;
  if (!prev) return true;
  if (prev === next) return false;
  if (looksGenericLabel(next)) return false;
  return true;
}

export function resolveDraftTitle(draft: TaskDraft, input: SuggestLabelInput): string {
  const suggested = suggestTaskTitle({
    explicitTitle: input.explicitTitle,
    searchQuery: input.searchQuery,
    fallback: draft.title || draft.taskName || input.fallback || DEFAULT_TASK_TITLE,
  });

  return suggested || draft.title || draft.taskName || DEFAULT_TASK_TITLE;
}
