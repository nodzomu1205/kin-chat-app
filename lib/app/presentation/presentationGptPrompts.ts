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
    "The JSON must conform to PresentationMotherSpec v0.2:",
    "- version must be \"0.2-mother\"",
    "- do not include a mother-level density setting; the mother JSON is a maximum-detail source record",
    `- render density requested by the user is \"${density}\"; it will be applied later by the renderer adapter, not by reducing this mother JSON`,
    "- top-level required fields: version, title, purpose, audience, language, theme, sourceIntent, slides",
    "- supported themes: business-clean, warm-minimal, executive-dark",
    "- each slide must include all fields: title, templateFrame, wallpaper, bodies, script",
    "- bodies means the number of key-message/key-visual blocks inside one slide; use 1 normally, 2 for left/right contrast, 3-4 only for clear parallel structures",
    "- each slide must include 1 to 4 bodies",
    "- each body must include all fields: keyMessage, keyMessageFacts, keyVisual, keyVisualFacts",
    "- keyMessage should be non-empty for every body unless the source has literally no usable content",
    "- keyMessageFacts should contain all available concrete support facts for that keyMessage, up to 15 facts per body",
    "- do not default to exactly two facts; for broad informational topics, target 5-10 keyMessageFacts when generally known information is available",
    "- keyVisualFacts should contain all available concrete support facts for that visual, up to 15 facts per body",
    "- for broad informational topics, target 3-8 keyVisualFacts when generally known visual evidence or labels are available",
    "- do not put all slide content only in script; script is narration, while keyMessage and facts are the visible slide material",
    "- keyVisual must include all fields: type, brief, generationPrompt, assetId, status",
    "- supported keyVisual.type: none, photo, illustration, diagram, chart, table, placeholder",
    "- supported keyVisual.status: none, pending, auto, attached, generated",
    "- keyVisual.brief should be a concise visual plan, not a vague label",
    "- keyVisual.generationPrompt should be a direct prompt that can be passed to an image/chart/table generation step",
    "- generationPrompt must specify subject, composition/layout, labels or data to include, language, style, and what to avoid",
    "- for chart or table visuals, generationPrompt must name the chart/table type, axes or columns, categories/series, values if known, and state \"needs source data\" for unknown numeric values",
    "- for photo visuals, generationPrompt should describe the desired documentary/reference image and avoid inventing a fake historical photo when only illustration is appropriate",
    "- for diagram or illustration visuals, generationPrompt should describe the exact components, arrows/relationships, labels, and visual hierarchy",
    "- use empty strings for unknown optional text, [] for empty fact arrays, assetId \"\" until an asset is attached",
    "- keep all useful information in the mother JSON; do not over-compress facts for slide fit",
    "- keep content semantic; do not use coordinates, font sizes, or colors",
    "- use Japanese when the user writes Japanese unless they explicitly ask otherwise",
    "- prefer 6 to 12 slides unless the user specifies a slide count",
    "- include audience and purpose when inferable",
    "- make each slide focused, but keep rich support facts and script",
    "- script must be a read-aloud speaker script, not a meta description of the slide",
    "- write script as if the presenter is speaking to the audience; include the key message, context, and important facts in natural prose",
    "- for Japanese decks, script should usually be 250-700 Japanese characters per slide depending on available information",
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
    "Convert the following invalid response into a valid PresentationMotherSpec v0.2 JSON object.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "Required shape:",
    "{",
    "  \"version\": \"0.2-mother\",",
    "  \"title\": string,",
    "  \"purpose\": string,",
    "  \"audience\": string,",
    "  \"language\": \"ja\" | \"en\",",
    "  \"theme\": \"business-clean\" | \"warm-minimal\" | \"executive-dark\",",
    "  \"sourceIntent\": string,",
    "  \"slides\": [{",
    "    \"title\": string,",
    "    \"templateFrame\": string,",
    "    \"wallpaper\": string,",
    "    \"bodies\": [{",
    "      \"keyMessage\": string,",
    "      \"keyMessageFacts\": string[],",
    "      \"keyVisual\": { \"type\": string, \"brief\": string, \"generationPrompt\": string, \"assetId\": string, \"status\": string },",
    "      \"keyVisualFacts\": string[]",
    "    }],",
    "    \"script\": string",
    "  }]",
    "}",
    "",
    "Every slide must have 1 to 4 bodies. Use empty strings and empty arrays instead of omitting fields.",
    "Do not include a mother-level density setting. Preserve all useful source facts, up to 15 facts per fact array.",
    "Do not default to exactly two facts when the invalid response contains or implies more useful facts.",
    "Every keyVisual must include generationPrompt. It should be directly usable by a future visual generation step.",
    "Do not leave keyMessage and keyMessageFacts empty when the invalid response contains usable slide content or script.",
    "script must be read-aloud presenter narration, not a sentence that says what the slide explains.",
    "Do not use coordinates or visual styling fields.",
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
    "Please try again with /ppt and a slightly more explicit instruction. If this repeats, ask GPT to return only PresentationMotherSpec v0.2 JSON.",
  ].join("\n");
}
