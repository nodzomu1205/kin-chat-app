import { mergeMemory, type Memory, type MemorySettings } from "@/lib/memory";
import { stabilizeMemoryContextState } from "@/lib/app/memoryInterpreterContextReducer";
import {
  isClosingReplyText,
  isShortAcknowledgementText,
  normalizeText,
} from "@/lib/app/memoryInterpreterText";
import { trimMemoryState } from "@/lib/app/gptMemoryStateHelpers";
import type { Message } from "@/types/chat";

function getLatestMeaningfulUserText(recentMessages: Message[]) {
  const latestUser = [...recentMessages]
    .reverse()
    .find((message) => message.role === "user");
  const text = normalizeText(latestUser?.text || "");
  if (!text || isClosingReplyText(text) || isShortAcknowledgementText(text)) return "";
  return text;
}

function stripIntentLead(text: string) {
  return normalizeText(text)
    .replace(/^(?:次は|では|じゃあ一旦見出しがあるなら次は|最後は)\s*/u, "")
    .trim();
}

function deriveFocusedEntity(memory: Memory): string {
  const intent = stripIntentLead(memory.context.lastUserIntent || "");
  const topic = normalizeText(memory.context.currentTopic || "");
  const candidates = new Set<string>();

  const intentCandidate = intent
    .replace(/(?:について.*|とは.*|は\??|です\??|[。.!！?？\s]+)$/u, "")
    .trim();
  if (intentCandidate) candidates.add(intentCandidate);

  const trackedEntities = Array.isArray(memory.lists?.trackedEntities)
    ? (memory.lists.trackedEntities as string[])
    : [];
  const worksByEntity =
    memory.lists?.worksByEntity &&
    typeof memory.lists.worksByEntity === "object" &&
    !Array.isArray(memory.lists.worksByEntity)
      ? (memory.lists.worksByEntity as Record<string, unknown>)
      : {};

  for (const candidate of candidates) {
    if (candidate && candidate !== topic) return candidate;
  }

  for (const tracked of trackedEntities) {
    if (
      typeof tracked === "string" &&
      tracked &&
      tracked !== topic &&
      Object.prototype.hasOwnProperty.call(worksByEntity, tracked)
    ) {
      return tracked;
    }
  }

  return "";
}

function retainFactsForFocusedEntity(memory: Memory, settings: MemorySettings): Memory {
  const focusedEntity = deriveFocusedEntity(memory);
  if (!focusedEntity) return memory;

  const worksByEntity =
    memory.lists?.worksByEntity &&
    typeof memory.lists.worksByEntity === "object" &&
    !Array.isArray(memory.lists.worksByEntity)
      ? (memory.lists.worksByEntity as Record<string, unknown>)
      : {};
  const focusedWorks = Array.isArray(worksByEntity[focusedEntity])
    ? (worksByEntity[focusedEntity] as unknown[])
        .filter((item): item is string => typeof item === "string")
        .map((item) => normalizeText(item))
        .filter(Boolean)
    : [];
  const siblingKeys = Object.keys(worksByEntity)
    .map((key) => normalizeText(key))
    .filter((key) => key && key !== focusedEntity);
  const siblingWorks = siblingKeys.flatMap((key) =>
    Array.isArray(worksByEntity[key])
      ? (worksByEntity[key] as unknown[])
          .filter((item): item is string => typeof item === "string")
          .map((item) => normalizeText(item))
          .filter(Boolean)
      : []
  );
  const topic = normalizeText(memory.context.currentTopic || "");

  const filteredFacts = memory.facts.filter((fact) => {
    const normalizedFact = normalizeText(fact);
    if (!normalizedFact) return false;
    if (
      normalizedFact.includes(focusedEntity) ||
      focusedWorks.some((work) => work && normalizedFact.includes(work))
    ) {
      return true;
    }
    if (
      siblingKeys.some((key) => key && normalizedFact.includes(key)) ||
      siblingWorks.some((work) => work && normalizedFact.includes(work))
    ) {
      return false;
    }
    return topic ? normalizedFact.includes(topic) : true;
  });

  return {
    ...memory,
    facts: Array.from(new Set(filteredFacts)).slice(-settings.maxFacts),
  };
}

export function mergeSummarizedMemoryState(params: {
  candidateMemory: Memory;
  summarizedCandidate: Memory;
  settings: MemorySettings;
  recentMessages?: Message[];
}) {
  const { candidateMemory, summarizedCandidate, settings, recentMessages = [] } = params;
  const merged = trimMemoryState(
    mergeMemory(candidateMemory, summarizedCandidate),
    settings
  );
  const latestMeaningfulUserText = getLatestMeaningfulUserText(recentMessages);

  const stabilized: Memory = {
    ...merged,
    context: stabilizeMemoryContextState({
      candidateContext: candidateMemory.context,
      mergedContext: merged.context,
      latestMeaningfulUserText,
    }),
  };

  return retainFactsForFocusedEntity(stabilized, settings);
}
