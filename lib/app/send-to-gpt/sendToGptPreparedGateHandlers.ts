import type { Dispatch, SetStateAction } from "react";
import { handleYoutubeTranscriptFlow } from "@/lib/app/send-to-gpt/sendToGptYoutubeFlow";
import { generateId } from "@/lib/shared/uuid";
import { normalizeUsage, type ConversationUsageOptions } from "@/lib/shared/tokenStats";
import type { Message } from "@/types/chat";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import type { TaskCharConstraint } from "@/lib/app/multipart/multipartAssemblyFlow";
import type { TaskProtocolEvent } from "@/types/taskProtocol";
import type { ProtocolTaskEventLike } from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import {
  extractDraftDocumentFromMessages,
  resolveDraftDocumentId,
} from "@/lib/app/send-to-gpt/draftDocumentResolver";
import {
  validateMultipartAssemblyText,
} from "@/lib/app/multipart/multipartAssemblyFlow";
import {
  requestGeneratedLibrarySummary,
  normalizeLibrarySummaryUsage,
} from "@/lib/app/reference-library/librarySummaryClient";
import {
  buildPresentationTaskPlan,
  buildPresentationTaskStructuredInput,
  formatPresentationTaskPlanText,
  formatPresentationTaskResultText,
  buildPresentationTaskPlanFromText,
  resolvePresentationTaskTitle,
} from "@/lib/app/presentation/presentationTaskPlanning";
import {
  buildPresentationImageLibraryContext,
  getPresentationImageLibraryCandidates,
} from "@/lib/app/presentation/presentationImageLibrary";
import { runAutoPrepPresentationTask } from "@/lib/app/gpt-task/gptTaskClient";
import type { ReferenceLibraryItem } from "@/types/chat";

export function handleTaskDirectiveOnlyGate(args: {
  isTaskDirectiveOnly: boolean;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  taskDirectiveOnlyResponseText: string;
}) {
  if (!args.isTaskDirectiveOnly) return false;

  args.setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text: args.taskDirectiveOnlyResponseText,
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    },
  ]);
  args.setGptInput("");
  return true;
}

export function handleProtocolLimitViolationGate(args: {
  limitViolation: string | null;
  userMsg: Message;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
}) {
  if (!args.limitViolation) return false;
  const violationText = args.limitViolation;

  args.setGptMessages((prev) => [
    ...prev,
    args.userMsg,
    {
      id: generateId(),
      role: "gpt",
      text: violationText,
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    },
  ]);
  args.setGptInput("");
  return true;
}

export async function handleYoutubeTranscriptGate(args: {
  youtubeTranscriptRequestEvent?: TaskProtocolEvent & { url?: string };
  userMsg: Message;
  currentTaskId: string | null;
  onHandleYoutubeTranscriptRequest?: (params: {
    userMessage: Message;
    youtubeTranscriptRequestEvent: TaskProtocolEvent;
    currentTaskId: string | null;
  }) => Promise<boolean>;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  setKinInput: Dispatch<SetStateAction<string>>;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setPendingKinInjectionPurpose?: Dispatch<
    SetStateAction<PendingKinInjectionPurpose>
  >;
  setActiveTabToKin?: () => void;
  recordIngestedDocument: (document: {
    artifactType?: import("@/types/chat").StoredDocument["artifactType"];
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
    structuredPayload?: import("@/types/chat").StoredDocument["structuredPayload"];
    createdAt: string;
    updatedAt: string;
  }) => { id: string };
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  gptStateRef: { current: { recentMessages?: Message[]; memory?: unknown } };
  chatRecentLimit: number;
  handleGptMemory: (
    recent: Message[],
    options?: Record<string, unknown>
  ) => Promise<{ compressionUsage?: unknown; fallbackUsage?: unknown }>;
  applyChatUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
  applyCompressionUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applyIngestUsage?: (usage: Parameters<typeof normalizeUsage>[0]) => void;
}) {
  if (!args.youtubeTranscriptRequestEvent?.url?.trim()) return false;

  await handleYoutubeTranscriptFlow({
    userMsg: args.userMsg,
    youtubeTranscriptRequestEvent: args.youtubeTranscriptRequestEvent,
    currentTaskId: args.currentTaskId,
    onHandleYoutubeTranscriptRequest: args.onHandleYoutubeTranscriptRequest,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    setKinInput: args.setKinInput,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setPendingKinInjectionPurpose: args.setPendingKinInjectionPurpose,
    setActiveTabToKin: args.setActiveTabToKin,
    recordIngestedDocument: args.recordIngestedDocument,
    ingestProtocolMessage: args.ingestProtocolMessage,
    gptStateRef: args.gptStateRef as never,
    chatRecentLimit: args.chatRecentLimit,
    handleGptMemory: args.handleGptMemory as never,
    applyChatUsage: args.applyChatUsage as never,
    applyCompressionUsage: args.applyCompressionUsage as never,
    applyIngestUsage: args.applyIngestUsage ?? (() => undefined),
  });
  return true;
}

