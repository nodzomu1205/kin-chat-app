import type { TaskRequest } from "@/types/task";

function buildConstraintSection(task: TaskRequest) {
  return task.constraints.length > 0
    ? task.constraints.map((constraint) => `- ${constraint}`).join("\n")
    : "- None";
}

function buildFormatTaskPrompt(task: TaskRequest) {
  const titleLine =
    task.existingTitle && task.existingTitle.trim()
      ? `EXISTING_TITLE: ${task.existingTitle.trim()}`
      : "EXISTING_TITLE: (none)";

  return [
    "<<SYS_FORMAT_TASK>>",
    `TASK_ID: ${task.taskId}`,
    titleLine,
    `GOAL: ${task.goal}`,
    `INPUT_REF: ${task.inputRef}`,
    "INPUT:",
    task.inputSummary,
    "CONSTRAINTS:",
    buildConstraintSection(task),
    "<<END_SYS_FORMAT_TASK>>",
    "",
    "Return only one <<TASK>> block.",
    "Use TITLE only when EXISTING_TITLE is provided.",
    "If EXISTING_TITLE is (none), omit the TITLE line.",
    "Do not create a new title.",
  ].join("\n");
}

function buildWorkTaskPrompt(task: TaskRequest) {
  return [
    "<<SYS_TASK>>",
    `TYPE: ${task.type}`,
    `TASK_ID: ${task.taskId}`,
    `GOAL: ${task.goal}`,
    `INPUT_REF: ${task.inputRef}`,
    "INPUT:",
    task.inputSummary,
    "CONSTRAINTS:",
    buildConstraintSection(task),
    "<<END_SYS_TASK>>",
    "",
    "Return only this format:",
    "<<SYS_TASK_RESULT>>",
    `TASK_ID: ${task.taskId}`,
    `TYPE: ${task.type}`,
    "STATUS: OK | PARTIAL | NEEDS_MORE",
    "SUMMARY: ...",
    "KEY_POINTS:",
    "- ...",
    "DETAIL_BLOCKS:",
    "[BLOCK: ...]",
    "- ...",
    "WARNINGS:",
    "- ...",
    "MISSING_INFO:",
    "- ...",
    "NEXT_SUGGESTION:",
    "- ...",
    "<<END_SYS_TASK_RESULT>>",
  ].join("\n");
}

function buildPresentationPlanTaskPrompt(task: TaskRequest) {
  return [
    "<<SYS_PRESENTATION_PLAN_TASK>>",
    `TYPE: ${task.type}`,
    `TASK_ID: ${task.taskId}`,
    `GOAL: ${task.goal}`,
    `INPUT_REF: ${task.inputRef}`,
    "INPUT:",
    task.inputSummary,
    "CONSTRAINTS:",
    buildConstraintSection(task),
    "<<END_SYS_PRESENTATION_PLAN_TASK>>",
    "",
    "Return only one valid JSON object. Do not return markdown. Do not wrap it in ```.",
    "The JSON object must follow this exact top-level shape:",
    JSON.stringify({
      taskId: task.taskId,
      type: task.type,
      status: "OK",
      summary: "Natural-language summary of the presentation design.",
      extractedItems: ["Source fact that should inform the deck."],
      strategyItems: ["audience: ...", "purpose: ...", "tone: ...", "visual policy: ..."],
      keyMessages: ["Concrete message for a slide."],
      deckFrame: {
        slideCount: 5,
        masterFrameId: "titleLineFooter",
        background: "business-clean light background",
        pageNumber: {
          enabled: true,
          position: "bottomRight",
          style: "n / total",
          scope: "bodyOnly",
        },
        openingSlide: {
          enabled: true,
          frameId: "titleCover",
          title: "Deck title",
          subtitle: "Short deck promise or scope",
        },
        closingSlide: {
          enabled: true,
          frameId: "endSlide",
          title: "- END -",
          message: "Thank you",
        },
        logo: { enabled: false },
      },
      slideFrames: [
        {
          slideNumber: 1,
          title: "Slide title shown on the page",
          layoutFrameId: "visualLeftTextRight",
          speakerIntent: "What this slide should make the audience understand.",
          blocks: [
            {
              id: "block1",
              kind: "visual",
              styleId: "visualContain",
              visualRequest: {
                type: "diagram",
                brief: "Visual shown on the slide.",
                prompt: "Concrete generation or diagram prompt.",
                promptNote: "Use only when the prompt cannot be completed in this pass.",
                preferredImageId: "Use an Image ID from image-library candidates when one is a semantic fit.",
                labels: ["label A", "label B"],
              },
            },
            {
              id: "block2",
              kind: "textStack",
              styleId: "textStackTopLeft",
              heading: "Actual heading text",
              text: "Actual message text",
              items: ["Actual supporting point 1", "Actual supporting point 2"],
            },
          ],
        },
      ],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    }),
    "",
    "Rules:",
    "- Preserve source breadth first; the user will reduce density later.",
    "- extractedItems must be atomic facts: one process step, country group, risk, or initiative per item.",
    "- deckFrame holds deck-wide settings. Do not repeat common master, background, page number, logo, openingSlide, or closingSlide choices in every slide description.",
    "- openingSlide and closingSlide are optional deck bookends. Do not include them in slideFrames; slideFrames are body slides only.",
    "- If bookends are enabled, prefer pageNumber.scope = bodyOnly so the cover and END/summary slides remain unnumbered unless the user asks otherwise.",
    "- slideFrames should omit masterFrameId unless a slide intentionally overrides deckFrame.masterFrameId. The parser will inherit the deck master for normal slides.",
    "- slideFrames is the source of truth for every slide. Do not output slideDesign or free-form parts.",
    "- Frame package: masterFrameId = plain | titleLineFooter | logoHeaderFooter | fullBleedVisual. layoutFrameId = singleCenter | titleBody | leftRight50 | visualLeftTextRight | textLeftVisualRight | heroTopDetailsBottom | threeColumns | twoByTwoGrid.",
    "- Block styles: listCompact uses heading + items, not text. textStackTopLeft uses heading + text, with items only when needed. visualContain/visualCover use visualRequest only. headlineCenter uses one headline text. callout uses one emphasized text.",
    "- Match block count to layout: one-block layouts need 1 block, two-column layouts need 2, heroTopDetailsBottom and threeColumns need 3, twoByTwoGrid needs 4.",
    "- Text in heading, text, and items is actual PPTX display text. Do not replace it with counts or summaries.",
    "- visualRequest.prompt should contain the full visual prompt. If too complex to complete, leave prompt empty and explain the need in promptNote.",
    "- If image-library candidates are provided and one is a semantic fit, set visualRequest.preferredImageId to that Image ID.",
    "- Image-library selection is two-step: first decide semantic fit; after selecting an image, use Orientation, Size, and Aspect ratio as layout inputs. Do not reject a semantically fitting image because of aspect ratio alone.",
    "- Choose layoutFrameId/block placement so the selected image shape fits the visual area; do not default to a 50/50 split when the selected asset is clearly landscape, portrait, or square.",
    "- Choose slide count from the material and strategy. If the source naturally implies 5-7 slides, create 5-7 slideFrames.",
    "- Do not invent placeholder labels such as explanation, text, point, or example.",
    "- If slideFrames cannot be created, set status to NEEDS_MORE and explain the reason in missingInfo.",
  ].join("\n");
}

