import type { Memory } from "@/lib/memory";
import { extractRecentSearchQueries } from "@/lib/app/memoryInterpreterFacts";
import { resolveTopicFromInputs } from "@/lib/app/memoryInterpreterTopicResolution";
import { resolveActiveDocumentFields } from "@/lib/app/memoryInterpreterWorks";
import {
  isClosingReplyText,
  isSearchDirectiveText,
  normalizeText,
} from "@/lib/app/memoryInterpreterText";
import type { Message } from "@/types/chat";
import type { MemoryInterpreterOptions } from "@/lib/app/memoryInterpreter";

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
    [...args.recentMessages].reverse().find((message) => message.role === "user") || null;
  const latestAssistantMessage =
    [...args.recentMessages].reverse().find((message) => message.role === "gpt") || null;
  const latestUserText = normalizeText(latestUserMessage?.text || "");
  const closingOnlyTurn = Boolean(latestUserText) && isClosingReplyText(latestUserText);
  const latestPrompt =
    latestUserText && !isSearchDirectiveText(latestUserText) && !closingOnlyTurn
      ? latestUserText
      : "";
  const recentSearchQueries = extractRecentSearchQueries(args.recentMessages);
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
    topicSwitched && latestAssistantMessage ? [latestAssistantMessage] : args.recentMessages;

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
