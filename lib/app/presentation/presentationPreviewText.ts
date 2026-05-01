import type {
  PresentationLibraryPayload,
  PresentationSpec,
  SlideSpec,
} from "@/lib/app/presentation/presentationTypes";

function compactLine(value: string | undefined, fallback = "") {
  return (value || fallback).replace(/\s+/g, " ").trim();
}

function slideDetail(slide: SlideSpec): string {
  if (slide.type === "bullets") {
    return `${slide.bullets?.length || 0} bullets`;
  }
  if (slide.type === "twoColumn") {
    return `${compactLine(slide.left?.heading)} / ${compactLine(slide.right?.heading)}`;
  }
  if (slide.type === "table") {
    return `${slide.columns?.length || 0} columns x ${slide.rows?.length || 0} rows`;
  }
  if (slide.type === "cards") {
    return `${slide.cards?.length || 0} cards`;
  }
  if (slide.type === "closing") {
    return `${slide.nextSteps?.length || 0} next steps`;
  }
  if (slide.type === "section") {
    return compactLine(slide.subtitle);
  }
  return compactLine(slide.subtitle);
}

export function buildPresentationPreviewText(spec: PresentationSpec): string {
  const header = [
    `Document Type: Presentation`,
    `Title: ${spec.title}`,
    spec.subtitle ? `Subtitle: ${spec.subtitle}` : "",
    spec.audience ? `Audience: ${spec.audience}` : "",
    spec.purpose ? `Purpose: ${spec.purpose}` : "",
    `Theme: ${spec.theme || "business-clean"}`,
    `Density: ${spec.density || "standard"}`,
    `Slides: ${spec.slides.length}`,
  ].filter(Boolean);

  const slideLines = spec.slides.map((slide, index) => {
    const detail = slideDetail(slide);
    return `${index + 1}. ${slide.type} - ${slide.title}${detail ? ` (${detail})` : ""}`;
  });

  return [...header, "", "Slide Outline:", ...slideLines].join("\n").trim();
}

export function buildPresentationSummary(spec: PresentationSpec): string {
  const slideTitles = spec.slides
    .slice(0, 6)
    .map((slide, index) => `${index + 1}. ${slide.title}`)
    .join(" / ");
  const basis = [
    `${spec.title} (${spec.slides.length} slides)`,
    `Density: ${spec.density || "standard"}`,
    spec.audience ? `Audience: ${spec.audience}` : "",
    spec.purpose ? `Purpose: ${spec.purpose}` : "",
    slideTitles ? `Outline: ${slideTitles}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return basis.length > 260 ? `${basis.slice(0, 260).trimEnd()}...` : basis;
}

export function buildPresentationPayloadSummary(
  payload: PresentationLibraryPayload
): string {
  const output = payload.outputs[payload.outputs.length - 1];
  const base = buildPresentationSummary(payload.spec);
  if (!output) return base;

  const withOutput = `${base} Latest PPTX: ${output.filename}`;
  return withOutput.length > 320 ? `${withOutput.slice(0, 320).trimEnd()}...` : withOutput;
}

function inventoryLine(payload: PresentationLibraryPayload) {
  const inventory = payload.informationInventory;
  if (!inventory) return "";
  return `Information Inventory: ${inventory.rawFacts.length} raw facts / ${inventory.factGroups.length} fact groups`;
}

function strategyLine(payload: PresentationLibraryPayload) {
  const strategy = payload.presentationStrategy;
  if (!strategy) return "";
  return `Presentation Strategy: ${strategy.slideCountRange.target} target slides / ${strategy.visualPolicy.overallUse} visuals / ${strategy.structurePolicy.preferredFlow}`;
}

export function buildPresentationPayloadPreviewText(
  payload: PresentationLibraryPayload
): string {
  const lines = [
    `Document ID: ${payload.documentId}`,
    `Status: ${payload.status}`,
    payload.outputs.length > 0
      ? `Latest PPTX: ${payload.outputs[payload.outputs.length - 1].filename}`
      : "",
    payload.outputs.length > 0 && payload.outputs[payload.outputs.length - 1].path
      ? `Latest PPTX Link: ${payload.outputs[payload.outputs.length - 1].path}`
      : "",
    inventoryLine(payload),
    strategyLine(payload),
    "",
    payload.previewText,
  ].filter((line) => line !== "");

  return lines.join("\n");
}
