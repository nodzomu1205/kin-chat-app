import { generateId } from "@/lib/shared/uuid";
import { parsePptCommand } from "@/lib/app/presentation/presentationCommandParser";
import {
  buildFramePresentationSpecFromTaskPlan,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import { findPresentationPlanByDocumentId } from "@/lib/app/presentation/presentationPlanLibrary";
import { applyPresentationPlanInstruction } from "@/lib/app/presentation/presentationPlanRevision";
import {
  buildPresentationLibraryPayload,
  buildPresentationStoredDocument,
  rebuildPresentationLibraryPayload,
  serializePresentationPayload,
} from "@/lib/app/presentation/presentationDocumentBuilders";
import {
  buildCreateInformationInventoryPrompt,
  buildCreatePresentationStrategyPrompt,
  buildCreatePresentationSpecPrompt,
  buildPresentationCommandFailureMessage,
  buildPresentationDraftSavedMessage,
  buildPresentationRenderedMessage,
  buildRepairPresentationSpecPrompt,
} from "@/lib/app/presentation/presentationGptPrompts";
import {
  parsePresentationDraftFromText,
  parseInformationInventoryFromText,
  parsePresentationStrategyFromText,
} from "@/lib/app/presentation/presentationJsonParsing";
import { normalizeImageGenerationUsage } from "@/lib/app/image/imageDisplayText";
import { requestGptAssistantArtifacts } from "@/lib/app/send-to-gpt/sendToGptFlowRequest";
import {
  applySendToGptRequestStart,
} from "@/lib/app/send-to-gpt/sendToGptFlowState";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { ChatApiSearchLike } from "@/lib/app/send-to-gpt/sendToGptApiTypes";
import type { Message } from "@/types/chat";
import type { PresentationTaskSlideFrame } from "@/types/task";

export async function runPresentationGptCommandFlow(args: {
  rawText: string;
  flowArgs: SendToGptFlowStepArgs;
  assistantRequestArgs: Parameters<typeof requestGptAssistantArtifacts>[0];
}): Promise<boolean> {
  const command = parsePptCommand(args.rawText);
  if (!command.isPptCommand || !command.intent) return false;

  const userMessage: Message = {
    id: generateId(),
    role: "user",
    text: args.rawText,
  };
  applySendToGptRequestStart({
    userMessage,
    setGptMessages: args.flowArgs.setGptMessages,
    setGptInput: args.flowArgs.setGptInput,
    setGptLoading: args.flowArgs.setGptLoading,
  });

  try {
    if (command.intent === "createDraft") {
      await runCreatePresentationDraftFlow({
        commandBody: command.body,
        density: command.density,
        flowArgs: args.flowArgs,
        assistantRequestArgs: args.assistantRequestArgs,
      });
      return true;
    }

    if (command.intent === "reviseDraft") {
      await runRevisePresentationDraftFlow({
        commandBody: command.body,
        documentId: command.documentId,
        density: command.density,
        flowArgs: args.flowArgs,
        assistantRequestArgs: args.assistantRequestArgs,
      });
      return true;
    }

    if (command.intent === "renderPptx") {
      await runRenderPresentationPptxFlow({
        documentId: command.documentId,
        generateImages: command.generateImages,
        flowArgs: args.flowArgs,
      });
      return true;
    }

    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: command.documentId
        ? buildPresentationPreviewMessage({
            documentId: command.documentId,
            flowArgs: args.flowArgs,
          })
        : "Please include Document ID for this presentation command.",
    });
    return true;
  } catch (error) {
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: buildPresentationCommandFailureMessage({
        action: command.intent === "reviseDraft" ? "reviseDraft" : "createDraft",
        error,
      }),
    });
    return true;
  } finally {
    args.flowArgs.setGptLoading(false);
  }
}

async function runRenderPresentationPptxFlow(args: {
  documentId?: string;
  generateImages?: boolean;
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.documentId) {
    throw new Error("Document ID is required for PPTX rendering.");
  }

  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (foundPlan) {
    const frameSpec = buildFramePresentationSpecFromTaskPlan(foundPlan.plan);
    if (!frameSpec) {
      throw new Error(`Presentation plan is not renderable: ${args.documentId}`);
    }
    const output = await renderPresentationPptx({
      documentId: args.documentId,
      frameSpec,
      generateImages: args.generateImages,
    });
    applyGeneratedImageUsage({
      generatedImages: output.generatedImages,
      flowArgs: args.flowArgs,
    });
    const updatedPlan = {
      ...foundPlan.plan,
      slideFrames: Array.isArray(output.frameSpec?.slideFrames)
        ? output.frameSpec.slideFrames
        : foundPlan.plan.slideFrames,
      latestPptx: output,
      updatedAt: new Date().toISOString(),
    };
    args.flowArgs.updateStoredDocument(foundPlan.sourceId, {
      title: foundPlan.item.title,
      text: formatPresentationTaskPlanText(updatedPlan),
      structuredPayload: updatedPlan,
      summary: foundPlan.item.summary,
    });
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: buildPresentationRenderedMessage({
        documentId: args.documentId,
        title: updatedPlan.title,
        slideCount: output.slideCount,
        outputPath: output.path || "",
        filename: output.filename,
        generatedImages: output.generatedImages,
      }),
    });
    return;
  }

  throw new Error(`Presentation plan document not found: ${args.documentId}`);
}

