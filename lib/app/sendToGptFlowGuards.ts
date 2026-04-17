import { generateId } from "@/lib/uuid";
import { handleYoutubeTranscriptFlow } from "@/lib/app/sendToGptYoutubeFlow";
import { runInlineUrlShortcut } from "@/lib/app/sendToGptShortcutFlows";
import {
  resolvePrePreparationGateDecision,
  resolvePreparedRequestGateDecision,
} from "@/lib/app/sendToGptFlowDecisionState";
import type { Dispatch, SetStateAction } from "react";
import { normalizeUsage } from "@/lib/tokenStats";
import type { Message } from "@/types/chat";
import type {
  ParsedInputLike,
} from "@/lib/app/sendToGptFlowTypes";
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
  const multipartHandled = handleMultipartImportGate({
    rawText: args.rawText,
    processMultipartTaskDoneText: args.processMultipartTaskDoneText,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
  });
  const gateDecision = resolvePrePreparationGateDecision({
    multipartHandled,
    inlineUrlTarget: args.extractInlineUrlTarget(args.rawText),
  });

  if (gateDecision.type === "multipart_import") {
    return true;
  }

  if (gateDecision.type !== "inline_url") {
    return false;
  }

  await handleInlineUrlGate({
    rawText: args.rawText,
    inlineUrlTarget: gateDecision.inlineUrlTarget,
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
  ) => Promise<{ summaryUsage?: unknown }>;
  applySummaryUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
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
    applySummaryUsage: args.applySummaryUsage as never,
  });
  return true;
}

export async function runPreparedRequestGates(args: {
  preparedRequest: {
    parsedInput: ParsedInputLike;
    effectiveParsedSearchQuery: string;
    limitViolation: string | null;
    userMsg: Message;
    youtubeTranscriptRequestEvent?: TaskProtocolEvent & { url?: string };
  };
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
  ) => Promise<{ summaryUsage?: unknown }>;
  applySummaryUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
}) {
  const gateDecision = resolvePreparedRequestGateDecision({
    isTaskDirectiveOnly: args.shouldRespondToTaskDirectiveOnlyInput({
      parsedInput: args.preparedRequest.parsedInput,
      effectiveParsedSearchQuery:
        args.preparedRequest.effectiveParsedSearchQuery,
    }),
    limitViolation: args.preparedRequest.limitViolation,
    youtubeTranscriptUrl: args.preparedRequest.youtubeTranscriptRequestEvent?.url,
  });

  if (
    gateDecision.type === "task_directive_only" &&
    handleTaskDirectiveOnlyGate({
      isTaskDirectiveOnly: true,
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
      limitViolation: gateDecision.violationText,
      userMsg: args.preparedRequest.userMsg,
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
    youtubeTranscriptRequestEvent:
      args.preparedRequest.youtubeTranscriptRequestEvent,
    userMsg: args.preparedRequest.userMsg,
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
    applySummaryUsage: args.applySummaryUsage,
  });
}
