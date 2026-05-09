import type {
  PresentationMotherBody,
  PresentationMotherSpec,
  PresentationMotherVisual,
  PresentationTheme,
} from "@/lib/app/presentation/presentationTypes";

const VISUAL_TYPES = [
  "none",
  "photo",
  "illustration",
  "diagram",
  "chart",
  "table",
  "placeholder",
] as const;

const VISUAL_STATUSES = [
  "none",
  "pending",
  "auto",
  "attached",
  "generated",
] as const;

export function normalizeMotherSpecCandidate(input: unknown): PresentationMotherSpec {
  const candidate = objectValue(input);
  const wrapped =
    objectValue(candidate?.motherSpec) ||
    objectValue(candidate?.presentationMotherSpec) ||
    objectValue(candidate?.mother) ||
    objectValue(candidate?.contentModel) ||
    objectValue(candidate?.data) ||
    candidate;

  const slidesSource = Array.isArray(wrapped?.slides)
    ? wrapped.slides
    : Array.isArray(wrapped?.pages)
      ? wrapped.pages
      : [];
  const title = stringValue(wrapped?.title) || "Presentation";
  const language = wrapped?.language === "en" ? "en" : "ja";

  return {
    version: "0.2-mother",
    title,
    purpose: stringValue(wrapped?.purpose),
    audience: stringValue(wrapped?.audience),
    language,
    theme: supportedTheme(wrapped?.theme),
    sourceIntent: stringValue(wrapped?.sourceIntent || wrapped?.intent),
    slides: slidesSource.map((slide, index) =>
      normalizeMotherSlide(slide, index)
    ),
  };
}

function normalizeMotherSlide(input: unknown, index: number) {
  const candidate = objectValue(input);
  const bodiesSource = Array.isArray(candidate?.bodies)
    ? candidate.bodies
    : Array.isArray(candidate?.bodySets)
      ? candidate.bodySets
      : [candidate].filter(Boolean);
  const bodies = bodiesSource.slice(0, 4).map(normalizeMotherBody);

  return {
    title:
      stringValue(candidate?.title || candidate?.heading) || `Slide ${index + 1}`,
    templateFrame: stringValue(candidate?.templateFrame || candidate?.frame),
    wallpaper: stringValue(candidate?.wallpaper || candidate?.background),
    bodies: bodies.length > 0 ? bodies : [normalizeMotherBody({})],
    script: stringValue(candidate?.script || candidate?.speakerNotes || candidate?.notes),
  };
}

function normalizeMotherBody(input: unknown): PresentationMotherBody {
  const candidate = objectValue(input);
  const visualCandidate =
    objectValue(candidate?.keyVisual) || objectValue(candidate?.visual);
  return {
    keyMessage: stringValue(
      candidate?.keyMessage || candidate?.message || candidate?.headline
    ),
    keyMessageFacts: stringArray(
      candidate?.keyMessageFacts || candidate?.facts || candidate?.messageFacts
    ).slice(0, 15),
    keyVisual: normalizeMotherVisual(visualCandidate || candidate?.keyVisual),
    keyVisualFacts: stringArray(
      candidate?.keyVisualFacts || candidate?.visualFacts
    ).slice(0, 15),
  };
}

function normalizeMotherVisual(input: unknown): PresentationMotherVisual {
  const candidate = objectValue(input);
  const rawType = stringValue(candidate?.type || input).toLowerCase();
  const type = VISUAL_TYPES.includes(rawType as never)
    ? (rawType as PresentationMotherVisual["type"])
    : stringValue(candidate?.brief || input)
      ? "placeholder"
      : "none";
  return {
    type,
    brief: stringValue(candidate?.brief || (candidate ? "" : input)),
    generationPrompt: stringValue(
      candidate?.generationPrompt ||
        candidate?.prompt ||
        candidate?.visualPrompt ||
        candidate?.imagePrompt
    ),
    assetId: stringValue(candidate?.assetId),
    status:
      candidate && VISUAL_STATUSES.includes(candidate.status as never)
        ? (candidate.status as PresentationMotherVisual["status"])
        : type === "none"
          ? "none"
          : "pending",
  };
}

export function isMotherBody(body: PresentationMotherBody) {
  return (
    !!body &&
    typeof body.keyMessage === "string" &&
    Array.isArray(body.keyMessageFacts) &&
    !!body.keyVisual &&
    typeof body.keyVisual.brief === "string" &&
    typeof body.keyVisual.generationPrompt === "string" &&
    Array.isArray(body.keyVisualFacts)
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(stringValue).filter(Boolean);
  }
  const text = stringValue(value);
  return text ? [text] : [];
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function supportedTheme(value: unknown): PresentationTheme | undefined {
  return value === "business-clean" ||
    value === "warm-minimal" ||
    value === "executive-dark"
    ? value
    : undefined;
}
