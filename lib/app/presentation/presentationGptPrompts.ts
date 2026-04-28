import type {
  PresentationDensity,
  PresentationLibraryPayload,
  PresentationSpec,
} from "@/lib/app/presentation/presentationTypes";

export function buildCreatePresentationSpecPrompt(args: {
  userInstruction: string;
  density?: PresentationDensity;
}) {
  const density = args.density || "standard";
  return [
    "You are generating a PowerPoint presentation JSON draft for Kin.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "The JSON must conform to PresentationSpec v0.1:",
    "- version must be \"0.1\"",
    `- density must be \"${density}\"`,
    "- supported themes: business-clean, warm-minimal, executive-dark",
    "- supported densities: concise, standard, detailed, dense",
    "- supported slide types: title, section, bullets, twoColumn, table, closing",
    "- keep content semantic; do not use coordinates, font sizes, or colors",
    "- use Japanese when the user writes Japanese unless they explicitly ask otherwise",
    "- prefer 6 to 12 slides unless the user specifies a slide count",
    "- include audience and purpose when inferable",
    "- make each slide focused and include takeaway where useful",
    densityInstruction(density),
    "",
    "User instruction:",
    args.userInstruction.trim(),
  ].join("\n");
}

export function buildRevisePresentationSpecPrompt(args: {
  userInstruction: string;
  payload: PresentationLibraryPayload;
  density?: PresentationDensity;
}) {
  const density = args.density || args.payload.spec.density || "standard";
  return [
    "You are revising an existing Kin PowerPoint presentation JSON draft.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "Return the complete revised PresentationSpec v0.1 object, not only the changed slides.",
    "- version must be \"0.1\"",
    `- density must be \"${density}\"`,
    "- supported themes: business-clean, warm-minimal, executive-dark",
    "- supported slide types: title, section, bullets, twoColumn, table, closing",
    "- keep content semantic; do not use coordinates, font sizes, or colors",
    "- preserve useful existing content unless the user asks to replace it",
    "- apply the user revision instruction concretely",
    "- use Japanese when the user writes Japanese unless they explicitly ask otherwise",
    densityInstruction(density),
    "",
    "Current PresentationSpec JSON:",
    JSON.stringify(args.payload.spec, null, 2),
    "",
    "User revision instruction:",
    args.userInstruction.trim(),
  ].join("\n");
}

function densityInstruction(density: PresentationDensity) {
  if (density === "concise") {
    return "Density guidance: concise. Prefer 2-3 key bullets per content slide and short executive wording.";
  }
  if (density === "detailed") {
    return "Density guidance: detailed. Prefer 5-7 substantive bullets, include concrete figures/examples when available, and use bullet detail fields where useful.";
  }
  if (density === "dense") {
    return "Density guidance: dense. Prefer high-information slides with 6-8 bullets, tables or twoColumn slides for comparisons, and detail fields for evidence, numbers, assumptions, and implications.";
  }
  return "Density guidance: standard. Prefer 3-5 useful bullets per content slide with enough context to stand alone.";
}

export function buildRepairPresentationRevisionSpecPrompt(args: {
  originalUserInstruction: string;
  currentSpec: PresentationSpec;
  invalidResponse: string;
}) {
  return [
    "Convert the following invalid response into a valid complete PresentationSpec v0.1 JSON object.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "Required shape:",
    "{",
    "  \"version\": \"0.1\",",
    "  \"title\": string,",
    "  \"theme\": \"business-clean\" | \"warm-minimal\" | \"executive-dark\",",
    "  \"slides\": [supported slide objects]",
    "}",
    "",
    "Use the current spec as the base, apply the user's revision, and return the whole revised spec.",
    "Supported slide types: title, section, bullets, twoColumn, table, closing.",
    "Do not use unsupported slide types. Do not use coordinates or visual styling fields.",
    "",
    "Current PresentationSpec JSON:",
    JSON.stringify(args.currentSpec, null, 2),
    "",
    "Original user instruction:",
    args.originalUserInstruction.trim(),
    "",
    "Invalid response to repair:",
    args.invalidResponse.trim(),
  ].join("\n");
}

export function buildRepairPresentationSpecPrompt(args: {
  originalUserInstruction: string;
  invalidResponse: string;
}) {
  return [
    "Convert the following invalid response into a valid PresentationSpec v0.1 JSON object.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "Required shape:",
    "{",
    "  \"version\": \"0.1\",",
    "  \"title\": string,",
    "  \"theme\": \"business-clean\" | \"warm-minimal\" | \"executive-dark\",",
    "  \"slides\": [supported slide objects]",
    "}",
    "",
    "Supported slide types: title, section, bullets, twoColumn, table, closing.",
    "Do not use unsupported slide types. Do not use coordinates or visual styling fields.",
    "",
    "Original user instruction:",
    args.originalUserInstruction.trim(),
    "",
    "Invalid response to repair:",
    args.invalidResponse.trim(),
  ].join("\n");
}

export function buildPresentationDraftSavedMessage(args: {
  documentId: string;
  spec: PresentationSpec;
  previewText: string;
}) {
  return [
    "Presentation draft saved to library.",
    "",
    `Document ID: ${args.documentId}`,
    `Title: ${args.spec.title}`,
    `Slides: ${args.spec.slides.length}`,
    `Theme: ${args.spec.theme || "business-clean"}`,
    "",
    args.previewText,
    "",
    "Next:",
    `/ppt\nDocument ID: ${args.documentId}\nCreate PPT`,
  ].join("\n");
}

export function buildPresentationRevisionSavedMessage(args: {
  documentId: string;
  payload: PresentationLibraryPayload;
}) {
  return [
    "Presentation draft updated in library.",
    "",
    `Document ID: ${args.documentId}`,
    `Title: ${args.payload.spec.title}`,
    `Slides: ${args.payload.spec.slides.length}`,
    `Revisions: ${args.payload.patches.length}`,
    "",
    args.payload.previewText,
  ].join("\n");
}

export function buildPresentationRenderedMessage(args: {
  documentId: string;
  title: string;
  slideCount: number;
  outputPath: string;
  filename: string;
}) {
  return [
    "Presentation PPTX created.",
    "",
    `Document ID: ${args.documentId}`,
    `Title: ${args.title}`,
    `Slides: ${args.slideCount}`,
    "",
    args.outputPath ? `PPTX: [${args.filename}](${args.outputPath})` : "",
    `File: ${args.filename}`,
  ].filter(Boolean).join("\n");
}

export function buildPresentationCommandFailureMessage(args: {
  action: "createDraft" | "reviseDraft";
  error: unknown;
}) {
  const detail = args.error instanceof Error ? args.error.message : String(args.error);
  const label =
    args.action === "createDraft"
      ? "presentation draft"
      : "presentation revision";
  return [
    `Could not create the ${label}.`,
    "",
    detail,
    "",
    "Please try again with /ppt and a slightly more explicit instruction. If this repeats, ask GPT to return only PresentationSpec v0.1 JSON.",
  ].join("\n");
}
