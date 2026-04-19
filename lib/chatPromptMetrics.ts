export type ChatPromptMetrics = {
  messageCount: number;
  systemMessageCount: number;
  recentMessageCount: number;
  totalChars: number;
  systemChars: number;
  baseSystemChars: number;
  memoryChars: number;
  storedLibraryChars: number;
  storedSearchChars: number;
  storedDocumentChars: number;
  searchPromptChars: number;
  recentChars: number;
  recentUserChars: number;
  recentAssistantChars: number;
  rawInputChars: number;
  wrappedInputChars: number;
};

export function normalizeChatPromptMetrics(
  value: ChatPromptMetrics | null | undefined
): ChatPromptMetrics | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const metrics = value as Record<string, unknown>;
  const read = (key: keyof ChatPromptMetrics) =>
    typeof metrics[key] === "number" && Number.isFinite(metrics[key])
      ? (metrics[key] as number)
      : 0;

  return {
    messageCount: read("messageCount"),
    systemMessageCount: read("systemMessageCount"),
    recentMessageCount: read("recentMessageCount"),
    totalChars: read("totalChars"),
    systemChars: read("systemChars"),
    baseSystemChars: read("baseSystemChars"),
    memoryChars: read("memoryChars"),
    storedLibraryChars: read("storedLibraryChars"),
    storedSearchChars: read("storedSearchChars"),
    storedDocumentChars: read("storedDocumentChars"),
    searchPromptChars: read("searchPromptChars"),
    recentChars: read("recentChars"),
    recentUserChars: read("recentUserChars"),
    recentAssistantChars: read("recentAssistantChars"),
    rawInputChars: read("rawInputChars"),
    wrappedInputChars: read("wrappedInputChars"),
  };
}
