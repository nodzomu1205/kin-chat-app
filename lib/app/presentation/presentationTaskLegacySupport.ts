import type { PresentationTaskSlidePlan } from "@/types/task";
import type { BulletItem } from "@/lib/app/presentation/presentationTypes";
import { slideDisplayVisual } from "@/lib/app/presentation/slidePartsParser";

export function bulletsFromSlide(slide: PresentationTaskSlidePlan): BulletItem[] {
  const items = slide.supportingInfo.filter(Boolean);
  return items.length > 0
    ? items.map((text) => ({ text }))
    : [{ text: slide.keyMessage || "\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044" }];
}

export function bulletItems(values: string[]) {
  return values.filter(Boolean).map((text) => ({ text }));
}

export function shouldUseVisualLayout(slide: PresentationTaskSlidePlan) {
  if (slideDisplayVisual(slide) || slide.visualSupportingInfo.length > 0) return true;
  return false;
}

function normalizedChars(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, "")
        .split("")
    )
  );
}

function relevanceScore(fact: string, query: string) {
  const queryChars = normalizedChars(query);
  if (queryChars.length === 0) return 0;
  const factText = fact.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return queryChars.reduce(
    (score, char) => score + (factText.includes(char) ? 1 : 0),
    0
  );
}

function relatedExtractedItemsForSlide(
  slide: PresentationTaskSlidePlan,
  extractedItems: string[]
) {
  const query = [slide.title, slide.keyMessage, slide.keyVisual].join(" ");
  return extractedItems
    .map((item) => ({
      item,
      score: relevanceScore(item, query),
    }))
    .filter(({ score }) => score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ item }) => item);
}

export function supportingInfoForSlide(
  slide: PresentationTaskSlidePlan,
  extractedItems: string[]
) {
  return slide.supportingInfo.length > 0
    ? slide.supportingInfo
    : relatedExtractedItemsForSlide(slide, extractedItems);
}
