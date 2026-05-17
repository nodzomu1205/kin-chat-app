import { generateId } from "@/lib/shared/uuid";
import {
  buildMergedTaskInput,
  formatTaskResultText,
  runAutoPrepTask,
} from "@/lib/app/gpt-task/gptTaskClient";
import {
  ensureTaskSnapshotDocumentText,
  extractTaskSnapshotDocumentIdFromText,
  resolveTaskSnapshotDocumentId,
  stripTaskSnapshotTitlePrefix,
} from "@/lib/app/task-draft/taskSnapshotDocument";
import { applySendToGptRequestStart } from "@/lib/app/send-to-gpt/sendToGptFlowState";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { Message, ReferenceLibraryItem } from "@/types/chat";

const SAVED_DOCUMENT_EDIT_PREFIX = /^\s*\/(?:task|edit)?(?:\s|$)/i;
const DOCUMENT_ID_PATTERN = /^\s*Document ID\s*:\s*([A-Za-z0-9_.:_-]+)/im;

type SavedDocumentEditCommand = {
  isCommand: boolean;
  documentId?: string;
  body: string;
};

export function parseSavedDocumentEditCommand(text: string): SavedDocumentEditCommand {
  if (!SAVED_DOCUMENT_EDIT_PREFIX.test(text)) {
    return {
      isCommand: false,
      body: text,
    };
  }
  const withoutPrefix = text
    .replace(SAVED_DOCUMENT_EDIT_PREFIX, "")
    .replace(/^\s*\r?\n?/, "")
    .trim();
  const documentId = withoutPrefix.match(DOCUMENT_ID_PATTERN)?.[1]?.trim();
  const body = withoutPrefix.replace(DOCUMENT_ID_PATTERN, "").trim();

  return {
    isCommand: Boolean(documentId && body),
    documentId,
    body,
  };
}

export async function runSavedDocumentEditFlow(args: {
  rawText: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  const command = parseSavedDocumentEditCommand(args.rawText);
  if (!command.isCommand || !command.documentId) return false;

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
    const foundDocument = findEditableLibraryDocument({
      documentId: command.documentId,
      referenceLibraryItems: args.flowArgs.referenceLibraryItems,
    });
    if (!foundDocument) {
      appendSavedDocumentEditMessage({
        flowArgs: args.flowArgs,
        text: `Editable library document not found: ${command.documentId}`,
      });
      return true;
    }
    if (foundDocument.item.artifactType === "presentation_plan") {
      appendSavedDocumentEditMessage({
        flowArgs: args.flowArgs,
        text: [
          "This is a PPT design document. Use /ppt for presentation edits.",
          "",
          `/ppt\nDocument ID: ${command.documentId}\n${command.body}`,
        ].join("\n"),
      });
      return true;
    }
    if (
      foundDocument.item.artifactType === "generated_image" ||
      foundDocument.item.artifactType === "presentation"
    ) {
      appendSavedDocumentEditMessage({
        flowArgs: args.flowArgs,
        text: `This library item cannot be edited as a task document: ${command.documentId}`,
      });
      return true;
    }

    const normalizedTitle = stripTaskSnapshotTitlePrefix(foundDocument.item.title) ||
      foundDocument.item.title;
    const input = buildMergedTaskInput(
      foundDocument.item.excerptText,
      `Saved library document ${command.documentId} update`,
      command.body,
      {
        title: normalizedTitle,
        userInstruction: command.body,
        libraryReferenceContext: args.flowArgs.buildLibraryReferenceContext?.(),
      }
    );
    const data = await runAutoPrepTask(input, "saved-library-document-update");
    const updatedBody = formatTaskResultText(data?.parsed, data?.raw);
    const updatedText = ensureTaskSnapshotDocumentText({
      text: updatedBody,
      documentId: foundDocument.documentId,
    });
    const structuredPayload = {
      version: "0.1-task-snapshot" as const,
      documentId: foundDocument.documentId,
      title: normalizedTitle,
      mode: "normal" as const,
    };

    args.flowArgs.updateStoredDocument(foundDocument.sourceId, {
      title: normalizedTitle,
      text: updatedText,
      structuredPayload,
      summary: foundDocument.item.summary,
    });
    args.flowArgs.applyTaskUsage?.(data?.usage);
    appendSavedDocumentEditMessage({
      flowArgs: args.flowArgs,
      text: [
        "Saved task document updated in the library.",
        "",
        updatedText,
      ].join("\n"),
    });
    return true;
  } catch (error) {
    appendSavedDocumentEditMessage({
      flowArgs: args.flowArgs,
      text:
        error instanceof Error
          ? `Saved document update failed: ${error.message}`
          : "Saved document update failed.",
    });
    return true;
  } finally {
    args.flowArgs.setGptLoading(false);
  }
}

function findEditableLibraryDocument(args: {
  documentId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
}) {
  const requested = args.documentId.trim();
  for (const item of args.referenceLibraryItems) {
    const payloadDocumentId =
      resolveTaskSnapshotDocumentId(item.structuredPayload) ||
      extractPresentationDocumentId(item.structuredPayload);
    const textDocumentId =
      item.artifactType === "task_snapshot"
        ? extractTaskSnapshotDocumentIdFromText(item.excerptText)
        : "";
    const subtitleDocumentId =
      item.subtitle.match(/Document ID\s*:\s*([A-Za-z0-9_.:_-]+)/i)?.[1]?.trim() || "";
    const documentId = payloadDocumentId || textDocumentId || subtitleDocumentId;
    if (
      requested !== item.sourceId &&
      requested !== item.id &&
      requested !== documentId
    ) {
      continue;
    }
    return {
      item,
      sourceId: item.sourceId,
      documentId: documentId || requested,
    };
  }
  return null;
}

function extractPresentationDocumentId(value: unknown) {
  return value &&
    typeof value === "object" &&
    (value as { version?: unknown }).version === "0.1-presentation-task-plan" &&
    typeof (value as { documentId?: unknown }).documentId === "string"
    ? (value as { documentId: string }).documentId.trim()
    : "";
}

function appendSavedDocumentEditMessage(args: {
  flowArgs: SendToGptFlowStepArgs;
  text: string;
}) {
  const message: Message = {
    id: generateId(),
    role: "gpt",
    text: args.text,
    meta: {
      kind: "task_info",
      sourceType: "manual",
    },
  };
  args.flowArgs.setGptMessages((prev) => [...prev, message]);
  const currentRecent = args.flowArgs.gptStateRef.current.recentMessages || [];
  const recentLimit = args.flowArgs.chatRecentLimit || 20;
  args.flowArgs.gptStateRef.current = {
    ...args.flowArgs.gptStateRef.current,
    recentMessages: [...currentRecent, message].slice(-recentLimit),
  };
}
