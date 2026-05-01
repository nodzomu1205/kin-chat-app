import type {
  PresentationDensity,
  PresentationInformationInventory,
  PresentationLibraryPayload,
  PresentationStrategy,
  PresentationSpec,
} from "@/lib/app/presentation/presentationTypes";

export function buildCreateInformationInventoryPrompt(args: {
  userInstruction: string;
}) {
  return [
    "You are organizing source information for Kin.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "This step is NOT about PowerPoint, slides, deck layout, visual design, density, or presentation flow.",
    "Do not mention slides, pages, layouts, bullets for slide fit, or visuals.",
    "Your job is only to convert the available source context into an information inventory.",
    "",
    "The JSON must conform to InformationInventory v0.2:",
    "- version must be \"0.2-information-inventory\"",
    "- required fields: version, topic, language, rawFacts, factGroups",
    "- rawFacts is the primary output: a broad, detailed inventory of concrete source facts",
    "- rawFacts must include every distinct, useful, non-duplicative fact supported by the provided source context",
    "- rawFacts is not a summary and not slide bullets; do not compress source material into a few representative facts",
    "- each rawFact must include only: id, text, sourceHint",
    "- do not add kind, importance, priority, score, interpretation, slide hints, visual hints, missingInfo, searchSuggestions, keyMessages, or facts nested inside groups",
    "- factGroups is only a light semantic classification over rawFacts using factIds",
    "- each factGroup must include only: id, label, factIds",
    "- create factGroups only where facts naturally belong together by meaning; leave unrelated facts ungrouped",
    "- do not use factGroups to summarize, rank, or decide what matters for the presentation",
    "- do not target a fixed number of facts; the correct count depends on the source",
    "- do not stop at 4 or 5 facts just because the item looks tidy",
    "- use Japanese when the user writes Japanese unless they explicitly ask otherwise",
    "",
    "User instruction:",
    args.userInstruction.trim(),
  ].join("\n");
}

export function buildReviseInformationInventoryPrompt(args: {
  userInstruction: string;
  payload: PresentationLibraryPayload;
}) {
  return [
    "You are revising the source information inventory for Kin.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "This step is NOT about PowerPoint, slides, deck layout, visual design, density, or presentation flow.",
    "Apply the user's revision instruction to the information inventory itself.",
    "If the user asks for more depth, expertise, specificity, or richer content, expand rawFacts first, then update factGroups only where meaningful.",
    "If the user asks for visual treatment only, preserve the factual inventory unless new factual distinctions are needed.",
    "",
    "Inventory requirements:",
    "- version must be \"0.2-information-inventory\"",
    "- required fields: version, topic, language, rawFacts, factGroups",
    "- rawFacts must be the primary extraction output",
    "- each rawFact must include only: id, text, sourceHint",
    "- factGroups must include only: id, label, factIds",
    "- factGroups are light semantic classification only, not key messages or presentation claims",
    "- do not add kind, importance, priority, score, interpretation, slide hints, visual hints, missingInfo, searchSuggestions, keyMessages, or nested facts",
    "- do not target a fixed number of facts",
    "- do not stop at 4 or 5 facts just because the item looks tidy",
    "- use Japanese when the user writes Japanese unless they explicitly ask otherwise",
    "",
    "Current InformationInventory JSON:",
    JSON.stringify(args.payload.informationInventory || null, null, 2),
    "",
    "Current PresentationSpec JSON:",
    JSON.stringify(args.payload.spec, null, 2),
    "",
    "User revision instruction:",
    args.userInstruction.trim(),
  ].join("\n");
}

