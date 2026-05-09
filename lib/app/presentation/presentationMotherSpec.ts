import type { PresentationMotherSpec } from "@/lib/app/presentation/presentationTypes";
import {
  isMotherBody,
  normalizeMotherSpecCandidate,
} from "@/lib/app/presentation/presentationMotherSpecNormalization";
export { adaptMotherSpecToPresentationSpec } from "@/lib/app/presentation/presentationMotherSpecAdapter";

export function parsePresentationMotherSpec(input: unknown): PresentationMotherSpec {
  const candidate = normalizeMotherSpecCandidate(input);
  if (!isPresentationMotherSpec(candidate)) {
    throw new Error("GPT did not return a valid PresentationMotherSpec v0.2 JSON object.");
  }
  return candidate;
}

export function isPresentationMotherSpec(
  value: unknown
): value is PresentationMotherSpec {
  const candidate = value as PresentationMotherSpec;
  return (
    !!candidate &&
    candidate.version === "0.2-mother" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.slides) &&
    candidate.slides.length > 0 &&
    candidate.slides.every(
      (slide) =>
        typeof slide?.title === "string" &&
        typeof slide.templateFrame === "string" &&
        typeof slide.wallpaper === "string" &&
        typeof slide.script === "string" &&
        Array.isArray(slide.bodies) &&
        slide.bodies.length >= 1 &&
        slide.bodies.length <= 4 &&
        slide.bodies.every(isMotherBody)
    )
  );
}
