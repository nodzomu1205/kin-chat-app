import type { UsageSummary } from "@/lib/server/chatgpt/openaiResponse";
import { buildTaskPrompt } from "@/lib/task/taskProtocol";
import type { TaskResult, TaskRequest } from "@/types/task";

export const TASK_ROUTE_MODEL = "gpt-4.1-mini";

export function buildTaskResponsesRequest(task: TaskRequest) {
  return {
    model: TASK_ROUTE_MODEL,
    input: buildTaskPrompt(task),
    ...(task.outputFormat === "presentation_plan"
      ? { text: { format: buildPresentationPlanJsonSchemaFormat() } }
      : {}),
  };
}

export function buildTaskCompletionResponsesRequest(args: {
  task: TaskRequest;
  previousRaw: string;
  expectedBodySlideCount: number;
  actualBodySlideCount: number;
  issues?: string[];
}) {
  const base = buildTaskResponsesRequest(args.task);
  if (args.task.outputFormat !== "presentation_plan") return base;
  const issues = args.issues?.length
    ? args.issues.map((issue) => `- ${issue}`)
    : [
        `- Expected body slideFrames count from its own keyMessages/deckFrame: ${args.expectedBodySlideCount}.`,
        `- Actual body slideFrames count: ${args.actualBodySlideCount}.`,
      ];
  return {
    ...base,
    input: [
      base.input,
      "",
      "The previous JSON was structurally incomplete.",
      "Detected issues:",
      ...issues,
      "Complete the same presentation plan JSON so slideFrames includes every body slide implied by keyMessages and deckFrame.slideCount, and every slideFrame has usable blocks for its declared role/layout.",
      "For textMain/adaptiveTextMain slides, include at least one non-visual text/list/callout block with non-empty text or items.",
      "For visualMain/adaptiveVisualMain slides, include at least one visual block with a non-empty visualRequest brief, prompt, or visualSlots.",
      "Keep extractedItems, strategyItems, and keyMessages unless they contain an obvious parsing error.",
      "Do not reduce source coverage to make the plan shorter.",
      "Do not add opening or closing bookends into slideFrames.",
      "Return only one corrected valid JSON object.",
      "",
      "Previous JSON:",
      args.previousRaw,
    ].join("\n"),
  };
}

export function validatePresentationPlanCompleteness(args: {
  task: TaskRequest;
  parsed: TaskResult | null;
}) {
  if (args.task.outputFormat !== "presentation_plan") return null;
  const bodySlideCount = countParsedPresentationSlideFrames(args.parsed);
  const keyMessageCount = countParsedPresentationKeyMessages(args.parsed);
  const declaredBodySlideCount = countParsedPresentationDeckSlides(args.parsed);
  const expectedBodySlideCount = Math.max(
    keyMessageCount,
    declaredBodySlideCount
  );
  const issues: string[] = [];
  if (expectedBodySlideCount > 1 && bodySlideCount < expectedBodySlideCount) {
    issues.push(
      `Expected ${expectedBodySlideCount} body slideFrame(s), but found ${bodySlideCount}.`
    );
  }
  issues.push(...findPresentationPlanBlockIssues(args.parsed));
  if (issues.length === 0) {
    return null;
  }
  return {
    actualBodySlideCount: bodySlideCount,
    expectedBodySlideCount,
    issues,
    message: `presentation_plan slideFrames is incomplete: ${issues.join(" ")}`,
  };
}

