import {
  type MemoryRuleKind,
  resolveMemoryRuleTopicDecision,
  type TopicDecision,
} from "@/lib/memoryInterpreterRules";
import { normalizeText } from "@/lib/app/memory-interpreter/memoryInterpreterText";

export type MemoryTopicAdjudication = {
  committedTopic?: string;
  proposedTopic?: string;
  trackedEntityOverride?: string;
  preserveExistingTopic?: boolean;
  disableInputTopicInference?: boolean;
};

export function buildCommittedTopicAdjudication(params: {
  topic?: string;
  trackedEntityOverride?: string;
}): MemoryTopicAdjudication {
  const committedTopic = normalizeText(params.topic || "");
  const trackedEntityOverride = normalizeText(
    params.trackedEntityOverride || committedTopic
  );

  return {
    disableInputTopicInference: true,
    committedTopic: committedTopic || undefined,
    trackedEntityOverride: trackedEntityOverride || undefined,
    proposedTopic: undefined,
    preserveExistingTopic: false,
  };
}

export function buildPreserveTopicAdjudication(
  proposedTopic?: string
): MemoryTopicAdjudication {
  const normalizedProposedTopic = normalizeText(proposedTopic || "");
  return {
    disableInputTopicInference: true,
    preserveExistingTopic: true,
    proposedTopic: normalizedProposedTopic || undefined,
  };
}

export function buildRuleTopicAdjudication(params: {
  kind: MemoryRuleKind;
  topicDecision?: TopicDecision;
  normalizedValue?: string;
  phrase?: string;
}): MemoryTopicAdjudication {
  const resolvedDecision = resolveMemoryRuleTopicDecision(params);
  const normalizedValue = normalizeText(
    params.normalizedValue || (resolvedDecision === "switch" || resolvedDecision === "unclear"
      ? params.phrase || ""
      : "")
  );

  if (resolvedDecision === "keep") {
    return normalizedValue
      ? buildCommittedTopicAdjudication({
          topic: normalizedValue,
          trackedEntityOverride: normalizedValue,
        })
      : buildPreserveTopicAdjudication();
  }

  if (resolvedDecision === "switch" && normalizedValue) {
    return buildCommittedTopicAdjudication({
      topic: normalizedValue,
      trackedEntityOverride: normalizedValue,
    });
  }

  if (resolvedDecision === "unclear" && normalizedValue) {
    return buildPreserveTopicAdjudication(normalizedValue);
  }

  return { disableInputTopicInference: true };
}

export function buildFallbackTopicAdjudication(params: {
  hasCurrentTopic: boolean;
  isTruthCheckQuestion: boolean;
  isClosingReply: boolean;
  parsedDecision?: "keep" | "switch" | "unsure";
  parsedConfidence?: number;
  currentTopic?: string;
  proposedTopic?: string;
  trackedEntityOverride?: string;
}): MemoryTopicAdjudication {
  const proposedTopic = normalizeText(params.proposedTopic || "");
  const currentTopic = normalizeText(params.currentTopic || "");
  const llmSuggestsDifferentTopic =
    Boolean(proposedTopic) &&
    Boolean(currentTopic) &&
    proposedTopic !== currentTopic;

  const canSeedInitialTopic =
    !params.hasCurrentTopic &&
    !params.isTruthCheckQuestion &&
    !params.isClosingReply &&
    Boolean(proposedTopic);
  const keepExisting =
    params.isTruthCheckQuestion ||
    params.isClosingReply ||
    params.parsedDecision === "keep" ||
    params.parsedDecision === "unsure";

  if (canSeedInitialTopic) {
    return buildCommittedTopicAdjudication({
      topic: proposedTopic,
      trackedEntityOverride: params.trackedEntityOverride || proposedTopic,
    });
  }

  if (keepExisting) {
    return buildPreserveTopicAdjudication(
      llmSuggestsDifferentTopic ? proposedTopic : undefined
    );
  }

  if (!params.isTruthCheckQuestion && proposedTopic) {
    return buildPreserveTopicAdjudication(proposedTopic);
  }

  return { disableInputTopicInference: true };
}
