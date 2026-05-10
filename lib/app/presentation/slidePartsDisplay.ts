import type {
  PresentationTaskSlideLayoutItem,
  PresentationTaskSlidePlan,
} from "@/types/task";
import type { BulletItem } from "@/lib/app/presentation/presentationTypes";

export const SLIDE_PART_ROLES = {
  title: ["タイトル", "title"],
  message: [
    "狙い",
    "副題",
    "サブタイトル",
    "主メッセージ",
    "メッセージ",
    "伝えること",
    "目的",
  ],
  visual: [
    "キービジュアル",
    "ビジュアル",
    "図表",
    "図",
    "地図",
    "工程図",
    "イメージ",
    "画像",
    "写真",
    "アイコン",
  ],
} as const;

function cleanDisplayText(value: string) {
  return value
    .replace(/^\[+|\]+$/g, "")
    .replace(/^[「『']+|[」』']+$/g, "")
    .trim();
}

function normalizeRoleLabel(value: string) {
  return cleanDisplayText(value)
    .replace(/\s+/g, "")
    .toLowerCase();
}

function findLayoutItemText(
  slide: PresentationTaskSlidePlan,
  labels: string[]
) {
  const normalizedLabels = labels.map((label) => normalizeRoleLabel(label));
  return (
    slide.structuredContent.layout.elements.find((item) =>
      normalizedLabels.some((label) =>
        normalizeRoleLabel(item.region).includes(label)
      )
    )?.text || ""
  );
}

function isLayoutItemRole(
  item: PresentationTaskSlideLayoutItem,
  labels: string[]
) {
  const region = normalizeRoleLabel(item.region);
  return labels.some((label) => region.includes(normalizeRoleLabel(label)));
}

export function displayLayoutItems(slide: PresentationTaskSlidePlan) {
  return slide.structuredContent.layout.elements.filter(
    (item) =>
      item.text &&
      !isLayoutItemRole(item, [
        ...SLIDE_PART_ROLES.title,
        ...SLIDE_PART_ROLES.message,
        ...SLIDE_PART_ROLES.visual,
      ])
  );
}

export function layoutItemBullets(slide: PresentationTaskSlidePlan): BulletItem[] {
  return displayLayoutItems(slide).map((item) => ({
    text: item.region ? `${item.region}: ${item.text}` : item.text,
  }));
}

export function slideDisplayTitle(
  slide: PresentationTaskSlidePlan,
  fallback: string
) {
  return findLayoutItemText(slide, [...SLIDE_PART_ROLES.title]) || slide.title || fallback;
}

export function slideDisplayMessage(slide: PresentationTaskSlidePlan) {
  return (
    findLayoutItemText(slide, [...SLIDE_PART_ROLES.message]) ||
    slide.keyMessage
  );
}

export function slideDisplayVisual(slide: PresentationTaskSlidePlan) {
  return (
    findLayoutItemText(slide, [...SLIDE_PART_ROLES.visual]) ||
    slide.keyVisual
  );
}
