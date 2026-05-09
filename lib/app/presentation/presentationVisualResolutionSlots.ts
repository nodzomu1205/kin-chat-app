import type { PresentationTaskSlideFrame } from "@/types/task";

export function visualResolutionSlots(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>
) {
  const slots = (visual.visualSlots || [])
    .filter((slot) => slot.need.trim() || slot.label.trim())
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (slots.length > 0) return slots;
  return [
    {
      slotId: "slot1",
      label: visual.labels?.[0] || visual.brief || "Visual",
      need: visual.prompt || visual.brief || "Visual",
      order: 1,
    },
  ];
}