export async function handlePptDesignRequestGate(args: {
  pptDesignRequestEvent?: ProtocolTaskEventLike;
  userMsg: Message;
  libraryReferenceContext?: string;
  referenceLibraryItems: ReferenceLibraryItem[];
  imageLibraryReferenceEnabled?: boolean;
  imageLibraryReferenceCount?: number;
  applyTaskUsage?: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
}) {
  const event = args.pptDesignRequestEvent;
  if (!event) return false;

  args.setGptMessages((prev) => [...prev, args.userMsg]);
  args.setGptInput("");
  args.setGptLoading(true);

  try {
    const body = event.body || event.summary || "";
    const title = resolvePresentationTaskTitle({
      presentationMode: true,
      fallbackTitle: "PPT design",
      generatedTitle: event.taskId ? `PPT design ${event.taskId}` : "PPT design",
      preserveExistingTitle: false,
    });
    const imageLibraryContext = buildPresentationImageLibraryContext(
      getPresentationImageLibraryCandidates({
        enabled: args.imageLibraryReferenceEnabled,
        count: args.imageLibraryReferenceCount,
        referenceLibraryItems: args.referenceLibraryItems,
      })
    );
    const input = buildPresentationTaskStructuredInput({
      title,
      userInstruction: body,
      body: ["/ppt", "Create PPT design", body].filter(Boolean).join("\n"),
      libraryReferenceContext: args.libraryReferenceContext,
      imageLibraryContext,
    });
    const data = await runAutoPrepPresentationTask(input, "sys-ppt-design-request");
    const plan = buildPresentationTaskPlan({
      title,
      result: data?.parsed,
      rawText: data?.raw,
    });
    const designText = plan
      ? formatPresentationTaskPlanText(plan)
      : formatPresentationTaskResultText(data?.parsed, data?.raw);
    const responseText = [
      "<<SYS_PPT_DESIGN_RESPONSE>>",
      `TASK_ID: ${event.taskId || ""}`,
      `ACTION_ID: ${event.actionId || ""}`,
      "BODY:",
      designText,
      "<<END_SYS_PPT_DESIGN_RESPONSE>>",
    ].join("\n");

    if (data?.usage) args.applyTaskUsage?.(data.usage);
    args.ingestProtocolMessage(responseText, "gpt_to_kin");
    args.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: responseText,
        meta: { kind: "task_info", sourceType: "manual" },
      },
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PPT design request failed.";
    const responseText = [
      "<<SYS_PPT_DESIGN_RESPONSE>>",
      `TASK_ID: ${event.taskId || ""}`,
      `ACTION_ID: ${event.actionId || ""}`,
      "STATUS: NEEDS_MORE",
      "BODY:",
      `PPT design request failed: ${message}`,
      "<<END_SYS_PPT_DESIGN_RESPONSE>>",
    ].join("\n");
    args.ingestProtocolMessage(responseText, "gpt_to_kin");
    args.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: responseText,
        meta: { kind: "task_info", sourceType: "manual" },
      },
    ]);
  } finally {
    args.setGptLoading(false);
  }

  return true;
}

