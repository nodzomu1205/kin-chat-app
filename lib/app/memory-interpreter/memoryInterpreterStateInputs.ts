import type { Memory } from "@/lib/memory-domain/memory";
import { extractRecentSearchQueries } from "@/lib/app/memory-interpreter/memoryInterpreterFacts";
import { resolveTopicFromInputs } from "@/lib/app/memory-interpreter/memoryInterpreterTopicResolution";
import { resolveActiveDocumentFields } from "@/lib/app/memory-interpreter/memoryInterpreterWorks";
import {
  isClosingReplyText,
  isSearchDirectiveText,
  isSysFormattedText,
  normalizeText,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
import type { Message } from "@/types/chat";
import type { MemoryInterpreterOptions } from "@/lib/app/memory-interpreter/memoryInterpreter";

function isTopicSwitch(currentMemory: Memory, resolvedTopic: string | undefined) {
  const currentTopic = normalizeText(currentMemory.context.currentTopic || "");
  const nextTopic = normalizeText(resolvedTopic || "");
  if (!currentTopic || !nextTopic) return false;
  return currentTopic !== nextTopic;
}

export function buildMemoryStateAssemblyInputs(args: {
  currentMemory: Memory;
  recentMessages: Message[];
  options?: MemoryInterpreterOptions;
}) {
  const latestUserMessage =
    [...args.recentMessages].reverse().find(
      (message) => message.role === "user" && !isSysFormattedText(message.text || "")
    ) || null;
  const latestAssistantMessage =
    [...args.recentMessages].reverse().find(
      (message) => message.role === "gpt" && !isSysFormattedText(message.text || "")
    ) || null;
  const latestUserText = normalizeText(latestUserMessage?.text || "");
  const closingOnlyTurn = Boolean(latestUserText) && isClosingReplyText(latestUserText);
  const latestPrompt =
    latestUserText && !isSearchDirectiveText(latestUserText) && !closingOnlyTurn
      ? latestUserText
      : "";
  const filteredRecentMessages = args.recentMessages.filter(
    (message) => !isSysFormattedText(message.text || "")
  );
  const recentSearchQueries = extractRecentSearchQueries(filteredRecentMessages);
  const { activeDocument, activeDocumentTitle, activeDocumentExcerpt } =
    resolveActiveDocumentFields(args.currentMemory, args.options?.activeDocument);
  const resolvedTopic = resolveTopicFromInputs({
    inputText: latestPrompt,
    activeDocumentTitle,
    existingTopic: args.currentMemory.context.currentTopic,
    topicAdjudication: {
      disableInputTopicInference:
        args.options?.topicAdjudication?.disableInputTopicInference ?? true,
      committedTopic: args.options?.topicAdjudication?.committedTopic,
      preserveExistingTopic: args.options?.topicAdjudication?.preserveExistingTopic,
    },
  });
  const topicSwitched = isTopicSwitch(args.currentMemory, resolvedTopic);
  const latestAssistantText = latestAssistantMessage?.text || "";
  const factSourceMessages =
    topicSwitched && latestAssistantMessage
      ? [latestAssistantMessage]
      : filteredRecentMessages;

  return {
    latestUserText,
    latestPrompt,
    latestAssistantText,
    closingOnlyTurn,
    recentSearchQueries,
    activeDocument,
    activeDocumentTitle,
    activeDocumentExcerpt,
    resolvedTopic,
    topicSwitched,
    factSourceMessages,
  };
}
