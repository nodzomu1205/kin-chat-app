import type {
  ApprovedMemoryRule,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import {
  getMemoryRulePhraseSignature,
  getMemoryRuleReviewSignature,
  getMemoryRuleSignature,
  getMemoryRuleSourceSignature,
} from "@/lib/memoryInterpreterRules";

export function trimPendingMemoryRuleCandidates(
  items: PendingMemoryRuleCandidate[]
) {
  const recentSources = Array.from(
    new Set(items.map((item) => getMemoryRuleSourceSignature(item)).reverse())
  ).slice(0, 2);
  const keepSources = new Set(recentSources);

  return items
    .filter((item) => keepSources.has(getMemoryRuleSourceSignature(item)))
    .slice(-20);
}

export function mergePendingMemoryRuleCandidates(params: {
  prev: PendingMemoryRuleCandidate[];
  candidates: PendingMemoryRuleCandidate[];
  approvedMemoryRules: ApprovedMemoryRule[];
}) {
  const seen = new Set(params.prev.map((item) => getMemoryRuleSignature(item)));
  const seenPhrases = new Set(
    params.prev.map((item) => getMemoryRulePhraseSignature(item))
  );
  const seenSources = new Set(
    params.prev.map((item) => getMemoryRuleSourceSignature(item))
  );
  const seenReviews = new Set(
    params.prev.map((item) => getMemoryRuleReviewSignature(item))
  );

  const approvedSignatures = new Set(
    params.approvedMemoryRules.map((item) => getMemoryRuleSignature(item))
  );
  const approvedPhrases = new Set(
    params.approvedMemoryRules.map((item) => getMemoryRulePhraseSignature(item))
  );
  const approvedSources = new Set(
    params.approvedMemoryRules.map((item) => getMemoryRuleSourceSignature(item))
  );
  const approvedReviews = new Set(
    params.approvedMemoryRules.map((item) => getMemoryRuleReviewSignature(item))
  );

  const next = [...params.prev];

  params.candidates.forEach((candidate) => {
    const signature = getMemoryRuleSignature(candidate);
    const phraseSignature = getMemoryRulePhraseSignature(candidate);
    const sourceSignature = getMemoryRuleSourceSignature(candidate);
    const reviewSignature = getMemoryRuleReviewSignature(candidate);

    if (
      !seen.has(signature) &&
      !seenPhrases.has(phraseSignature) &&
      !seenSources.has(sourceSignature) &&
      !seenReviews.has(reviewSignature) &&
      !approvedSignatures.has(signature) &&
      !approvedPhrases.has(phraseSignature) &&
      !approvedSources.has(sourceSignature) &&
      !approvedReviews.has(reviewSignature)
    ) {
      seen.add(signature);
      seenPhrases.add(phraseSignature);
      seenSources.add(sourceSignature);
      seenReviews.add(reviewSignature);
      next.push(candidate);
    }
  });

  return trimPendingMemoryRuleCandidates(next);
}