export function buildCreatePresentationStrategyPrompt(args: {
  userInstruction: string;
  inventory: PresentationInformationInventory;
  density?: PresentationDensity;
}) {
  return [
    "You are creating a presentation strategy for Kin.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "This step is a meta-level editing strategy, not a slide-by-slide draft.",
    "Do not create individual slides. Do not assign exact slide layouts.",
    "",
    "The JSON must conform to PresentationStrategy v0.1:",
    "- version must be \"0.1-presentation-strategy\"",
    "- required fields: version, title, purpose, audience, tone, density, slideCountRange, selectedFactGroupIds, factGroupPriority, visualPolicy, structurePolicy",
    "- supported tone: educational, analytical, executive, narrative, persuasive",
    "- supported density: concise, standard, detailed, dense",
    args.density ? `- density must be \"${args.density}\"` : "- infer density from the user instruction if not explicit",
    "- slideCountRange must include min, max, target",
    "- selectedFactGroupIds chooses which inventory fact groups should be used",
    "- factGroupPriority explains must_use, should_use, optional at fact-group level",
    "- visualPolicy decides how much visual support to use overall; visuals are not mandatory for every slide",
    "- visualPolicy.overallUse must be minimal, selective, or frequent",
    "- use mustVisualizeFactGroupIds only when a fact group clearly benefits from or requires a visual",
    "- use avoidVisualFactGroupIds when text-only treatment is clearer",
    "- preferredVisualTypes and avoidVisualTypes can include none, photo, illustration, diagram, chart, table, placeholder",
    "- structurePolicy sets the broad flow only; supported preferredFlow: chronological, overview_to_detail, thesis_evidence, comparison, problem_solution",
    "- structurePolicy must use allowMultipleFactGroupsPerSlide and combineRelatedFactGroups",
    "- use Japanese when the user writes Japanese unless they explicitly ask otherwise",
    "",
    "InformationInventory JSON:",
    JSON.stringify(args.inventory, null, 2),
    "",
    "Original user instruction:",
    args.userInstruction.trim(),
  ].join("\n");
}

export function buildRevisePresentationStrategyPrompt(args: {
  userInstruction: string;
  payload: PresentationLibraryPayload;
  inventory: PresentationInformationInventory;
  density?: PresentationDensity;
}) {
  const density = args.density || args.payload.presentationStrategy?.density;
  return [
    "You are revising the presentation strategy for Kin.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "This step is a meta-level editing strategy, not a slide-by-slide draft.",
    "Do not create individual slides. Do not assign exact slide layouts.",
    "",
    "Apply the user's revision instruction to the strategy.",
    "If the user asks for more depth or expertise, consider density, selectedFactGroupIds, factGroupPriority, and slideCountRange.",
    "If the user asks for photos or visuals, update visualPolicy rather than adding unsupported image fields to slides.",
    "",
    "The JSON must conform to PresentationStrategy v0.1:",
    "- version must be \"0.1-presentation-strategy\"",
    "- required fields: version, title, purpose, audience, tone, density, slideCountRange, selectedFactGroupIds, factGroupPriority, visualPolicy, structurePolicy",
    density ? `- density must be \"${density}\"` : "- preserve or infer density from the revision instruction",
    "- visualPolicy.overallUse must be minimal, selective, or frequent",
    "- use mustVisualizeFactGroupIds only for fact groups that should definitely get visual treatment",
    "- visuals are not mandatory for every slide",
    "- preferredVisualTypes and avoidVisualTypes can include none, photo, illustration, diagram, chart, table, placeholder",
    "- structurePolicy must use allowMultipleFactGroupsPerSlide and combineRelatedFactGroups",
    "- use Japanese when the user writes Japanese unless they explicitly ask otherwise",
    "",
    "Current PresentationStrategy JSON:",
    JSON.stringify(args.payload.presentationStrategy || null, null, 2),
    "",
    "Updated InformationInventory JSON:",
    JSON.stringify(args.inventory, null, 2),
    "",
    "Current PresentationSpec JSON:",
    JSON.stringify(args.payload.spec, null, 2),
    "",
    "User revision instruction:",
    args.userInstruction.trim(),
  ].join("\n");
}

