import type {
  PresentationTaskVisualMatch,
  PresentationTaskVisualSlot,
} from "@/types/task";
import type { PresentationImageLibraryCandidate } from "@/lib/app/presentation/presentationImageLibrary";
import { presentationVisualSlotMatchKey } from "@/lib/app/presentation/presentationVisualSlotKeys";

export { presentationVisualSlotMatchKey } from "@/lib/app/presentation/presentationVisualSlotKeys";

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

export function candidateLabel(candidate: PresentationImageLibraryCandidate) {
  return (
    candidate.presentationMeta?.visibleSubjects.find(Boolean) ||
    candidate.presentationMeta?.embeddedTextItems.find((item) => item.text.trim())?.text ||
    candidate.title ||
    candidate.imageId
  );
}

export function tokenize(value: string) {
  const normalized = normalizeText(value);
  const words = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 2 && !STOP_TERMS.has(term));
  const cjkBigrams = Array.from(normalized.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{2,}/gu))
    .flatMap((match) => bigrams(match[0]))
    .filter((term) => !STOP_TERMS.has(term));
  return Array.from(new Set([...words, ...cjkBigrams]));
}

function bigrams(value: string) {
  const chars = Array.from(value);
  if (chars.length <= 2) return [value];
  return chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`);
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFKC");
}

function termScore(term: string, tier: "primary" | "secondary") {
  const base = term.length >= 5 ? 3 : term.length >= 3 ? 2 : 1;
  return tier === "primary" ? base : Math.max(1, base - 1);
}

const STOP_TERMS = new Set([
  "and",
  "for",
  "the",
  "with",
  "image",
  "photo",
  "picture",
  "visual",
]);

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

function requiredNamedPhraseGroupsForSlot(
  slot: PresentationTaskVisualSlot,
  normalizedSlotTexts: PresentationVisualSlotNormalizedTextMap | undefined
) {
  const rawText = normalizedSlotTexts?.[presentationVisualSlotMatchKey(slot)] || "";
  const quoted = Array.from(rawText.matchAll(/["'`]([^"'`]{2,40})["'`]/g))
    .map((match) => match[1]?.trim())
    .filter((value): value is string => !!value && !isGenericNamedPhrase(value));
  const acronyms = Array.from(rawText.matchAll(/\b[A-Z][A-Z0-9&.-]{1,12}\b/g))
    .map((match) => match[0]?.trim())
    .filter(
      (value): value is string =>
        !!value && !isGenericNamedPhrase(value)
    );
  return Array.from(new Set([...quoted, ...acronyms])).map((value) => [value]);
}

function normalizedTextContainsAlias(normalizedText: string, alias: string) {
  const normalizedAlias = normalizeText(alias);
  if (/^[a-z0-9.]+$/i.test(normalizedAlias) && normalizedAlias.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedAlias)}([^a-z0-9]|$)`, "i")
      .test(normalizedText);
  }
  return normalizedText.includes(normalizedAlias);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGenericNamedPhrase(value: string) {
  return GENERIC_NAMED_PHRASES.has(normalizeText(value));
}

const GENERIC_NAMED_PHRASES = new Set([
  "ppt",
  "pptx",
  "pdf",
  "json",
  "id",
  "image",
  "photo",
  "visual",
]);
