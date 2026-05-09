import type {
  BulletItem,
  PresentationDensity,
  PresentationMotherBody,
  PresentationMotherSpec,
  PresentationSpec,
  SlideSpec,
} from "@/lib/app/presentation/presentationTypes";
import {
  hasVisualRequest,
  visualHeading,
  visualLabel,
} from "@/lib/app/presentation/presentationMotherVisualHelpers";

export function adaptMotherSpecToPresentationSpec(
  motherSpec: PresentationMotherSpec,
  options: { renderDensity?: PresentationDensity } = {}
): PresentationSpec {
  const renderDensity = options.renderDensity || "standard";
  return {
    version: "0.1",
    title: motherSpec.title || "Presentation",
    language: motherSpec.language,
    audience: motherSpec.audience || undefined,
    purpose: motherSpec.purpose || undefined,
    theme: motherSpec.theme || "business-clean",
    density: renderDensity,
    slides: motherSpec.slides.map((slide) =>
      adaptMotherSlide(slide, renderDensity)
    ),
  };
}

function adaptMotherSlide(
  slide: PresentationMotherSpec["slides"][number],
  renderDensity: PresentationDensity
): SlideSpec {
  if (slide.bodies.length === 2) {
    return {
      type: "twoColumn",
      title: slide.title,
      lead: slide.templateFrame || undefined,
      left: adaptBodyToColumn(slide.bodies[0], "Left", renderDensity),
      right: adaptBodyToColumn(slide.bodies[1], "Right", renderDensity),
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
        [
          ...limitItems(body.keyMessageFacts, renderDensity, "message"),
          ...limitItems(body.keyVisualFacts, renderDensity, "visual"),
        ].join("; "),
        visualLabel(body.keyVisual),
      ]),
      notes: slide.script || undefined,
    };
  }

  const body = slide.bodies[0];
  if (hasVisualRequest(body)) {
    // Temporary renderer bridge: visual-backed single-body slides use columns
    // until the renderer can choose freer layouts from visual intent.
    return {
      type: "twoColumn",
      title: slide.title,
      lead: slide.templateFrame || undefined,
      left: {
        heading: body.keyMessage || "Key message",
        bullets: buildMessageBullets(body, slide.script, renderDensity),
      },
      right: {
        heading: visualHeading(body.keyVisual),
        body: body.keyVisual.brief || undefined,
        bullets: buildVisualBullets(body, renderDensity),
      },
      takeaway: body.keyMessage || undefined,
      notes: slide.script || undefined,
    };
  }

  return {
    type: "bullets",
    title: slide.title,
    lead: body.keyMessage || undefined,
    bullets: buildBodyBullets(body, slide.script, renderDensity),
    takeaway: body.keyMessage || undefined,
    notes: slide.script || undefined,
  };
}

function adaptBodyToColumn(
  body: PresentationMotherBody,
  fallbackHeading: string,
  renderDensity: PresentationDensity
) {
  return {
    heading: body.keyMessage || fallbackHeading,
    body: visualLabel(body.keyVisual) || undefined,
    bullets: buildBodyBullets(body, "", renderDensity),
  };
}

function buildBodyBullets(
  body: PresentationMotherBody,
  fallbackText = "",
  renderDensity: PresentationDensity
): BulletItem[] {
  const facts = [
    ...limitItems(body.keyMessageFacts, renderDensity, "message"),
    ...limitItems(body.keyVisualFacts, renderDensity, "visual"),
  ];
  const bullets: BulletItem[] = facts.map((text) => ({ text }));
  const visual = visualLabel(body.keyVisual);
  if (visual) {
    bullets.push({ text: visual, emphasis: "muted" as const });
  }
  return bullets.length > 0
    ? bullets
    : [{ text: body.keyMessage || fallbackText || "Content to be refined" }];
}

function buildMessageBullets(
  body: PresentationMotherBody,
  fallbackText = "",
  renderDensity: PresentationDensity
): BulletItem[] {
  const bullets: BulletItem[] = limitItems(
    body.keyMessageFacts,
    renderDensity,
    "message"
  ).map((text) => ({ text }));
  return bullets.length > 0
    ? bullets
    : [{ text: fallbackText || body.keyMessage || "Content to be refined" }];
}

function buildVisualBullets(
  body: PresentationMotherBody,
  renderDensity: PresentationDensity
): BulletItem[] {
  const includePrompt = renderDensity !== "concise";
  const bullets: BulletItem[] = includePrompt && body.keyVisual.generationPrompt
    ? [
        {
          text: `Prompt: ${body.keyVisual.generationPrompt}`,
          emphasis: "muted" as const,
        },
      ]
    : [];
  bullets.push(
    ...limitItems(body.keyVisualFacts, renderDensity, "visual").map((text) => ({
      text,
    }))
  );
  return bullets.length > 0
    ? bullets
    : [{ text: body.keyVisual.brief || "Visual to be specified" }];
}

function limitItems(
  items: string[],
  renderDensity: PresentationDensity,
  kind: "message" | "visual"
) {
  const limits: Record<
    PresentationDensity,
    Record<"message" | "visual", number>
  > = {
    concise: { message: 2, visual: 0 },
    standard: { message: 3, visual: 1 },
    detailed: { message: 5, visual: 2 },
    dense: { message: 8, visual: 4 },
  };
  return items.slice(0, limits[renderDensity][kind]);
}