export async function handleFileSaveRequestGate(args: {
  fileSaveRequestEvent?: ProtocolTaskEventLike;
  userMsg: Message;
  gptStateRef: { current: { recentMessages?: Message[] } };
  currentTaskCharConstraint?: TaskCharConstraint;
  recordIngestedDocument: (document: {
    artifactType?: import("@/types/chat").StoredDocument["artifactType"];
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
    structuredPayload?: import("@/types/chat").StoredDocument["structuredPayload"];
    createdAt: string;
    updatedAt: string;
  }) => { id: string };
  autoGenerateLibrarySummary: boolean;
  generateLibrarySummary?: typeof requestGeneratedLibrarySummary;
  applyIngestUsage?: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
}): Promise<boolean> {
  const event = args.fileSaveRequestEvent;
  if (!event) return false;
  const messages = args.gptStateRef.current.recentMessages || [];
  const documentId = resolveDraftDocumentId({
    requestedDocumentId: event.documentId,
    messages,
  });
  const responseDocumentId = documentId || event.documentId?.trim() || "Unknown";

  const document = documentId
    ? extractDraftDocumentFromMessages({
        messages,
        documentId,
      })
    : null;
  const now = new Date().toISOString();

  let responseText = "";
  if (document) {
    const validation = validateMultipartAssemblyText(
      document.text,
      args.currentTaskCharConstraint ?? null
    );

    if (!validation.accepted) {
      responseText = [
        "<<SYS_TASK_CONFIRM>>",
        `TASK_ID: ${event.taskId || ""}`,
        "STATUS: REVISION_REQUIRED",
        `SUMMARY: ${validation.summary} Continue the task, revise the draft, and request file saving again only after the document satisfies the length constraint.`,
        `DOCUMENT_ID: ${responseDocumentId}`,
        `CURRENT_CHARACTERS: ${validation.charCount}`,
        "<<END_SYS_TASK_CONFIRM>>",
      ].join("\n");
    } else {
      let generatedSummary = "";
      if (args.autoGenerateLibrarySummary) {
        const generateSummary =
          args.generateLibrarySummary ?? requestGeneratedLibrarySummary;
        try {
          const summaryResult = await generateSummary({
            title: document.title,
            text: document.text,
          });
          generatedSummary = summaryResult.summary?.trim() || "";
          args.applyIngestUsage?.(
            normalizeUsage(normalizeLibrarySummaryUsage(summaryResult.usage))
          );
        } catch (error) {
          console.warn("File saving summary generation failed", error);
        }
      }

      args.recordIngestedDocument({
        artifactType: isPptDesignDocument(document.text)
          ? "presentation_plan"
          : undefined,
        title: document.title,
        filename: `${responseDocumentId}.txt`,
        text: document.text,
        summary: generatedSummary || undefined,
        taskId: event.taskId,
        charCount: document.text.length,
        structuredPayload: isPptDesignDocument(document.text)
          ? buildPresentationTaskPlanFromText({
              title: document.title,
              text: document.text,
            })
          : undefined,
        createdAt: now,
        updatedAt: now,
      });
      responseText = [
        "<<SYS_FILE_SAVING_RESPONSE>>",
        `TASK_ID: ${event.taskId || ""}`,
        `ACTION_ID: ${event.actionId || ""}`,
        `DOCUMENT_ID: ${responseDocumentId}`,
        "STATUS: SAVED",
        "BODY: Saved to library.",
        "<<END_SYS_FILE_SAVING_RESPONSE>>",
      ].join("\n");
    }
  } else {
    responseText = [
      "<<SYS_FILE_SAVING_RESPONSE>>",
      `TASK_ID: ${event.taskId || ""}`,
      `ACTION_ID: ${event.actionId || ""}`,
      `DOCUMENT_ID: ${responseDocumentId}`,
      "STATUS: NEED_DOCUMENT",
      "BODY: The referenced document was not found in recent draft responses.",
      "<<END_SYS_FILE_SAVING_RESPONSE>>",
    ].join("\n");
  }

  args.setGptMessages((prev) => [
    ...prev,
    args.userMsg,
    {
      id: generateId(),
      role: "gpt",
      text: responseText,
      meta: { kind: "task_info", sourceType: "manual" },
    },
  ]);
  args.setGptInput("");
  return true;
}

function isPptDesignDocument(text: string) {
  return /^【PPT設計書】/m.test(text) || /^Document ID\s*:\s*ppt_/im.test(text);
}
