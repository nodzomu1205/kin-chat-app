import { parseTaskInput, type ParsedTaskInput } from "@/lib/task/taskInputParser";

export type RoutedTaskInput = {
  rawText: string;
  parsed: ParsedTaskInput;
  hasSearch: boolean;
  hasTaskDirectives: boolean;
  hasFreeText: boolean;
  requestText: string;
  finalRequestText: string;
  shouldSearch: boolean;
  shouldUpdateDraftOnly: boolean;
  shouldSendChat: boolean;
  shouldAutoNameTask: boolean;
  shouldAutoUpdateTopic: boolean;
};

export function routeTaskInput(text: string): RoutedTaskInput {
  const rawText = text.trim();
  const parsed = parseTaskInput(rawText);

  const hasSearch = !!parsed.searchQuery.trim();
  const hasTaskDirectives = !!(
    parsed.title.trim() || parsed.userInstruction.trim()
  );
  const hasFreeText = !!parsed.freeText.trim();

  const requestText = [
    hasSearch ? `検索：${parsed.searchQuery.trim()}` : "",
    hasFreeText ? parsed.freeText.trim() : "",
  ]
    .filter(Boolean)
    .join("\n");

  const finalRequestText = requestText || rawText;

  return {
    rawText,
    parsed,
    hasSearch,
    hasTaskDirectives,
    hasFreeText,
    requestText,
    finalRequestText,
    shouldSearch: hasSearch,
    shouldUpdateDraftOnly: hasTaskDirectives && !hasSearch && !hasFreeText,
    shouldSendChat: !!finalRequestText,
    shouldAutoNameTask: hasTaskDirectives || hasSearch || hasFreeText,
    shouldAutoUpdateTopic: hasSearch || hasFreeText || !!parsed.title.trim(),
  };
}
