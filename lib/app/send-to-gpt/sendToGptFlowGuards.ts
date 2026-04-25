import { generateId } from "@/lib/shared/uuid";
import { handleYoutubeTranscriptFlow } from "@/lib/app/send-to-gpt/sendToGptYoutubeFlow";
import { runInlineUrlShortcut } from "@/lib/app/send-to-gpt/sendToGptShortcutFlows";
import {
  resolvePrePreparationGateDecision,
  resolvePreparedRequestGateDecision,
} from "@/lib/app/send-to-gpt/sendToGptFlowDecisionState";
import type { Dispatch, SetStateAction } from "react";
import { normalizeUsage, type ConversationUsageOptions } from "@/lib/shared/tokenStats";
import type { Message } from "@/types/chat";
import type {
  InlineUrlGateContext,
  MultipartImportGateContext,
  ParsedInputLike,
  PreparedRequestGateContext,
  ProtocolLimitViolationGateContext,
  TaskDirectiveOnlyGateContext,
  YoutubeTranscriptGateContext,
} from "@/lib/app/send-to-gpt/sendToGptFlowTypes";
import type { TaskProtocolEvent } from "@/types/taskProtocol";

export function handleMultipartImportGate(args: {
  rawText: string;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
}) {
  const multipartHandled = args.processMultipartTaskDoneText(args.rawText, {
    setGptTab: true,
  });
  if (!multipartHandled) return false;

  const importedMessage: Message = {
    id: generateId(),
    role: "user",
    text: args.rawText,
  };
  args.setGptMessages((prev) => [...prev, importedMessage]);
  args.setGptInput("");
  return true;
}

export function buildMultipartImportGateContext(args: {
  rawText: string;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
}): MultipartImportGateContext {
  return {
    multipartHandled: !!args.processMultipartTaskDoneText(args.rawText, {
      setGptTab: true,
    }),
  };
}

export function buildInlineUrlGateContext(args: {
  rawText: string;
  extractInlineUrlTarget: (text: string) => string | null;
}): InlineUrlGateContext {
  return {
    inlineUrlTarget: args.extractInlineUrlTarget(args.rawText),
  };
}

export async function runPrePreparationGates(args: {
  rawText: string;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  extractInlineUrlTarget: (text: string) => string | null;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
}) {
  const multipartImportGateContext = buildMultipartImportGateContext({
    rawText: args.rawText,
    processMultipartTaskDoneText: args.processMultipartTaskDoneText,
  });
  if (
    multipartImportGateContext.multipartHandled &&
    handleMultipartImportGate({
      rawText: args.rawText,
      processMultipartTaskDoneText: args.processMultipartTaskDoneText,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
    })
  ) {
    return true;
  }
  const inlineUrlGateContext = buildInlineUrlGateContext({
    rawText: args.rawText,
    extractInlineUrlTarget: args.extractInlineUrlTarget,
  });
  const gateDecision = resolvePrePreparationGateDecision({
    multipartHandled: multipartImportGateContext.multipartHandled,
    inlineUrlTarget: inlineUrlGateContext.inlineUrlTarget,
  });

  if (gateDecision.type === "multipart_import") {
    return true;
  }

  if (gateDecision.type !== "inline_url") {
    return false;
  }

  await handleInlineUrlGate({
    rawText: args.rawText,
    inlineUrlTarget: inlineUrlGateContext.inlineUrlTarget as string,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
  });
  return true;
}

export async function handleInlineUrlGate(args: {
  rawText: string;
  inlineUrlTarget: string;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
}) {
  await runInlineUrlShortcut({
    rawText: args.rawText,
    inlineUrlTarget: args.inlineUrlTarget,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
  });
}

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

