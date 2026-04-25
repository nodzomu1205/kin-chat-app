import { mergeMemory, type Memory, type MemorySettings } from "@/lib/memory";
import { interpretMemoryState } from "@/lib/app/memory-interpreter/memoryInterpreter";
import {
  isClosingReplyText,
  isShortAcknowledgementText,
  normalizeText,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
import { trimMemoryState } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { Message } from "@/types/chat";

function getLatestMeaningfulUserText(recentMessages: Message[]) {
  const latestUser = [...recentMessages]
    .reverse()
    .find((message) => message.role === "user");
  const text = normalizeText(latestUser?.text || "");
  if (!text || isClosingReplyText(text) || isShortAcknowledgementText(text)) return "";
  return text;
}

export function collectSupplementalMemoryState(
  recentMessages: Message[],
  currentMemory: Memory,
  options?: MemoryUpdateOptions
): Partial<Memory> {
  return interpretMemoryState({
    currentMemory,
    recentMessages,
    options,
  });
}

export function getMemoryPressureState(memory: Memory, recentMessages: Message[]) {
  return recentMessages.length + memory.facts.length + memory.preferences.length;
}

export function buildCandidateMemoryState(params: {
  currentMemory: Memory;
  updatedRecent: Message[];
  settings: MemorySettings;
  options?: MemoryUpdateOptions;
}) {
  const { currentMemory, updatedRecent, settings, options } = params;
  const trimmedRecent = updatedRecent.slice(-settings.chatRecentLimit);
  const supplementalMemory = collectSupplementalMemoryState(
    trimmedRecent,
    currentMemory,
    options
  );
  const previousTopic = normalizeText(
    options?.previousCommittedTopic || currentMemory.context.currentTopic || ""
  );
  const nextTopic = normalizeText(
    typeof supplementalMemory.context?.currentTopic === "string"
      ? supplementalMemory.context.currentTopic
      : currentMemory.context.currentTopic || ""
  );
  const topicSwitched = Boolean(previousTopic && nextTopic && previousTopic !== nextTopic);
  const mergeBaseMemory = topicSwitched
    ? {
        ...currentMemory,
        facts: [],
        lists: {
          activeDocument: currentMemory.lists?.activeDocument,
          recentSearchQueries: currentMemory.lists?.recentSearchQueries,
        },
      }
    : currentMemory;

  const candidateMemory = trimMemoryState(
    mergeMemory(mergeBaseMemory, supplementalMemory),
    settings
  );
  const latestMeaningfulUserText = getLatestMeaningfulUserText(trimmedRecent);

  if (latestMeaningfulUserText) {
    candidateMemory.context.lastUserIntent = latestMeaningfulUserText;
  }

  if (
    !topicSwitched &&
    candidateMemory.facts.length === 0 &&
    currentMemory.facts.length > 0
  ) {
    candidateMemory.facts = [...currentMemory.facts].slice(-settings.maxFacts);
  }

  return {
    trimmedRecent,
    supplementalMemory,
    previousTopic,
    nextTopic,
    topicSwitched,
    candidateMemory,
  };
}