function buildPresentationDirectEditTaskPrompt(task: TaskRequest) {
  return [
    "<<SYS_PRESENTATION_DIRECT_EDIT_TASK>>",
    `TYPE: ${task.type}`,
    `TASK_ID: ${task.taskId}`,
    `GOAL: ${task.goal}`,
    `INPUT_REF: ${task.inputRef}`,
    "INPUT:",
    task.inputSummary,
    "CONSTRAINTS:",
    buildConstraintSection(task),
    "<<END_SYS_PRESENTATION_DIRECT_EDIT_TASK>>",
    "",
    "Return only one valid JSON object. Do not return markdown. Do not wrap it in ```.",
    "The JSON object must follow this top-level shape:",
    JSON.stringify({
      taskId: task.taskId,
      status: "OK",
      documentId: "ppt_...",
      edits: [
        {
          slideNumber: 1,
          blockNumber: 1,
          blockId: "block1",
          blockType: "text",
          blockKind: "textStack",
          instruction: "User-facing edit instruction for this block.",
          currentText: "Current block content.",
          proposedText: "Updated text for text blocks.",
          visualMode: "none",
          imageId: "",
          generationPrompt: "",
          visualBrief: "",
        },
      ],
      warnings: [],
      missingInfo: [],
    }),
    "",
    "Rules:",
    "- First identify the target address from the user's instruction and the provided slide/block list.",
    "- Use the actual block at that address to decide blockType: visual when the block kind is visual or it has visualRequest, otherwise text.",
    "- For text blocks, interpret the user's instruction and return proposedText as the full replacement text for the target block.",
    "- For list text blocks, proposedText may use one item per line.",
    "- Keep proposedText within the target block's layout capacity. If the user asks to subdivide, rewrite into concise phrases or bullets instead of adding a long explanation.",
    "- Do not preserve old body text or old bullet items unless they are intentionally part of the final replacement.",
    "- If the requested detail cannot fit in the current block, return the best concise replacement and add a warning.",
    "- For visual blocks, do not convert the request to a text edit.",
    "- For visual blocks with a user-specified Image ID, set visualMode to library_image and imageId to that ID.",
    "- For visual blocks without a specified Image ID, choose a semantically fitting image-library candidate when available and set visualMode to library_image.",
    "- For visual blocks where the user asks to create or generate a new image, set visualMode to generate_image and provide generationPrompt.",
    "- For visual blocks where only the visual direction should change, set visualMode to revise_prompt and provide visualBrief and generationPrompt when useful.",
    "- Do not edit unrelated blocks. Multiple edits are allowed only when the user targets multiple blocks.",
    "- If the target cannot be narrowed, return the best candidate edits with a warning instead of inventing unrelated changes.",
    "- Set status to NEEDS_MORE only when no actionable candidate can be formed.",
  ].join("\n");
}

export function buildTaskPrompt(task: TaskRequest): string {
  if (task.type === "FORMAT_TASK") return buildFormatTaskPrompt(task);
  if (task.outputFormat === "presentation_direct_edit") {
    return buildPresentationDirectEditTaskPrompt(task);
  }
  if (task.outputFormat === "presentation_plan") {
    return buildPresentationPlanTaskPrompt(task);
  }
  return buildWorkTaskPrompt(task);
}
