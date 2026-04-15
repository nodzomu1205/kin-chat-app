import type { PendingMemoryRuleCandidate, TopicDecision, UserUtteranceIntent } from "@/lib/memoryInterpreterRules";
import type { MemoryInterpreterFallbackResponse } from "@/lib/app/memoryInterpreterFallbackHelpers";
import { buildPatternMetadata } from "@/lib/app/memoryInterpreterPatternMemory";
import type { MemoryUtteranceClassification } from "@/lib/app/memoryInterpreterUtterance";
import { normalizeText, normalizeTopicCandidate } from "@/lib/app/memoryInterpreterText";
import {
  buildFallbackTopicAdjudication,
  type MemoryTopicAdjudication,
} from "@/lib/app/memoryTopicAdjudication";

export type ReducedTopicAdjudication = {
  adjudication: MemoryTopicAdjudication;
  pendingCandidates: PendingMemoryRuleCandidate[];
};

export function reduceTopicAdjudication(args: {
  latestUserText: string;
  utterance: MemoryUtteranceClassification;
  parsed: MemoryInterpreterFallbackResponse;
  saveRuleCandidates: boolean;
}): ReducedTopicAdjudication {
  const parsedDecision =
    args.parsed.decision === "keep" ||
    args.parsed.decision === "switch" ||
    args.parsed.decision === "unsure"
      ? args.parsed.decision
      : undefined;
  const parsedConfidence =
    typeof args.parsed.confidence === "number" && Number.isFinite(args.parsed.confidence)
      ? Math.max(0, Math.min(1, args.parsed.confidence))
      : undefined;
  const parsedIntent: UserUtteranceIntent =
    args.parsed.intent === "agreement" ||
    args.parsed.intent === "disagreement" ||
    args.parsed.intent === "question" ||
    args.parsed.intent === "request" ||
    args.parsed.intent === "statement" ||
    args.parsed.intent === "suggestion" ||
    args.parsed.intent === "acknowledgement"
      ? args.parsed.intent
      : "unknown";
  const topicDecision: TopicDecision =
    parsedDecision === "keep"
      ? "keep"
      : parsedDecision === "switch"
        ? "switch"
        : "unclear";
  const proposedTopic =
    args.parsed.isClosingReply
      ? ""
      : typeof args.parsed.proposedTopic === "string"
        ? normalizeTopicCandidate(args.parsed.proposedTopic)
        : args.parsed.topic && typeof args.parsed.topic === "string"
          ? normalizeTopicCandidate(args.parsed.topic)
          : "";
  const currentTopic = normalizeTopicCandidate(args.utterance.currentTopic || "");
  const llmSuggestsDifferentTopic =
    Boolean(proposedTopic) &&
    Boolean(currentTopic) &&
    proposedTopic !== currentTopic;
  const adjudication: MemoryTopicAdjudication = buildFallbackTopicAdjudication({
    hasCurrentTopic: args.utterance.hasCurrentTopic,
    isTruthCheckQuestion: args.utterance.isTruthCheckQuestion,
    isClosingReply: Boolean(args.parsed.isClosingReply),
    parsedDecision,
    parsedConfidence,
    currentTopic,
    proposedTopic,
    trackedEntityOverride:
      typeof args.parsed.trackedEntity === "string"
        ? normalizeText(args.parsed.trackedEntity)
        : proposedTopic,
  });

  const pendingCandidates =
    args.saveRuleCandidates
      ? [
          ...(
            (parsedDecision === "unsure" ||
              (parsedDecision === "switch" &&
                (args.utterance.hasCurrentTopic || (parsedConfidence ?? 0) < 0.85)) ||
              llmSuggestsDifferentTopic ||
              (parsedDecision === "keep" && Boolean(args.utterance.possibleSubtopic)) ||
              parsedIntent === "disagreement" ||
              args.utterance.isTruthCheckQuestion) &&
            (proposedTopic || args.utterance.possibleSubtopic || topicDecision === "keep")
              ? [
                  (() => {
                    const patternMetadata = buildPatternMetadata({
                      text: args.latestUserText,
                      evidenceText: args.parsed.evidenceText,
                      leftContext: args.parsed.leftContext,
                      rightContext: args.parsed.rightContext,
                      surfacePattern: args.parsed.surfacePattern,
                    });
                    return {
                      id: `memcand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      phrase: args.latestUserText,
                      kind: "utterance_review" as const,
                      normalizedValue:
                        proposedTopic || args.utterance.possibleSubtopic || undefined,
                      intent: parsedIntent,
                      topicDecision:
                        llmSuggestsDifferentTopic
                          ? "unclear"
                          : parsedDecision === "keep" && args.utterance.possibleSubtopic
                          ? "unclear"
                          : topicDecision,
                      confidence: parsedConfidence,
                      ...patternMetadata,
                      createdAt: new Date().toISOString(),
                      sourceText: args.latestUserText,
                    } satisfies PendingMemoryRuleCandidate;
                  })(),
                ]
              : []
          ),
        ]
      : [];

  return { adjudication, pendingCandidates };
}
