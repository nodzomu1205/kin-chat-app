import {
  normalizeText,
  shouldPreserveExistingTopic,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
import { normalizeTopicCandidate } from "@/lib/app/memory-interpreter/memoryInterpreterTopicExtractor";
import type { MemoryTopicAdjudication } from "@/lib/app/memoryTopicAdjudication";

export function resolveTopicFromInputs(params: {
  inputText?: string;
  lastSearchQuery?: string;
  activeDocumentTitle?: string;
  existingTopic?: string;
  topicAdjudication?: MemoryTopicAdjudication;
}) {
  const normalizedInputText = normalizeText(params.inputText || "");
  const existingTopic = normalizeText(params.existingTopic || "");
  const topicAdjudication = params.topicAdjudication;
  const committedTopic = normalizeTopicCandidate(
    topicAdjudication?.committedTopic || ""
  );

  if (committedTopic) {
    return committedTopic;
  }

  if (topicAdjudication?.preserveExistingTopic && existingTopic) {
    return existingTopic;
  }
  if (normalizedInputText && existingTopic && shouldPreserveExistingTopic(normalizedInputText)) {
    return existingTopic;
  }

  const inputTopic = topicAdjudication?.disableInputTopicInference
    ? ""
    : normalizeTopicCandidate(params.inputText || "");
  const searchTopic = normalizeTopicCandidate(params.lastSearchQuery || "");
  const documentTopic = normalizeTopicCandidate(params.activeDocumentTitle || "");

  return (
    committedTopic ||
    inputTopic ||
    searchTopic ||
    documentTopic ||
    existingTopic ||
    undefined
  );
}
