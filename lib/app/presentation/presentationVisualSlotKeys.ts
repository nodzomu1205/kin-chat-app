import type { PresentationTaskVisualSlot } from "@/types/task";

export function presentationVisualSlotMatchKey(slot: PresentationTaskVisualSlot) {
  const source = [
    slot.slotId,
    slot.label,
    slot.need,
    ...(slot.keywords || []),
    slot.order || "",
  ].join("\n");
  return `slot_${hashVisualSlotKeySource(source)}`;
}

function hashVisualSlotKeySource(source: string) {
  let hash = 2166136261;
  for (const char of source) {
    hash ^= char.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
