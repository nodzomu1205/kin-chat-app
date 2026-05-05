import type {
  FileReadPolicy,
  FileUploadKind,
  ImageDetail,
  IngestMode,
} from "@/lib/server/ingest/routeHelpers";

export function buildIngestPrompt(params: {
  file: File;
  mimeType: string;
  uploadKind: FileUploadKind;
  mode: IngestMode;
  detail: ImageDetail;
  readPolicy: FileReadPolicy;
}) {
  const { file, mimeType, uploadKind, mode, detail, readPolicy } = params;

  if (uploadKind === "visual") {
    const isTextFirstMax = readPolicy === "text_first" && detail === "max";
    const outputPlan =
      detail === "max" && readPolicy === "text_first"
        ? `
Output plan:
- Put the full extracted document text in rawText.
- Set structuredSummary, kinCompact, and kinDetailed to empty arrays unless there are short non-duplicative warnings or visual notes.
        `.trim()
        : detail === "max"
          ? `
Output plan:
- Put the useful high-detail extraction in kinDetailed only.
- Set rawText to an empty string.
- Set structuredSummary and kinCompact to empty arrays.
          `.trim()
          : detail === "detailed"
            ? `
Output plan:
- Put one complete medium-detail coverage digest in kinDetailed only.
- Preserve fixed sets, enumerations, steps, comparisons, and stated counts; compress evenly instead of dropping later items.
- Set rawText to an empty string.
- Set structuredSummary and kinCompact to empty arrays.
            `.trim()
            : `
Output plan:
- Put one compact high-signal digest in kinCompact only.
- Preserve explicit counts and include every named item when the source presents a fixed set.
- Use complete short lines; do not end an item with an ellipsis.
- Set rawText to an empty string.
- Set structuredSummary and kinDetailed to empty arrays.
            `.trim();
    const detailInstruction =
      detail === "max"
        ? "Use very high granularity when describing layouts, figures, images, and visible text."
        : detail === "detailed"
          ? "Describe layouts, figures, images, and visible text carefully with a moderate amount of detail."
          : "Describe only the minimum details needed to preserve meaning, aiming for a compact result.";

    const policyInstruction =
      readPolicy === "text_first"
        ? `
Reading policy: text-first.
- For PDFs, slides, and document-like images, prioritize readable text extraction over scene description.
- Preserve headings, bullets, labels, numbers, dates, URLs, and wording as faithfully as possible.
- Mention layout, charts, and images only when they change interpretation or supply missing context.
- If text is partially unreadable, say so in warnings instead of guessing.
- rawText should focus on extracted text, not narrative image description.
- structuredSummary should summarize the textual content first.
- kinCompact should be concise text-first notes.
- kinDetailed should preserve more original wording and order, then add only necessary visual notes.
${isTextFirstMax
  ? `
- For text-first max, rawText is the single full-text authority.
- Do not repeat the extracted text in structuredSummary, kinCompact, or kinDetailed.
- Use structuredSummary, kinCompact, and kinDetailed only for short non-duplicative notes; otherwise return empty arrays for them.
  `.trim()
  : ""}
      `.trim()
        : readPolicy === "visual_first"
          ? `
Reading policy: visual-first.
- Prioritize layout, composition, charts, figures, photos, and page structure.
- Include visible text, but do not try to preserve full wording unless it is central.
- rawText may mix short extracted text with visual explanation where helpful.
- structuredSummary, kinCompact, and kinDetailed should center on visual interpretation.
      `.trim()
          : `
Reading policy: hybrid.
- Balance extracted text and visual structure.
- Preserve important text verbatim where possible, especially titles, bullets, labels, numbers, and decisions.
- Also explain layout, charts, diagrams, and imagery when they add meaning.
- kinDetailed should combine text understanding and visual context in a stable, practical way.
      `.trim();

    return `
You are an ingestion engine for a Kin + GPT application.

Goal:
Convert the uploaded visual or document-like file into reliable knowledge that can be injected into a separate persona agent ("Kin") through plain text only.

Return JSON only. No markdown fences.

Rules:
- Preserve factual visible details and readable text.
- Avoid guesses.
- If something is unclear, mention it in warnings.
- Do not identify real people in images.
- Source filename: ${file.name}
- Source mime: ${mimeType}
- Visual detail level: ${detail}
- ${detailInstruction}

${policyInstruction}

${outputPlan}

Return exactly this JSON shape:
{
  "title": string,
  "sourceKind": string,
  "rawText": string,
  "structuredSummary": string[],
  "kinCompact": string[],
  "kinDetailed": string[],
  "warnings": string[],
  "presentationMeta": {
    "version": "0.3-presentation-image-meta",
    "visualBaseType": "photo" | "information_visual" | "mixed" | "unknown",
    "visibleSubjects": string[],
    "embeddedTextItems": [{
      "text": string,
      "role": "title" | "label" | "claim" | "metric" | "brand" | "context_sign" | "other",
      "location": "top_left" | "top_center" | "top_right" | "center" | "bottom_left" | "bottom_center" | "bottom_right" | "wall_or_display" | "unknown"
    }],
    "relationships": [{
      "type": "sequence" | "comparison" | "alternative" | "cause_effect" | "hierarchy" | "unknown",
      "items": string[],
      "evidence": string
    }],
    "composition": "single_scene" | "single_subject" | "split_panel" | "multi_panel" | "document_or_display" | "dense_scene" | "unknown",
    "semanticTags": string[]
  }
}

Constraints:
- Populate only the output field named in Output plan.
- Do not generate multiple alternate versions of the same content.
- Avoid duplicate text across JSON fields.
- No emotional language
- No first-person voice
- For presentationMeta, extract planning material only. Do not judge whether this image should be visualMain or textMain.
- visualBaseType is only a coarse basis: photo for ordinary photos, information_visual for actual diagram/chart/table/map visuals, mixed when a photo contains a meaningful information panel or display, unknown when unclear.
- visibleSubjects should list concrete visible objects, people/groups, places, products, and processes. Keep it concise.
- embeddedTextItems should list only readable text that may matter for later slide-message matching; do not decide whether the text carries a message.
- relationships should describe only visible or explicitly labeled structure such as sequence, comparison, alternative, cause-effect, or hierarchy. Do not add a relationship for objects that merely appear in the same scene; visibleSubjects already covers them. Do not assume a sequence from side-by-side panels. Use alternative or comparison when labels indicate parallel options such as "Knitting / Weaving".
- composition should capture simple visual structure only.
- semanticTags should name meaningful objects, processes, domains, and concepts for matching images to slide messages.
- Final visualMain vs textMain must be decided later by comparing these materials with the slide key message and content.
`.trim();
  }

  const textOutputPlan =
    mode === "max"
      ? `
Output plan:
- Put the full extracted text in kinDetailed only.
- Set rawText to an empty string.
- Set structuredSummary and kinCompact to empty arrays.
      `.trim()
      : mode === "detailed"
        ? `
Output plan:
- Put one complete medium-detail coverage digest in kinDetailed only.
- Preserve fixed sets, enumerations, steps, comparisons, and stated counts; compress evenly instead of dropping later items.
- Set rawText to an empty string.
- Set structuredSummary and kinCompact to empty arrays.
        `.trim()
        : `
Output plan:
- Put one compact high-signal digest in kinCompact only.
- Preserve explicit counts and include every named item when the source presents a fixed set.
- Use complete short lines; do not end an item with an ellipsis.
- Set rawText to an empty string.
- Set structuredSummary and kinDetailed to empty arrays.
        `.trim();
  const fullModeInstruction =
    mode === "max"
      ? `
Additionally produce kinDetailed with as much preserved information as possible.
- For text-rich files, keep wording and order as much as possible.
- Preserve structure and flow where possible.
      `.trim()
      : mode === "detailed"
        ? `
Additionally produce kinDetailed as a medium-detail version that preserves the main structure and important wording without trying to keep everything.
        `.trim()
        : `
Keep kinCompact highly compressed. If the source text is already short and clear, do not over-compress it.
        `.trim();

  return `
You are an ingestion engine for a Kin + GPT application.

Goal:
Convert the uploaded file into reliable text knowledge that can be injected into a separate persona agent ("Kin") through plain text only.

Return JSON only. No markdown fences.

Rules:
- Preserve factual details, names, numbers, dates, URLs, code identifiers, and file structure when important.
- Avoid guesses.
- If something is unclear, mention it in warnings.
- For code files: summarize purpose, key functions, inputs/outputs, dependencies, and risks.
- For spreadsheets: summarize sheet meaning, important columns, patterns, and notable metrics.
- For presentations: summarize slide narrative, decisions, numbers, and action items.
- Source filename: ${file.name}
- Source mime: ${mimeType}
- Preferred text mode: ${mode}
- File reading policy: ${readPolicy}

${fullModeInstruction}

${textOutputPlan}

Return exactly this JSON shape:
{
  "title": string,
  "sourceKind": string,
  "rawText": string,
  "structuredSummary": string[],
  "kinCompact": string[],
  "kinDetailed": string[],
  "warnings": string[]
}

Constraints:
- Populate only the output field named in Output plan.
- Do not generate multiple alternate versions of the same content.
- Avoid duplicate text across JSON fields.
- No emotional language
- No first-person voice
`.trim();
}