export function completePresentationPlanSlideFrames(raw: string) {
  const jsonText = extractJsonObjectText(raw);
  if (!jsonText) return raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return raw;
  }

  const root = objectValue(parsed);
  if (!root) return raw;
  const planRoot = resolvePresentationPlanRoot(root);
  const slideFrames = arrayValue(planRoot.slideFrames);
  if (slideFrames.length === 0) return raw;

  const keyMessages = stringArray(planRoot.keyMessages ?? root.keyMessages);
  const extractedItems = stringArray(planRoot.extractedItems ?? root.extractedItems);
  const deckFrame = objectValue(planRoot.deckFrame) || objectValue(root.deckFrame);
  const declaredCount =
    typeof deckFrame?.slideCount === "number" && Number.isFinite(deckFrame.slideCount)
      ? Math.max(0, Math.floor(deckFrame.slideCount))
      : 0;
  const expectedCount = Math.max(keyMessages.length, declaredCount);
  if (expectedCount <= 1 || slideFrames.length >= expectedCount) return raw;

  const normalizedExisting = slideFrames
    .filter((frame): frame is Record<string, unknown> => !!objectValue(frame))
    .map((frame, index) => ({
      ...frame,
      slideNumber: index + 1,
    }));
  const completedFrames = [...normalizedExisting];
  for (let index = completedFrames.length; index < expectedCount; index += 1) {
    completedFrames.push(buildCompletionSlideFrame({
      index,
      expectedCount,
      keyMessage: keyMessages[index] || extractedItems[index] || `Slide ${index + 1}`,
      extractedItems,
    }));
  }

  planRoot.slideFrames = completedFrames;
  const nextDeckFrame = objectValue(planRoot.deckFrame);
  if (nextDeckFrame) nextDeckFrame.slideCount = completedFrames.length;

  return JSON.stringify(root, null, 2);
}

function buildCompletionSlideFrame(args: {
  index: number;
  expectedCount: number;
  keyMessage: string;
  extractedItems: string[];
}) {
  const title = conciseSlideTitle(args.keyMessage, args.index + 1);
  return {
    slideNumber: args.index + 1,
    title,
    slideRole: "textMain",
    layoutFrameId: "adaptiveTextMain",
    blocks: [
      {
        id: "block1",
        kind: "list",
        styleId: "listCompact",
        heading: title,
        items: completionSlideItems({
          keyMessage: args.keyMessage,
          extractedItems: args.extractedItems,
          index: args.index,
          expectedCount: args.expectedCount,
        }),
      },
    ],
  };
}

function completionSlideItems(args: {
  keyMessage: string;
  extractedItems: string[];
  index: number;
  expectedCount: number;
}) {
  const related = args.extractedItems.filter((item) =>
    relevanceScore(item, args.keyMessage) >= 4
  );
  if (related.length > 0) return related.slice(0, 4);

  const bucketSize = Math.max(1, Math.ceil(args.extractedItems.length / args.expectedCount));
  const bucket = args.extractedItems.slice(
    args.index * bucketSize,
    args.index * bucketSize + bucketSize
  );
  return bucket.length > 0 ? bucket.slice(0, 4) : [args.keyMessage];
}

function conciseSlideTitle(value: string, slideNumber: number) {
  const text = value
    .replace(/^[-*\d.\s]+/, "")
    .replace(/[。．.!！?？].*$/, "")
    .trim();
  if (!text) return `Slide ${slideNumber}`;
  const chars = Array.from(text);
  return chars.length > 28 ? chars.slice(0, 28).join("") : text;
}

function relevanceScore(fact: string, query: string) {
  const queryChars = normalizedChars(query);
  if (queryChars.length === 0) return 0;
  const factText = fact.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return queryChars.reduce(
    (score, char) => score + (factText.includes(char) ? 1 : 0),
    0
  );
}

