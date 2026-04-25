import type { ParsedInputLike } from "@/lib/app/send-to-gpt/sendToGptFlowTypes";

export function shouldRespondToTaskDirectiveOnlyInput(params: {
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
}) {
  const hasSearch = !!params.effectiveParsedSearchQuery;
  const hasTaskDirectives = !!(
    params.parsedInput.title || params.parsedInput.userInstruction
  );

  return hasTaskDirectives && !hasSearch && !params.parsedInput.freeText;
}

export function getTaskDirectiveOnlyResponseText() {
  return "タスクのタイトルと指示を更新しました。";
}

export function buildNormalizedRequestText(params: {
  rawText: string;
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
}) {
  const resolvedSearchQuery =
    params.effectiveParsedSearchQuery || params.parsedInput.searchQuery || "";
  const normalizedRequestText = [
    resolvedSearchQuery ? `検索: ${resolvedSearchQuery}` : "",
    params.parsedInput.freeText || "",
  ]
    .filter(Boolean)
    .join("\n");

  return normalizedRequestText || params.rawText;
}
