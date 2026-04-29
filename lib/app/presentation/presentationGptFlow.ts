import { generateId } from "@/lib/shared/uuid";
import { parsePptCommand } from "@/lib/app/presentation/presentationCommandParser";
import {
  buildPresentationLibraryPayload,
  buildPresentationStoredDocument,
  rebuildPresentationLibraryPayload,
  serializePresentationPayload,
} from "@/lib/app/presentation/presentationDocumentBuilders";
import {
  buildCreatePresentationSpecPrompt,
  buildPresentationCommandFailureMessage,
  buildPresentationDraftSavedMessage,
  buildPresentationRenderedMessage,
  buildPresentationRevisionSavedMessage,
  buildRepairPresentationRevisionSpecPrompt,
  buildRepairPresentationSpecPrompt,
  buildRevisePresentationSpecPrompt,
} from "@/lib/app/presentation/presentationGptPrompts";
import {
  parsePresentationPatchFromText,
  parsePresentationDraftFromText,
  parsePresentationSpecFromText,
} from "@/lib/app/presentation/presentationJsonParsing";
import { findPresentationPayloadByDocumentId } from "@/lib/app/presentation/presentationLibraryLookup";
import {
  applyPresentationPatchToSpec,
  buildFallbackPresentationRevisionPatch,
  buildPresentationReplacementPatch,
} from "@/lib/app/presentation/presentationPatchApply";
import { requestGptAssistantArtifacts } from "@/lib/app/send-to-gpt/sendToGptFlowRequest";
import {
  applySendToGptRequestStart,
} from "@/lib/app/send-to-gpt/sendToGptFlowState";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { ChatApiSearchLike } from "@/lib/app/send-to-gpt/sendToGptApiTypes";
import type { Message } from "@/types/chat";

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
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.documentId) {
    throw new Error("Document ID is required for PPTX rendering.");
  }

  const found = findPresentationPayloadByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (!found) {
    throw new Error(`Presentation document not found: ${args.documentId}`);
  }

  const normalizedSpec = parsePresentationSpecFromText(
    JSON.stringify(found.payload.spec)
  );
  const output = await renderPresentationPptx({
    documentId: args.documentId,
    spec: normalizedSpec,
  });
  const updatedPayload = rebuildPresentationLibraryPayload(found.payload, {
    spec: normalizedSpec,
    outputs: [...found.payload.outputs, output],
    status: "rendered",
  });

  args.flowArgs.updateStoredDocument(found.sourceId, {
    title: updatedPayload.spec.title,
    text: serializePresentationPayload(updatedPayload),
    summary: updatedPayload.summary,
  });

  appendPresentationAssistantMessage({
    flowArgs: args.flowArgs,
    text: buildPresentationRenderedMessage({
      documentId: args.documentId,
      title: updatedPayload.spec.title,
      slideCount: output.slideCount,
      outputPath: output.path || "",
      filename: output.filename,
    }),
  });
}

