import type { PresentationTaskPlan, PresentationTaskSlidePlan } from "@/types/task";
import type { PresentationSpec } from "@/lib/app/presentation/presentationTypes";
import {
  layoutItemBullets,
  slideDisplayMessage,
  slideDisplayTitle,
  slideDisplayVisual,
} from "@/lib/app/presentation/slidePartsDisplay";
import {
  buildPresentationSpecFromSlideFrames,
  hasRenderablePresentationSlideFrames,
} from "@/lib/app/presentation/presentationSlideFrames";
import {
  bulletItems,
  bulletsFromSlide,
  shouldUseVisualLayout,
  supportingInfoForSlide,
} from "@/lib/app/presentation/presentationTaskLegacySupport";

function inferLayoutVariant(
  slide: PresentationTaskSlidePlan,
  slideIndex: number
): Extract<
  PresentationSpec["slides"][number],
  { type: "twoColumn" }
>["layoutVariant"] {
  const hint = `${slide.placementComposition} ${slideDisplayVisual(slide)}`;
  if (/(?:中央|中心|大きく|全面|フル|地図|マップ|工程図|フロー|タイムライン|hero|center|full|flow|map)/iu.test(hint)) {
    return "visualHero";
  }
  if (/(?:左に(?:写真|画像|イラスト|図|図解|地図|マップ|ビジュアル)|ビジュアル左|写真左|図左|左側に(?:写真|画像|イラスト|図|図解)|visual left|left visual)/iu.test(hint)) {
    return "visualLeftTextRight";
  }
  if (/(?:右に(?:写真|画像|イラスト|図|図解|地図|マップ|ビジュアル)|ビジュアル右|写真右|図右|右側に(?:写真|画像|イラスト|図|図解)|visual right|right visual)/iu.test(hint)) {
    return "textLeftVisualRight";
  }
  if (/(?:左右|2分割|二分割|2カラム|二列|two column|split)/iu.test(hint)) {
    return slideIndex % 2 === 0
      ? "textLeftVisualRight"
      : "visualLeftTextRight";
  }
  return "textLeftVisualRight";
}

function buildVisualLayoutSlide(
  slide: PresentationTaskSlidePlan,
  title: string,
  extractedItems: string[],
  slideIndex: number
): PresentationSpec["slides"][number] {
  const layoutBullets = layoutItemBullets(slide);
  const message = slideDisplayMessage(slide);
  const visual = slideDisplayVisual(slide);
  const visualBullets = bulletItems(
    layoutBullets.length > 0
      ? []
      : slide.structuredContent.visual.supportingFacts
  );
  const supportingBullets = bulletItems(
    layoutBullets.length > 0
      ? []
      : supportingInfoForSlide(slide, extractedItems)
  );

  return {
    type: "twoColumn",
    title,
    layoutVariant: inferLayoutVariant(slide, slideIndex),
    left: {
      heading: "Message",
      body: message || undefined,
      bullets:
        layoutBullets.length > 0
          ? layoutBullets
          : supportingBullets.length > 0
            ? supportingBullets
            : undefined,
    },
    right: {
      heading: visual ? "\u30ad\u30fc\u30d3\u30b8\u30e5\u30a2\u30eb\u6848" : "\u914d\u7f6e\u30fb\u69cb\u6210",
      body:
        visual ||
        slide.structuredContent.layout.instruction ||
        "Confirm the visual direction.",
      bullets: visualBullets.length > 0 ? visualBullets : undefined,
    },
    notes: slide.keyMessage || undefined,
  };
}

export function buildPresentationSpecFromTaskPlan(
  plan: PresentationTaskPlan
): PresentationSpec {
  if (hasRenderablePresentationSlideFrames(plan.slideFrames)) {
    return buildPresentationSpecFromSlideFrames({
      title: plan.title,
      frames: plan.slideFrames,
      strategyItems: plan.strategyItems,
    });
  }
  const plannedSlides = plan.slides.length > 0 ? plan.slides : [];
  if (plannedSlides.length === 0) {
    throw new Error(
      "\u30b9\u30e9\u30a4\u30c9\u8a2d\u8a08JSON\u304c\u3042\u308a\u307e\u305b\u3093\u3002PPTX\u51fa\u529b\u524d\u306b\u8a2d\u8a08\u66f8\u3092\u66f4\u65b0\u3057\u3066\u304f\u3060\u3055\u3044\u3002"
    );
  }
  const slides: PresentationSpec["slides"] =
    plannedSlides.map((slide, index) => {
      const title = slideDisplayTitle(slide, `Slide ${index + 1}`);
      if (index === 0) {
        const aimPart = slideDisplayMessage(slide);
        const visualPart = slideDisplayVisual(slide);
        return {
          type: "title",
          title,
          subtitle: aimPart || slide.keyMessage || undefined,
          keyVisual: visualPart || undefined,
          notes: slide.keyMessage || undefined,
        };
      }
      if (shouldUseVisualLayout(slide)) {
        return buildVisualLayoutSlide(slide, title, plan.extractedItems, index);
      }
      const supportingInfo = supportingInfoForSlide(slide, plan.extractedItems);
      const layoutBullets = layoutItemBullets(slide);
      return {
        type: "bullets",
        title,
        lead: slideDisplayMessage(slide) || undefined,
        bullets:
          layoutBullets.length > 0
            ? layoutBullets
            : supportingInfo.length > 0
              ? bulletItems(supportingInfo)
              : bulletsFromSlide(slide),
        notes: slide.keyMessage || undefined,
      };
    });

  return {
    version: "0.1",
    title: plan.title || "Presentation",
    language: "ja",
    audience: findStrategyValue(plan.strategyItems, "audience"),
    purpose: findStrategyValue(plan.strategyItems, "purpose"),
    theme: "business-clean",
    density: "standard",
    slides,
  };
}

function findStrategyValue(items: string[], key: string) {
  const matched = items.find((item) =>
    item.toLowerCase().startsWith(`${key.toLowerCase()}:`)
  );
  return matched?.replace(new RegExp(`^${key}\\s*:\\s*`, "i"), "").trim() || undefined;
}