export function buildTaskDirectiveOnlyGateContext(args: {
  preparedRequest: PreparedRequestGateContext;
  shouldRespondToTaskDirectiveOnlyInput: (params: {
    parsedInput: ParsedInputLike;
    effectiveParsedSearchQuery: string;
  }) => boolean;
}): TaskDirectiveOnlyGateContext {
  return {
    isTaskDirectiveOnly: args.shouldRespondToTaskDirectiveOnlyInput({
      parsedInput: args.preparedRequest.parsedInput,
      effectiveParsedSearchQuery: args.preparedRequest.effectiveParsedSearchQuery,
    }),
  };
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

export function buildProtocolLimitViolationGateContext(args: {
  preparedRequest: PreparedRequestGateContext;
}): ProtocolLimitViolationGateContext {
  return {
    limitViolation: args.preparedRequest.limitViolation,
    userMsg: args.preparedRequest.userMsg,
  };
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
  setActiveTabToKin?: () => void;
  recordIngestedDocument: (document: {
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
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

export function buildYoutubeTranscriptGateContext(args: {
  preparedRequest: PreparedRequestGateContext;
}): YoutubeTranscriptGateContext {
  return {
    youtubeTranscriptRequestEvent:
      args.preparedRequest.youtubeTranscriptRequestEvent,
    userMsg: args.preparedRequest.userMsg,
  };
}

export async function runPreparedRequestGates(args: {
  preparedRequest: PreparedRequestGateContext;
  shouldRespondToTaskDirectiveOnlyInput: (params: {
    parsedInput: ParsedInputLike;
    effectiveParsedSearchQuery: string;
  }) => boolean;
  taskDirectiveOnlyResponseText: string;
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
  setActiveTabToKin?: () => void;
  recordIngestedDocument: (document: {
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
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
  const taskDirectiveOnlyGateContext = buildTaskDirectiveOnlyGateContext({
    preparedRequest: args.preparedRequest,
    shouldRespondToTaskDirectiveOnlyInput:
      args.shouldRespondToTaskDirectiveOnlyInput,
  });
  const protocolLimitViolationGateContext =
    buildProtocolLimitViolationGateContext({
      preparedRequest: args.preparedRequest,
    });
  const youtubeTranscriptGateContext = buildYoutubeTranscriptGateContext({
    preparedRequest: args.preparedRequest,
  });
  const gateDecision = resolvePreparedRequestGateDecision({
    isTaskDirectiveOnly: taskDirectiveOnlyGateContext.isTaskDirectiveOnly,
    limitViolation: protocolLimitViolationGateContext.limitViolation,
    youtubeTranscriptUrl:
      youtubeTranscriptGateContext.youtubeTranscriptRequestEvent?.url,
  });

  if (
    gateDecision.type === "task_directive_only" &&
    handleTaskDirectiveOnlyGate({
      isTaskDirectiveOnly: taskDirectiveOnlyGateContext.isTaskDirectiveOnly,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      taskDirectiveOnlyResponseText: args.taskDirectiveOnlyResponseText,
    })
  ) {
    return true;
  }

  if (
    gateDecision.type === "protocol_limit_violation" &&
    handleProtocolLimitViolationGate({
      ...protocolLimitViolationGateContext,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
    })
  ) {
    return true;
  }

  if (gateDecision.type !== "youtube_transcript") {
    return false;
  }

  return handleYoutubeTranscriptGate({
    ...youtubeTranscriptGateContext,
    currentTaskId: args.currentTaskId,
    onHandleYoutubeTranscriptRequest: args.onHandleYoutubeTranscriptRequest,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    setKinInput: args.setKinInput,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setActiveTabToKin: args.setActiveTabToKin,
    recordIngestedDocument: args.recordIngestedDocument,
    ingestProtocolMessage: args.ingestProtocolMessage,
    gptStateRef: args.gptStateRef,
    chatRecentLimit: args.chatRecentLimit,
    handleGptMemory: args.handleGptMemory,
    applyChatUsage: args.applyChatUsage,
    applyCompressionUsage: args.applyCompressionUsage,
    applyIngestUsage: args.applyIngestUsage ?? (() => undefined),
  });
}

