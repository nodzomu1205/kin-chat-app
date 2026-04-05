import type { TaskDraft } from "@/types/task";

export type SuggestLabelInput = {
  explicitTitle?: string;
  searchQuery?: string;
  freeText?: string;
  fallback?: string;
};

const STOP_LABELS = new Set([
  "これ",
  "それ",
  "相談",
  "確認",
  "質問",
  "続き",
  "更新",
  "追加",
]);

function firstMeaningfulSegment(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const [first] = normalized
    .split(/\n|。|\.|\!|\?|！|？/)
    .map((item) => item.trim())
    .filter(Boolean);

  return first ?? normalized;
}

export function normalizeLabel(text: string, maxLength = 32): string {
  const cleaned = text
    .replace(/^[\-•●■◆◉]+\s*/, "")
    .replace(/^[:：\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  return cleaned.slice(0, maxLength).trim();
}

export function looksGenericLabel(text: string): boolean {
  const normalized = normalizeLabel(text, 20);
  if (!normalized) return true;
  return STOP_LABELS.has(normalized);
}

export function suggestTopicLabel(input: SuggestLabelInput): string {
  const explicit = normalizeLabel(input.explicitTitle ?? "");
  if (explicit && !looksGenericLabel(explicit)) return explicit;

  const search = normalizeLabel(input.searchQuery ?? "");
  if (search && !looksGenericLabel(search)) return search;

  const fromFreeText = normalizeLabel(firstMeaningfulSegment(input.freeText ?? ""));
  if (fromFreeText && !looksGenericLabel(fromFreeText)) return fromFreeText;

  return normalizeLabel(input.fallback ?? "会話");
}

export function suggestTaskTitle(input: SuggestLabelInput): string {
  const explicit = normalizeLabel(input.explicitTitle ?? "");
  if (explicit) return explicit;

  const search = normalizeLabel(input.searchQuery ?? "");
  if (search) return search;

  const fromBody = normalizeLabel(firstMeaningfulSegment(input.freeText ?? ""));
  if (fromBody && !looksGenericLabel(fromBody)) return fromBody;

  return normalizeLabel(input.fallback ?? "タスク");
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

export function resolveDraftTitle(
  draft: TaskDraft,
  input: SuggestLabelInput
): string {
  const suggested = suggestTaskTitle({
    ...input,
    fallback: draft.title || draft.taskName || input.fallback || "タスク",
  });

  return suggested || draft.title || draft.taskName || "タスク";
}