async function renderPresentationPptx(args: {
  documentId: string;
  spec?: unknown;
  frameSpec?: unknown;
  generateImages?: boolean;
}) {
  const res = await fetch("/api/presentation-render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const data = (await res.json().catch(() => ({}))) as {
    output?: {
      id?: string;
      format?: "pptx";
      filename?: string;
      path?: string;
      contentBase64?: string;
      mimeType?: string;
      createdAt?: string;
      slideCount?: number;
      generatedImages?: Array<{
        imageId?: string;
        title?: string;
        prompt?: string;
        mimeType?: string;
        contentBase64?: string;
        usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
      }>;
      frameSpec?: {
        slideFrames?: PresentationTaskSlideFrame[];
      };
    };
    error?: unknown;
  };

  if (!res.ok || !data.output) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : "Presentation render failed."
    );
  }

  return {
    id: data.output.id || `pptx_${Date.now()}`,
    format: "pptx" as const,
    filename: data.output.filename || `${args.documentId}.pptx`,
    path:
      data.output.path ||
      createPresentationBlobUrl({
        contentBase64: data.output.contentBase64,
        mimeType: data.output.mimeType,
      }) ||
      "",
    createdAt: data.output.createdAt || new Date().toISOString(),
    slideCount: data.output.slideCount || 0,
    generatedImages: (data.output.generatedImages || []).map((image) => ({
      imageId: image.imageId || "",
      title: image.title || "",
      prompt: image.prompt || "",
      path: createPresentationBlobUrl({
        contentBase64: image.contentBase64,
        mimeType: image.mimeType,
      }) || "",
      usage: image.usage,
    })),
    frameSpec: data.output.frameSpec,
  };
}

function applyGeneratedImageUsage(args: {
  generatedImages?: Array<{
    usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
  }>;
  flowArgs: SendToGptFlowStepArgs;
}) {
  for (const image of args.generatedImages || []) {
    const usage = normalizeImageGenerationUsage(image.usage);
    if (usage) args.flowArgs.applyImageUsage?.(usage);
  }
}

