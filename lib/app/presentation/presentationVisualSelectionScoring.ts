import type {
  PresentationTaskVisualMatch,
  PresentationTaskVisualSlot,
} from "@/types/task";
import type { PresentationImageLibraryCandidate } from "@/lib/app/presentation/presentationImageLibrary";
import { presentationVisualSlotMatchKey } from "@/lib/app/presentation/presentationVisualSlotKeys";
import {
  candidateLabel,
  normalizeText,
  tokenize,
} from "@/lib/app/presentation/presentationVisualText";
import {
  normalizedTextContainsAlias,
  requiredNamedPhraseGroupsForSlot,
} from "@/lib/app/presentation/presentationVisualEntityEvidence";

export { presentationVisualSlotMatchKey } from "@/lib/app/presentation/presentationVisualSlotKeys";
export {
  candidateLabel,
  tokenize,
} from "@/lib/app/presentation/presentationVisualText";

export type CandidateScore = {
  candidate: PresentationImageLibraryCandidate;
  score: number;
};

export type PresentationVisualSlotNormalizedTextMap = Record<string, string>;

export const MIN_SLOT_MATCH_SCORE = 5;

export function findBestCandidateForSlot(
  slot: PresentationTaskVisualSlot,
  candidates: PresentationImageLibraryCandidate[],
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined,
  excludedImageIds: Set<string> | undefined = new Set(),
  minScore = MIN_SLOT_MATCH_SCORE
): CandidateScore | null {
  const scored = candidates
    .filter((candidate) => !excludedImageIds?.has(candidate.imageId))
    .map((candidate) => ({
      candidate,
      score: scoreSlotCandidate(slot, candidate, normalizedSlotTexts),
    }))
    .filter(
      (item) =>
        item.score >= minScore &&
        hasSpecificSlotEvidence(slot, item.candidate, normalizedSlotTexts) &&
        hasRequiredEntityEvidence(slot, item.candidate, normalizedSlotTexts)
    )
    .sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

export function buildSelectionMatch(
  slot: PresentationTaskVisualSlot,
  match: CandidateScore | null,
  status: PresentationTaskVisualMatch["status"]
): PresentationTaskVisualMatch {
  const selected = status === "selected";
  return {
    slotId: slot.slotId,
    label: slot.label,
    need: slot.need,
    status,
    imageId: selected ? match?.candidate.imageId : undefined,
    imageTitle: selected && match ? candidateLabel(match.candidate) : undefined,
    score: match?.score || 0,
    threshold: MIN_SLOT_MATCH_SCORE,
  };
}

function scoreSlotCandidate(
  slot: PresentationTaskVisualSlot,
  candidate: PresentationImageLibraryCandidate,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const slotTerms = termsForSlot(slot, normalizedSlotTexts);
  if (slotTerms.length === 0) return 0;
  const candidateTerms = new Set(tokenize(candidateText(candidate, "primary")));
  const secondaryText = normalizeText(candidateText(candidate, "secondary"));
  let score = 0;
  for (const term of slotTerms) {
    if (candidateTerms.has(term)) {
      score += termScore(term, "primary");
    } else if (term.length >= 4 && secondaryText.includes(term)) {
      score += termScore(term, "secondary");
    }
  }
  return score;
}

function hasSpecificSlotEvidence(
  slot: PresentationTaskVisualSlot,
  candidate: PresentationImageLibraryCandidate,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const specificTerms = termsForSlot(slot, normalizedSlotTexts).filter(
    (term) => !BROAD_MATCH_TERMS.has(term)
  );
  if (specificTerms.length === 0) return false;
  const primaryTerms = new Set(tokenize(candidateText(candidate, "primary")));
  const secondaryText = normalizeText(candidateText(candidate, "secondary"));
  return specificTerms.some(
    (term) =>
      primaryTerms.has(term) || (term.length >= 4 && secondaryText.includes(term))
  );
}

function hasRequiredEntityEvidence(
  slot: PresentationTaskVisualSlot,
  candidate: PresentationImageLibraryCandidate,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const requiredEntities = requiredNamedPhraseGroupsForSlot(slot, normalizedSlotTexts);
  if (requiredEntities.length === 0) return true;
  const text = normalizeText(candidateText(candidate, "primary") + " " + candidateText(candidate, "secondary"));
  return requiredEntities.every((aliases) =>
    aliases.some((alias) => normalizedTextContainsAlias(text, alias))
  );
}

function termsForSlot(
  slot: PresentationTaskVisualSlot,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const normalizedText =
    normalizedSlotTexts?.[presentationVisualSlotMatchKey(slot)]?.trim() || "";
  return normalizedText ? tokenize(normalizedText) : [];
}

function candidateText(
  candidate: PresentationImageLibraryCandidate,
  tier: "primary" | "secondary"
) {
  const meta = candidate.presentationMeta;
  if (tier === "primary") {
    return [
      ...(meta?.namedEntities
        ? [
            ...meta.namedEntities.places,
            ...meta.namedEntities.stations,
            ...meta.namedEntities.people,
            ...meta.namedEntities.organizations,
            ...meta.namedEntities.landmarks,
          ]
        : []),
      ...(meta?.visibleSubjects || []),
      ...(meta?.semanticTags || []),
      ...(meta?.embeddedTextItems.map((item) => item.text) || []),
      ...(meta?.relationships.flatMap((item) => item.items) || []),
    ]
      .filter(Boolean)
      .join(" ");
  }
  return [
    ...(meta?.relationships.map((item) => item.evidence) || []),
    meta?.composition,
  ]
    .filter(Boolean)
    .join(" ");
}

function termScore(term: string, tier: "primary" | "secondary") {
  const base = term.length >= 5 ? 3 : term.length >= 3 ? 2 : 1;
  return tier === "primary" ? base : Math.max(1, base - 1);
}

const BROAD_MATCH_TERMS = new Set([
  "cotton",
  "organic",
  "sustainable",
  "sustainability",
  "product",
  "products",
  "environment",
  "environmental",
  "issue",
  "issues",
  "challenge",
  "challenges",
  "risk",
  "risks",
  "supply",
  "chain",
]);
