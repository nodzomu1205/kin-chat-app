import type { Memory } from "@/lib/memory";
import {
  isClosingReplyText,
  normalizeText,
  normalizeTopicCandidate,
} from "@/lib/app/memoryInterpreterText";

export function buildGoal(topic: string | undefined, fallback?: string) {
  if (topic) return `ユーザーは${topic}について知りたい`;
  return fallback;
}

export function buildFollowUpRule(topic: string | undefined, fallback?: string) {
  if (topic) return `短い追質問は、直前の${topic}トピックを引き継いで解釈する`;
  return fallback;
}

export function resolveTopicFromInputs(params: {
  inputText?: string;
  lastSearchQuery?: string;
  activeDocumentTitle?: string;
  currentTaskTitle?: string;
  topicSeed?: string;
  existingTopic?: string;
}) {
  const inputTopic = normalizeTopicCandidate(params.inputText || "");
  const searchTopic = normalizeTopicCandidate(params.lastSearchQuery || "");
  const documentTopic = normalizeTopicCandidate(params.activeDocumentTitle || "");
  const taskTopic = normalizeTopicCandidate(params.currentTaskTitle || "");
  const seededTopic = normalizeTopicCandidate(params.topicSeed || "");
  const existingTopic = normalizeText(params.existingTopic || "");

  return (
    seededTopic ||
    inputTopic ||
    searchTopic ||
    documentTopic ||
    taskTopic ||
    existingTopic ||
    undefined
  );
}

export function buildResolvedMemoryContext(params: {
  currentMemory: Memory;
  resolvedTopic?: string;
  inputText?: string;
  lastUserIntentOverride?: string;
}) {
  const normalizedInput = normalizeText(params.inputText || "");
  const resolvedLastIntent = params.lastUserIntentOverride
    ? params.lastUserIntentOverride
    : isClosingReplyText(normalizedInput)
      ? params.currentMemory.context.lastUserIntent
      : normalizedInput || params.currentMemory.context.lastUserIntent;

  return {
    currentTopic: params.resolvedTopic,
    currentTask: buildGoal(params.resolvedTopic, params.currentMemory.context.currentTask),
    followUpRule: buildFollowUpRule(
      params.resolvedTopic,
      params.currentMemory.context.followUpRule
    ),
    lastUserIntent: resolvedLastIntent,
  };
}
