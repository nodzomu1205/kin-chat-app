import { createTaskSource } from "@/lib/app/taskDraftHelpers";

export function resolveUpdateTaskTitle(params: {
  explicitTitle?: string;
  currentTitle?: string;
  currentTaskName?: string;
  freeText?: string;
  searchQuery?: string;
  fallback?: string;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
}) {
  if (params.explicitTitle?.trim()) {
    return params.getResolvedTaskTitle({
      explicitTitle: params.explicitTitle,
      freeText: params.freeText,
      searchQuery: params.searchQuery,
      fallback: params.fallback,
    });
  }

  const current = params.currentTitle?.trim() || params.currentTaskName?.trim();
  if (current) return current;

  return params.getResolvedTaskTitle({
    freeText: params.freeText,
    searchQuery: params.searchQuery,
    fallback: params.fallback,
  });
}

export function resolveTaskTitleFromResult(params: {
  explicitTitle?: string;
  currentTitle?: string;
  currentTaskName?: string;
  resultText: string;
  searchQuery?: string;
  fallback?: string;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
}) {
  if (params.explicitTitle?.trim()) {
    return params.getResolvedTaskTitle({
      explicitTitle: params.explicitTitle,
      freeText: params.resultText,
      searchQuery: params.searchQuery,
      fallback: params.fallback,
    });
  }

  const inferred = params.getResolvedTaskTitle({
    freeText: params.resultText,
    searchQuery: params.searchQuery,
    fallback: params.fallback,
  });
  if (inferred?.trim()) {
    return inferred;
  }

  return (
    params.currentTitle?.trim() ||
    params.currentTaskName?.trim() ||
    params.fallback ||
    "Task"
  );
}

export function buildGptTaskPrepSource(text: string) {
  return createTaskSource("gpt_chat", "GPT task prep", text);
}

export function buildGptTaskUpdateSource(text: string) {
  return createTaskSource("manual_note", "GPT task update", text);
}

export function buildLatestGptTaskSource(params: {
  directionInstruction: string;
  latestGptText: string;
}) {
  return createTaskSource(
    "manual_note",
    "Latest GPT message",
    params.directionInstruction
      ? `Direction:\n${params.directionInstruction}\n\nLatest GPT response:\n${params.latestGptText}`
      : params.latestGptText
  );
}