export function buildCreatePresentationSpecPrompt(args: {
  userInstruction: string;
  inventory: PresentationInformationInventory;
  strategy: PresentationStrategy;
  currentSpec?: PresentationSpec;
}) {
  return [
    "You are creating the renderer-ready PresentationSpec v0.1 JSON for Kin.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "Use the InformationInventory as the source of facts.",
    "Use the PresentationStrategy as the binding editing policy.",
    "Only this step may decide concrete slide structure and layouts.",
    "",
    "Required PresentationSpec v0.1 shape:",
    "- version must be \"0.1\"",
    "- required fields: version, title, language, audience, purpose, theme, density, slides",
    "- supported themes: business-clean, warm-minimal, executive-dark",
    "- density must match the strategy density",
    "- supported slide types: title, section, bullets, twoColumn, table, closing",
    "- do not output unsupported fields such as images, imageUrl, media, assets, coordinates, font sizes, or colors",
    "- when a photo or other visual is requested, represent it with supported slide structures such as twoColumn: put the visual request in the right column as heading/body/bullets",
    "- for visual requests, include a direct generation prompt as visible text such as \"Prompt: ...\" until the renderer supports real assets",
    "- respect strategy.slideCountRange unless the user instruction clearly requires otherwise",
    "- include visuals only when strategy.visualPolicy supports it for the selected fact groups",
    "- do not force every slide to have a visual",
    "- do not force every slide into the same layout",
    "- for standard density, visible slide bullets should be selective; do not mutate the inventory itself",
    "- notes should be read-aloud presenter narration, not a meta description of the slide",
    "- keep content semantic; do not use coordinates, font sizes, or colors",
    "- use Japanese when the user writes Japanese unless they explicitly ask otherwise",
    "",
    "InformationInventory JSON:",
    JSON.stringify(args.inventory, null, 2),
    "",
    "PresentationStrategy JSON:",
    JSON.stringify(args.strategy, null, 2),
    "",
    args.currentSpec ? "Current PresentationSpec JSON:" : "",
    args.currentSpec ? JSON.stringify(args.currentSpec, null, 2) : "",
    args.currentSpec ? "" : "",
    "Original user instruction:",
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
    "Convert the following invalid response into a valid renderer-ready PresentationSpec v0.1 JSON object.",
    "Return strict JSON only. Do not wrap it in Markdown. Do not add commentary.",
    "",
    "Required shape:",
    "{",
    "  \"version\": \"0.1\",",
    "  \"title\": string,",
    "  \"language\": \"ja\" | \"en\",",
    "  \"audience\": string,",
    "  \"purpose\": string,",
    "  \"theme\": \"business-clean\" | \"warm-minimal\" | \"executive-dark\",",
    "  \"density\": \"concise\" | \"standard\" | \"detailed\" | \"dense\",",
    "  \"slides\": [supported slide objects]",
    "}",
    "",
    "Supported slide types: title, section, bullets, twoColumn, table, closing.",
    "Use notes for read-aloud presenter narration where useful.",
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
  inventoryFactGroupCount?: number;
  inventoryFactCount?: number;
  strategySummary?: string;
}) {
  return [
    "Presentation draft saved to library.",
    "",
    `Document ID: ${args.documentId}`,
    `Title: ${args.spec.title}`,
    `Slides: ${args.spec.slides.length}`,
    `Theme: ${args.spec.theme || "business-clean"}`,
    args.inventoryFactGroupCount !== undefined
      ? `Information Inventory: ${args.inventoryFactCount || 0} raw facts / ${args.inventoryFactGroupCount} fact groups`
      : "",
    args.strategySummary ? `Presentation Strategy: ${args.strategySummary}` : "",
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
  generatedImages?: Array<{
    imageId: string;
    title?: string;
    path?: string;
  }>;
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
    args.generatedImages?.length ? "" : "",
    ...(args.generatedImages || []).flatMap((image) => [
      `Image ID: ${image.imageId}`,
      image.title ? `Image: ${image.title}` : "",
      image.path ? `![${image.imageId}](${image.path})` : "",
    ]),
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
    "Please try again with /ppt and a slightly more explicit instruction. If this repeats, ask GPT to return only valid PresentationSpec v0.1 JSON.",
  ].join("\n");
}
