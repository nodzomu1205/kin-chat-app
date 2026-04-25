import {
  isSysFormattedText,
  normalizeText,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
import type { Message } from "@/types/chat";

function isMeaningfulAssistantMessage(message: Message) {
  if (message.role !== "gpt") return false;
  if (isSysFormattedText(message.text || "")) return false;
  return (
    message.meta?.kind === "normal" ||
    message.meta?.kind === "task_info" ||
    message.meta?.kind === "task_prep" ||
    message.meta?.kind === "task_deepen" ||
    message.meta?.kind === "task_format"
  );
}

function isMeaningfulConversationMessage(message: Message) {
  return (
    (message.role === "user" && !isSysFormattedText(message.text || "")) ||
    isMeaningfulAssistantMessage(message)
  );
}

export function buildMeaningfulConversationContext(recentMessages: Message[]) {
  const latestUserIndex = (() => {
    for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
      const message = recentMessages[index];
      if (!message || message.role !== "user") continue;
      if (message.meta?.kind === "task_info") continue;
      return index;
    }
    return -1;
  })();

  let priorMeaningfulText = "";
  let earlierMeaningfulText = "";
  let priorMeaningfulIndex = -1;

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    if (index === latestUserIndex) continue;
    const message = recentMessages[index];
    if (!message || !isMeaningfulAssistantMessage(message)) continue;

    const normalized = normalizeText(message.text || "");
    if (!normalized) continue;

    priorMeaningfulText = normalized;
    priorMeaningfulIndex = index;
    break;
  }

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    if (index === latestUserIndex || index === priorMeaningfulIndex) continue;
    const message = recentMessages[index];
    if (!message || !isMeaningfulConversationMessage(message)) continue;

    const normalized = normalizeText(message.text || "");
    if (!normalized) continue;

    earlierMeaningfulText = normalized;
    break;
  }

  return {
    priorMeaningfulText,
    earlierMeaningfulText,
  };
}