function normalizedChars(value: string) {
  return Array.from(
    new Set(value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").split(""))
  );
}

function extractJsonObjectText(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return trimmed.slice(start, end + 1);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function hasPresentationPlanFields(value: Record<string, unknown>) {
  return (
    Array.isArray(value.slideFrames) ||
    Array.isArray(value.slides) ||
    !!objectValue(value.slideDesign) ||
    !!objectValue(value.deckFrame) ||
    !!objectValue(value.slideFrameDocument) ||
    !!objectValue(value.frameDocument)
  );
}

function resolvePresentationPlanRoot(value: Record<string, unknown>) {
  if (hasPresentationPlanFields(value)) return value;

  for (const key of ["presentationPlan", "presentation", "plan", "result", "deck"]) {
    const candidate = objectValue(value[key]);
    if (candidate && hasPresentationPlanFields(candidate)) return candidate;
  }

  return value;
}

function buildPresentationPlanJsonSchemaFormat() {
  return {
    type: "json_schema",
    name: "presentation_plan",
    strict: false,
    schema: {
      type: "object",
      additionalProperties: true,
      required: [
        "taskId",
        "type",
        "status",
        "summary",
        "extractedItems",
        "strategyItems",
        "keyMessages",
        "deckFrame",
        "slideFrames",
        "warnings",
        "missingInfo",
        "nextSuggestion",
      ],
      properties: {
        taskId: { type: "string" },
        type: { type: "string", enum: ["PREP_TASK", "DEEPEN_TASK", "FORMAT_TASK"] },
        status: { type: "string", enum: ["OK", "PARTIAL", "NEEDS_MORE"] },
        summary: { type: "string" },
        extractedItems: { type: "array", items: { type: "string" } },
        strategyItems: { type: "array", items: { type: "string" } },
        keyMessages: { type: "array", items: { type: "string" } },
        deckFrame: {
          type: "object",
          additionalProperties: true,
          properties: {
            slideCount: { type: "integer", minimum: 1 },
            masterFrameId: {
              type: "string",
              enum: ["plain", "titleLineFooter", "logoHeaderFooter", "fullBleedVisual"],
            },
          },
        },
        slideFrames: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: true,
            required: ["slideNumber", "title", "layoutFrameId", "blocks"],
            properties: {
              slideNumber: { type: "integer", minimum: 1 },
              title: { type: "string" },
              layoutFrameId: {
                type: "string",
                enum: [
                  "singleCenter",
                  "titleBody",
                  "leftRight50",
                  "visualLeftTextRight",
                  "textLeftVisualRight",
                  "heroTopDetailsBottom",
                  "threeColumns",
                  "twoByTwoGrid",
                  "adaptiveVisualMain",
                  "adaptiveTextMain",
                ],
              },
              slideRole: { type: "string", enum: ["visualMain", "textMain"] },
              blocks: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: true,
                  required: ["id", "kind", "styleId"],
                  properties: {
                    id: { type: "string" },
                    kind: {
                      type: "string",
                      enum: ["textStack", "visual", "list", "callout"],
                    },
                    styleId: {
                      type: "string",
                      enum: [
                        "headlineCenter",
                        "textStackTopLeft",
                        "listCompact",
                        "visualContain",
                        "visualCover",
                        "callout",
                      ],
                    },
                    heading: { type: "string" },
                    text: { type: "string" },
                    items: {
                      type: "array",
                      minItems: 1,
                      items: { type: "string" },
                    },
                    visualRequest: {
                      type: "object",
                      additionalProperties: true,
                      properties: {
                        type: { type: "string" },
                        brief: { type: "string" },
                        prompt: { type: "string" },
                        promptNote: { type: "string" },
                        visualSlots: {
                          type: "array",
                          minItems: 1,
                          items: {
                            type: "object",
                            additionalProperties: true,
                            properties: {
                              slotId: { type: "string" },
                              label: { type: "string" },
                              need: { type: "string" },
                              keywords: {
                                type: "array",
                                items: { type: "string" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        warnings: { type: "array", items: { type: "string" } },
        missingInfo: { type: "array", items: { type: "string" } },
        nextSuggestion: { type: "array", items: { type: "string" } },
      },
    },
  };
}

function countParsedPresentationSlideFrames(parsed: TaskResult | null) {
  const document = parseParsedPresentationSlideFrameDocument(parsed);
  return Array.isArray(document?.slideFrames) ? document.slideFrames.length : 0;
}

function countParsedPresentationKeyMessages(parsed: TaskResult | null) {
  const block = parsed?.detailBlocks.find((item) => {
    const title = item.title.toLowerCase();
    return title.includes("key message") || title.includes("キーメッセージ");
  });
  return block?.body.length || 0;
}

function countParsedPresentationDeckSlides(parsed: TaskResult | null) {
  const document = parseParsedPresentationSlideFrameDocument(parsed);
  const slideCount = document?.deckFrame?.slideCount;
  return typeof slideCount === "number" &&
    Number.isInteger(slideCount) &&
    slideCount > 0
    ? slideCount
    : 0;
}

function findPresentationPlanBlockIssues(parsed: TaskResult | null) {
  const document = parseParsedPresentationSlideFrameDocument(parsed);
  const frames = Array.isArray(document?.slideFrames) ? document.slideFrames : [];
  const issues: string[] = [];

  frames.forEach((frame, index) => {
    const candidate = objectValue(frame);
    if (!candidate) {
      issues.push(`Slide ${index + 1} is not a valid slideFrame object.`);
      return;
    }
    const slideLabel = `Slide ${positiveInteger(candidate.slideNumber) || index + 1}`;
    const blocks = arrayValue(candidate.blocks);
    if (blocks.length === 0) {
      issues.push(`${slideLabel} has no blocks.`);
      return;
    }
    const layoutFrameId = stringValue(candidate.layoutFrameId);
    const slideRole = stringValue(candidate.slideRole);
    const textMain =
      slideRole === "textMain" ||
      layoutFrameId === "adaptiveTextMain" ||
      layoutFrameId === "titleBody" ||
      layoutFrameId === "textLeftVisualRight";
    const visualMain =
      slideRole === "visualMain" || layoutFrameId === "adaptiveVisualMain";
    const hasUsableText = blocks.some(hasUsablePresentationTextBlock);
    const hasUsableVisual = blocks.some(hasUsablePresentationVisualBlock);

    if (textMain && !hasUsableText) {
      issues.push(`${slideLabel} is ${layoutFrameId || slideRole || "textMain"} but has no usable text/list/callout block.`);
    }
    if (visualMain && !hasUsableVisual) {
      issues.push(`${slideLabel} is ${layoutFrameId || slideRole || "visualMain"} but has no usable visualRequest.`);
    }
  });

  return issues;
}

function hasUsablePresentationTextBlock(value: unknown) {
  const block = objectValue(value);
  if (!block || hasUsablePresentationVisualBlock(block)) return false;
  const kind = stringValue(block.kind);
  if (kind === "visual") return false;
  return stringValue(block.text).length > 0 || stringArray(block.items).length > 0;
}

function hasUsablePresentationVisualBlock(value: unknown) {
  const block = objectValue(value);
  if (!block) return false;
  const visualRequest = objectValue(block.visualRequest);
  if (!visualRequest) return false;
  return (
    stringValue(visualRequest.brief).length > 0 ||
    stringValue(visualRequest.prompt).length > 0 ||
    stringValue(visualRequest.promptNote).length > 0 ||
    hasUsableVisualSlots(visualRequest.visualSlots)
  );
}

function hasUsableVisualSlots(value: unknown) {
  return arrayValue(value).some((slot) => {
    const candidate = objectValue(slot);
    return (
      !!candidate &&
      (stringValue(candidate.label).length > 0 ||
        stringValue(candidate.need).length > 0 ||
        stringArray(candidate.keywords).length > 0)
    );
  });
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function parseParsedPresentationSlideFrameDocument(parsed: TaskResult | null) {
  const block = parsed?.detailBlocks.find((item) =>
    item.title.toLowerCase().includes("slide frame json")
  );
  const raw = block?.body[0];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      deckFrame?: { slideCount?: number };
      slideFrames?: unknown[];
    };
  } catch {
    return null;
  }
}

export function buildTaskRouteResponse(args: {
  raw: string;
  parsed: TaskResult | null;
  usage: UsageSummary;
}) {
  return {
    raw: args.raw,
    parsed: args.parsed,
    usage: args.usage,
  };
}
