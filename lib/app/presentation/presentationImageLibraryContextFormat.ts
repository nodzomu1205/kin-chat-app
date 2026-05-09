import type { GeneratedImagePresentationMeta } from "@/lib/app/image/imageLibrary";
import type { PresentationImageLibraryCandidate } from "@/lib/app/presentation/presentationImageLibrary";

export function buildVisualRoleHint(image: PresentationImageLibraryCandidate) {
  const shape =
    image.orientation ||
    (typeof image.aspectRatio === "number"
      ? image.aspectRatio >= 1.25
        ? "landscape"
        : image.aspectRatio <= 0.8
          ? "portrait"
          : "square"
      : "unknown");
  const baseType = image.presentationMeta?.visualBaseType || "unknown";
  return `base=${baseType}; shape=${shape}; decide visualMain/textMain only by matching visible subjects, embedded text, and relationships to the slide key message`;
}

export function buildCaptionSeed(image: PresentationImageLibraryCandidate) {
  const meta = image.presentationMeta;
  const embeddedText = meta?.embeddedTextItems
    .map((item) => item.text.trim())
    .filter(Boolean)
    .slice(0, 2);
  const subjects = meta?.visibleSubjects.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const tags = meta?.semanticTags.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const parts = [
    ...(embeddedText || []),
    ...(subjects || []),
    ...(tags || []),
    image.title?.trim(),
  ].filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 5).join(" / ");
}

export function formatNamedEntities(
  namedEntities: GeneratedImagePresentationMeta["namedEntities"] | undefined
) {
  if (!namedEntities) return [];
  return [
    namedEntities.places.length ? `places=${namedEntities.places.join(", ")}` : "",
    namedEntities.stations.length ? `stations=${namedEntities.stations.join(", ")}` : "",
    namedEntities.people.length ? `people=${namedEntities.people.join(", ")}` : "",
    namedEntities.organizations.length ? `organizations=${namedEntities.organizations.join(", ")}` : "",
    namedEntities.landmarks.length ? `landmarks=${namedEntities.landmarks.join(", ")}` : "",
  ].filter(Boolean);
}
