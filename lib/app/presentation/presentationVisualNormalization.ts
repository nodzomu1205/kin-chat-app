import {
  presentationVisualSlotMatchKey,
  type PresentationVisualSlotNormalizedTextMap,
} from "@/lib/app/presentation/presentationVisualSelection";
import type { PresentationTaskPlan, PresentationTaskVisualSlot } from "@/types/task";

export type PresentationVisualNormalizationInput = {
  key: string;
  label: string;
  need: string;
  keywords: string[];
  context: string;
};

export function collectPresentationVisualNormalizationInputs(
  plan: PresentationTaskPlan
): PresentationVisualNormalizationInput[] {
  const inputs: PresentationVisualNormalizationInput[] = [];
  const opening = plan.deckFrame?.openingSlide;
  if (opening?.enabled && opening.visualRequest) {
    inputs.push(
      ...visualRequestInputs({
        slots: opening.visualRequest.visualSlots,
        fallback: {
          slotId: "openingVisual",
          label: opening.visualRequest.labels?.[0] || opening.visualRequest.brief || "Opening visual",
          need: [opening.visualRequest.prompt, opening.visualRequest.brief].filter(Boolean).join(" "),
          keywords: [],
          order: 1,
        },
        context: [plan.title, opening.title, opening.subtitle, opening.message].filter(Boolean).join(" / "),
      })
    );
  }

  for (const frame of plan.slideFrames) {
    frame.blocks.forEach((block, index) => {
      if (!block.visualRequest) return;
      inputs.push(
        ...visualRequestInputs({
          slots: block.visualRequest.visualSlots,
          fallback: {
            slotId: `${frame.slideNumber}-${index + 1}`,
            label: block.visualRequest.labels?.[0] || block.visualRequest.brief || `Slide ${frame.slideNumber} visual`,
            need: [block.visualRequest.prompt, block.visualRequest.brief].filter(Boolean).join(" "),
            keywords: [],
            order: 1,
          },
          context: [plan.title, frame.title, block.heading, block.text, ...(block.items || [])]
            .filter(Boolean)
            .join(" / "),
        })
      );
    });
  }

  const seen = new Set<string>();
  return inputs.filter((input) => {
    if (!input.key || seen.has(input.key)) return false;
    seen.add(input.key);
    return !![input.label, input.need, input.keywords.join(" "), input.context].join(" ").trim();
  });
}

function visualRequestInputs(args: {
  slots: PresentationTaskVisualSlot[] | undefined;
  fallback: PresentationTaskVisualSlot;
  context: string;
}) {
  const slots = args.slots?.length ? args.slots : [args.fallback];
  return slots.map((slot) => ({
    key: presentationVisualSlotMatchKey(slot),
    label: slot.label,
    need: slot.need,
    keywords: slot.keywords || [],
    context: args.context,
  }));
}

export async function requestPresentationVisualSlotNormalization(
  plan: PresentationTaskPlan
): Promise<PresentationVisualSlotNormalizedTextMap> {
  const slots = collectPresentationVisualNormalizationInputs(plan);
  if (slots.length === 0) return {};
  const response = await fetch("/api/presentation-visual-normalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slots }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" && data.error.trim()
        ? data.error
        : "Presentation visual normalization failed."
    );
  }
  return normalizeSlotTextMap(data?.normalized);
}

export function normalizeSlotTextMap(value: unknown): PresentationVisualSlotNormalizedTextMap {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, text]) => [key, typeof text === "string" ? text.trim() : ""])
      .filter(([key, text]) => !!key && !!text)
  );
}
