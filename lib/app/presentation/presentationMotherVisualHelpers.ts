import type {
  PresentationMotherBody,
  PresentationMotherVisual,
} from "@/lib/app/presentation/presentationTypes";

export function visualLabel(visual: PresentationMotherVisual) {
  if (visual.type === "none" && !visual.brief) return "";
  return [visual.type, visual.brief].filter(Boolean).join(": ");
}

export function visualHeading(visual: PresentationMotherVisual) {
  if (visual.type === "none") return "Visual";
  return `${visual.type} request`;
}

export function hasVisualRequest(body: PresentationMotherBody) {
  return (
    body.keyVisual.type !== "none" ||
    !!body.keyVisual.brief ||
    body.keyVisualFacts.length > 0
  );
}
