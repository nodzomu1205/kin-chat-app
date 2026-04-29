import type {
  BulletItem,
  PresentationDensity,
  PresentationMotherBody,
  PresentationMotherSpec,
  PresentationMotherVisual,
  PresentationSpec,
  PresentationTheme,
  SlideSpec,
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

export function adaptMotherSpecToPresentationSpec(
  motherSpec: PresentationMotherSpec
): PresentationSpec {
  return {
    version: "0.1",
    title: motherSpec.title || "Presentation",
    language: motherSpec.language,
    audience: motherSpec.audience || undefined,
    purpose: motherSpec.purpose || undefined,
    theme: motherSpec.theme || "business-clean",
    density: motherSpec.density || "standard",
    slides: motherSpec.slides.map(adaptMotherSlide),
  };
}

function normalizeMotherSpecCandidate(input: unknown): PresentationMotherSpec {
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
    density: supportedDensity(wrapped?.density),
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
    ).slice(0, 12),
    keyVisual: normalizeMotherVisual(visualCandidate || candidate?.keyVisual),
    keyVisualFacts: stringArray(
      candidate?.keyVisualFacts || candidate?.visualFacts
    ).slice(0, 12),
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
    assetId: stringValue(candidate?.assetId),
    status:
      candidate && VISUAL_STATUSES.includes(candidate.status as never)
        ? (candidate.status as PresentationMotherVisual["status"])
        : type === "none"
          ? "none"
          : "pending",
  };
}

function adaptMotherSlide(slide: PresentationMotherSpec["slides"][number]): SlideSpec {
  if (slide.bodies.length === 2) {
    return {
      type: "twoColumn",
      title: slide.title,
      lead: slide.templateFrame || undefined,
      left: adaptBodyToColumn(slide.bodies[0], "Left"),
      right: adaptBodyToColumn(slide.bodies[1], "Right"),
      takeaway: slide.bodies[0]?.keyMessage || undefined,
      notes: slide.script || undefined,
    };
  }

  if (slide.bodies.length >= 3) {
    return {
      type: "table",
      title: slide.title,
      lead: slide.templateFrame || undefined,
      columns: ["Message", "Facts", "Visual"],
      rows: slide.bodies.map((body) => [
        body.keyMessage || "",
        [...body.keyMessageFacts, ...body.keyVisualFacts].join("; "),
        visualLabel(body.keyVisual),
      ]),
      notes: slide.script || undefined,
    };
  }

  const body = slide.bodies[0];
  return {
    type: "bullets",
    title: slide.title,
    lead: body.keyMessage || undefined,
    bullets: buildBodyBullets(body, slide.script),
    takeaway: body.keyMessage || undefined,
    notes: slide.script || undefined,
  };
}

function adaptBodyToColumn(body: PresentationMotherBody, fallbackHeading: string) {
  return {
    heading: body.keyMessage || fallbackHeading,
    body: visualLabel(body.keyVisual) || undefined,
    bullets: buildBodyBullets(body),
  };
}

function buildBodyBullets(
  body: PresentationMotherBody,
  fallbackText = ""
): BulletItem[] {
  const facts = [...body.keyMessageFacts, ...body.keyVisualFacts];
  const bullets: BulletItem[] = facts.map((text) => ({ text }));
  const visual = visualLabel(body.keyVisual);
  if (visual) {
    bullets.push({ text: visual, emphasis: "muted" as const });
  }
  return bullets.length > 0
    ? bullets
    : [{ text: body.keyMessage || fallbackText || "Content to be refined" }];
}

function visualLabel(visual: PresentationMotherVisual) {
  if (visual.type === "none" && !visual.brief) return "";
  return [visual.type, visual.brief].filter(Boolean).join(": ");
}

function isMotherBody(body: PresentationMotherBody) {
  return (
    !!body &&
    typeof body.keyMessage === "string" &&
    Array.isArray(body.keyMessageFacts) &&
    !!body.keyVisual &&
    typeof body.keyVisual.brief === "string" &&
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

function supportedDensity(value: unknown): PresentationDensity | undefined {
  return value === "concise" ||
    value === "standard" ||
    value === "detailed" ||
    value === "dense"
    ? value
    : undefined;
}

function supportedTheme(value: unknown): PresentationTheme | undefined {
  return value === "business-clean" ||
    value === "warm-minimal" ||
    value === "executive-dark"
    ? value
    : undefined;
}
