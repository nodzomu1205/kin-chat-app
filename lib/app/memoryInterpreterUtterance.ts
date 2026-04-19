import {
  isClosingReplyText,
  isCorrectionOrDisputeText,
  isGenericContinuationQuestion,
  isGenericCorrectionReply,
  isGenericFollowUpRequest,
  isSearchDirectiveText,
  isShortAcknowledgementText,
  isTruthCheckQuestion,
  isWeakTopicCandidate,
  looksLikeLongNarrativeText,
  normalizeText,
  shouldPreserveExistingTopic,
} from "@/lib/app/memoryInterpreterText";
import { normalizeTopicCandidate } from "@/lib/app/memoryInterpreterTopicExtractor";

export type MemoryUtteranceClassification = {
  normalizedText: string;
  currentTopic: string;
  hasCurrentTopic: boolean;
  localTopicCandidate: string;
  possibleSubtopic: string;
  weakTopicCandidate: boolean;
  looksLikeQuestionOrRequest: boolean;
  isSearchDirective: boolean;
  isClosingReply: boolean;
  isShortAcknowledgement: boolean;
  isGenericFollowUpRequest: boolean;
  isGenericContinuationQuestion: boolean;
  isGenericCorrectionReply: boolean;
  isCorrectionOrDispute: boolean;
  isTruthCheckQuestion: boolean;
  preservesExistingTopic: boolean;
  looksLikeLongNarrative: boolean;
};

export function classifyMemoryUtterance(
  text: string,
  currentTopic?: string
): MemoryUtteranceClassification {
  const normalizedText = normalizeText(text);
  const normalizedCurrentTopic = normalizeText(currentTopic || "");
  const localTopicCandidate = normalizeTopicCandidate(normalizedText);
  const isSearch = isSearchDirectiveText(normalizedText);
  const isClosing = isClosingReplyText(normalizedText);
  const isAck = isShortAcknowledgementText(normalizedText);
  const isFollowUp = isGenericFollowUpRequest(normalizedText);
  const isContinuation = isGenericContinuationQuestion(normalizedText);
  const isGenericCorrection = isGenericCorrectionReply(normalizedText);
  const isDispute = isCorrectionOrDisputeText(normalizedText);
  const isTruthCheck = isTruthCheckQuestion(normalizedText);
  const preservesExistingTopic = shouldPreserveExistingTopic(normalizedText);
  const weakTopicCandidate = localTopicCandidate
    ? isWeakTopicCandidate(localTopicCandidate)
    : true;
  const looksLikeQuestionOrRequest =
    /[?？]|教えて|知りたい|詳しく|誰|何|どこ|なぜ|どう|本当|嘘/u.test(
      normalizedText
    );

  return {
    normalizedText,
    currentTopic: normalizedCurrentTopic,
    hasCurrentTopic: Boolean(normalizedCurrentTopic),
    localTopicCandidate,
    possibleSubtopic:
      normalizedCurrentTopic &&
      localTopicCandidate &&
      localTopicCandidate !== normalizedCurrentTopic &&
      !isTruthCheck
        ? localTopicCandidate
        : "",
    weakTopicCandidate,
    looksLikeQuestionOrRequest,
    isSearchDirective: isSearch,
    isClosingReply: isClosing,
    isShortAcknowledgement: isAck,
    isGenericFollowUpRequest: isFollowUp,
    isGenericContinuationQuestion: isContinuation,
    isGenericCorrectionReply: isGenericCorrection,
    isCorrectionOrDispute: isDispute,
    isTruthCheckQuestion: isTruthCheck,
    preservesExistingTopic,
    looksLikeLongNarrative: looksLikeLongNarrativeText(text),
  };
}
