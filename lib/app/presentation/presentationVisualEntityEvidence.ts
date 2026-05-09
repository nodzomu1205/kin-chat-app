import type { PresentationTaskVisualSlot } from "@/types/task";
import { presentationVisualSlotMatchKey } from "@/lib/app/presentation/presentationVisualSlotKeys";
import { normalizeText } from "@/lib/app/presentation/presentationVisualText";

export function requiredNamedPhraseGroupsForSlot(
  slot: PresentationTaskVisualSlot,
  normalizedSlotTexts: Record<string, string> | undefined
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

export function normalizedTextContainsAlias(normalizedText: string, alias: string) {
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