function createPresentationBlobUrl(args: {
  contentBase64?: string;
  mimeType?: string;
}) {
  if (!args.contentBase64 || typeof window === "undefined") return undefined;

  const binary = window.atob(args.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(
    new Blob([bytes], {
      type:
        args.mimeType ||
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
  );
}

async function runCreatePresentationDraftFlow(args: {
  commandBody: string;
  density?: NonNullable<ReturnType<typeof parsePptCommand>["density"]>;
  flowArgs: SendToGptFlowStepArgs;
  assistantRequestArgs: Parameters<typeof requestGptAssistantArtifacts>[0];
}) {
  const inventoryReply = await requestPresentationJsonReply({
    assistantRequestArgs: args.assistantRequestArgs,
    finalRequestText: buildCreateInformationInventoryPrompt({
      userInstruction: args.commandBody,
    }),
  });
  applyPresentationChatUsage({ data: inventoryReply.data, flowArgs: args.flowArgs });

  const informationInventory = parseInformationInventoryFromText(
    inventoryReply.assistantText
  );

  const strategyReply = await requestPresentationJsonReply({
    assistantRequestArgs: args.assistantRequestArgs,
    finalRequestText: buildCreatePresentationStrategyPrompt({
      userInstruction: args.commandBody,
      inventory: informationInventory,
      density: args.density,
    }),
  });
  applyPresentationChatUsage({ data: strategyReply.data, flowArgs: args.flowArgs });

  const presentationStrategy = parsePresentationStrategyFromText(
    strategyReply.assistantText,
    {
      renderDensity: args.density,
    }
  );

  const specReply = await requestPresentationJsonReply({
    assistantRequestArgs: args.assistantRequestArgs,
    finalRequestText: buildCreatePresentationSpecPrompt({
      userInstruction: args.commandBody,
      inventory: informationInventory,
      strategy: presentationStrategy,
    }),
  });
  applyPresentationChatUsage({ data: specReply.data, flowArgs: args.flowArgs });

  const draft = await parseOrRepairPresentationDraft({
    assistantText: specReply.assistantText,
    userInstruction: args.commandBody,
    density: args.density,
    flowArgs: args.flowArgs,
    assistantRequestArgs: args.assistantRequestArgs,
  });
  const payload = buildPresentationLibraryPayload({
    spec: draft.spec,
    motherSpec: draft.motherSpec,
    informationInventory,
    presentationStrategy,
  });
  const storedDocument = args.flowArgs.recordIngestedDocument(
    buildPresentationStoredDocument({ payload })
  );

  appendPresentationAssistantMessage({
    flowArgs: args.flowArgs,
    text: buildPresentationDraftSavedMessage({
      documentId: payload.documentId,
      spec: draft.spec,
      previewText: payload.previewText,
      inventoryFactGroupCount: informationInventory.factGroups.length,
      inventoryFactCount: informationInventory.rawFacts.length,
      strategySummary: `${presentationStrategy.slideCountRange.target} target slides / ${presentationStrategy.visualPolicy.overallUse} visuals / ${presentationStrategy.structurePolicy.preferredFlow}`,
    }),
  });

  return storedDocument;
}

async function runRevisePresentationDraftFlow(args: {
  commandBody: string;
  documentId?: string;
  density?: NonNullable<ReturnType<typeof parsePptCommand>["density"]>;
  flowArgs: SendToGptFlowStepArgs;
  assistantRequestArgs: Parameters<typeof requestGptAssistantArtifacts>[0];
}) {
  if (!args.documentId) {
    throw new Error("Document ID is required for presentation revisions.");
  }

  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (foundPlan) {
    const revision = applyPresentationPlanInstruction(foundPlan.plan, args.commandBody);
    if (!revision.changed) {
      throw new Error("No supported presentation plan edit was detected in the instruction.");
    }
    args.flowArgs.updateStoredDocument(foundPlan.sourceId, {
      title: foundPlan.item.title,
      text: formatPresentationTaskPlanText(revision.plan),
      structuredPayload: revision.plan,
      summary: foundPlan.item.summary,
    });
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: [
        "PPT design plan updated.",
        "",
        `Document ID: ${args.documentId}`,
        `Title: ${revision.plan.title}`,
        ...revision.notes.map((note) => `- ${note}`),
      ].join("\n"),
    });
    return;
  }

  throw new Error(`Presentation plan document not found: ${args.documentId}`);
}

async function parseOrRepairPresentationDraft(args: {
  assistantText: string;
  userInstruction: string;
  density?: NonNullable<ReturnType<typeof parsePptCommand>["density"]>;
  flowArgs: SendToGptFlowStepArgs;
  assistantRequestArgs: Parameters<typeof requestGptAssistantArtifacts>[0];
}) {
  try {
    return parsePresentationDraftFromText(args.assistantText, {
      renderDensity: args.density || "standard",
    });
  } catch {
    const { data, assistantText } = await requestPresentationJsonReply({
      assistantRequestArgs: args.assistantRequestArgs,
      finalRequestText: buildRepairPresentationSpecPrompt({
        originalUserInstruction: args.userInstruction,
        invalidResponse: args.assistantText,
      }),
    });
    applyPresentationChatUsage({ data, flowArgs: args.flowArgs });
    return parsePresentationDraftFromText(assistantText, {
      renderDensity: args.density || "standard",
    });
  }
}

async function requestPresentationJsonReply(args: {
  assistantRequestArgs: Parameters<typeof requestGptAssistantArtifacts>[0];
  finalRequestText: string;
}): Promise<{
  data: ChatApiSearchLike;
  assistantText: string;
}> {
  const requestArgs = args.assistantRequestArgs;
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "chat",
      memory: requestArgs.requestMemory,
      recentMessages: Array.isArray(requestArgs.recentMessages)
        ? requestArgs.recentMessages
        : [],
      input: args.finalRequestText,
      storedSearchContext: "",
      storedDocumentContext: requestArgs.storedDocumentContext || "",
      storedLibraryContext: requestArgs.storedLibraryContext || "",
      searchMode: "normal",
      searchEngines: [],
      searchLocation: requestArgs.effectiveSearchLocation || "",
      generateSearchSummary: false,
      instructionMode: "normal",
      reasoningMode: requestArgs.reasoningMode,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as ChatApiSearchLike & {
    error?: unknown;
  };

  if (!res.ok) {
    const message =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : `Presentation GPT request failed (${res.status} ${res.statusText || "unknown"})`;
    throw new Error(message);
  }

  return {
    data,
    assistantText: data.reply || "",
  };
}

function appendPresentationAssistantMessage(args: {
  flowArgs: SendToGptFlowStepArgs;
  text: string;
}) {
  args.flowArgs.setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text: args.text,
    },
  ]);
}

function buildPresentationPreviewMessage(args: {
  documentId: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (foundPlan) {
    return [
      "Presentation design preview.",
      "",
      `Document ID: ${args.documentId}`,
      `Title: ${foundPlan.plan.title}`,
      `Slides: ${foundPlan.plan.slideFrames.length || foundPlan.plan.slides.length}`,
      "",
      formatPresentationTaskPlanText(foundPlan.plan),
    ].join("\n");
  }

  return `Presentation plan document not found: ${args.documentId}`;
}

function applyPresentationChatUsage(args: {
  data: ChatApiSearchLike;
  flowArgs: SendToGptFlowStepArgs;
}) {
  args.flowArgs.applyTaskUsage(args.data.usage);
}