async function renderPresentationPptx(args: {
  documentId: string;
  spec: unknown;
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
      }),
    createdAt: data.output.createdAt || new Date().toISOString(),
    slideCount: data.output.slideCount || 0,
  };
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
  const { data, assistantText } = await requestPresentationJsonReply({
    assistantRequestArgs: args.assistantRequestArgs,
    finalRequestText: buildCreatePresentationSpecPrompt({
      userInstruction: args.commandBody,
    }),
  });
  applyPresentationChatUsage({ data, flowArgs: args.flowArgs });

  const draft = await parseOrRepairPresentationDraft({
    assistantText,
    userInstruction: args.commandBody,
    density: args.density,
    flowArgs: args.flowArgs,
    assistantRequestArgs: args.assistantRequestArgs,
  });
  const payload = buildPresentationLibraryPayload({
    spec: draft.spec,
    motherSpec: draft.motherSpec,
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

  const found = findPresentationPayloadByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (!found) {
    throw new Error(`Presentation document not found: ${args.documentId}`);
  }

  const { data, assistantText } = await requestPresentationJsonReply({
    assistantRequestArgs: args.assistantRequestArgs,
    finalRequestText: buildRevisePresentationSpecPrompt({
      userInstruction: args.commandBody,
      payload: found.payload,
      density: args.density,
    }),
  });
  applyPresentationChatUsage({ data, flowArgs: args.flowArgs });

  const patch = await parseOrRepairPresentationRevision({
    assistantText,
    userInstruction: args.commandBody,
    currentSpec: found.payload.spec,
    flowArgs: args.flowArgs,
    assistantRequestArgs: args.assistantRequestArgs,
  });
  const updatedSpec = applyPresentationPatchToSpec(found.payload.spec, patch);
  const output = await renderPresentationPptx({
    documentId: args.documentId,
    spec: updatedSpec,
  });
  const updatedPayload = rebuildPresentationLibraryPayload(found.payload, {
    spec: updatedSpec,
    patches: [...found.payload.patches, patch],
    outputs: [...found.payload.outputs, output],
    status: "rendered",
  });

  args.flowArgs.updateStoredDocument(found.sourceId, {
    title: updatedPayload.spec.title,
    text: serializePresentationPayload(updatedPayload),
    summary: updatedPayload.summary,
  });

  appendPresentationAssistantMessage({
    flowArgs: args.flowArgs,
    text: buildPresentationRevisionSavedMessage({
      documentId: args.documentId,
      payload: updatedPayload,
    }),
  });
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

async function parseOrRepairPresentationRevision(args: {
  assistantText: string;
  userInstruction: string;
  currentSpec: Parameters<typeof buildRepairPresentationRevisionSpecPrompt>[0]["currentSpec"];
  flowArgs: SendToGptFlowStepArgs;
  assistantRequestArgs: Parameters<typeof requestGptAssistantArtifacts>[0];
}) {
  try {
    const nextSpec = parsePresentationSpecFromText(args.assistantText);
    return buildPresentationReplacementPatch({
      currentSpec: args.currentSpec,
      nextSpec,
      description: "GPT returned a full PresentationSpec for this revision.",
    });
  } catch {
    try {
      return parsePresentationPatchFromText(args.assistantText);
    } catch {
      // Ask GPT to repair the revision as a full spec below.
    }
  }

  const { data, assistantText } = await requestPresentationJsonReply({
    assistantRequestArgs: args.assistantRequestArgs,
    finalRequestText: buildRepairPresentationRevisionSpecPrompt({
      originalUserInstruction: args.userInstruction,
      currentSpec: args.currentSpec,
      invalidResponse: args.assistantText,
    }),
  });
  applyPresentationChatUsage({ data, flowArgs: args.flowArgs });

  try {
    const nextSpec = parsePresentationSpecFromText(assistantText);
    return buildPresentationReplacementPatch({
      currentSpec: args.currentSpec,
      nextSpec,
      description: "GPT repair returned a full PresentationSpec for this revision.",
    });
  } catch {
    try {
      return parsePresentationPatchFromText(assistantText);
    } catch {
      return buildFallbackPresentationRevisionPatch({
        currentSpec: args.currentSpec,
        userInstruction: args.userInstruction,
      });
    }
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
  const found = findPresentationPayloadByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (!found) {
    return `Presentation document not found: ${args.documentId}`;
  }
  return [
    "Presentation preview.",
    "",
    `Document ID: ${args.documentId}`,
    `Title: ${found.payload.spec.title}`,
    `Slides: ${found.payload.spec.slides.length}`,
    `Density: ${found.payload.spec.density || "standard"}`,
    "",
    found.payload.previewText,
  ].join("\n");
}

function applyPresentationChatUsage(args: {
  data: ChatApiSearchLike;
  flowArgs: SendToGptFlowStepArgs;
}) {
  args.flowArgs.applyTaskUsage(args.data.usage);
}
