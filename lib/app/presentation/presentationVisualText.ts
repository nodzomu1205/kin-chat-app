import type { PresentationImageLibraryCandidate } from "@/lib/app/presentation/presentationImageLibrary";

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

export function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFKC");
}

function bigrams(value: string) {
  const chars = Array.from(value);
  if (chars.length <= 2) return [value];
  return chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`);
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
