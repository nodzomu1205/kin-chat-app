import type { Dispatch, SetStateAction } from "react";
import { handleYoutubeTranscriptFlow } from "@/lib/app/send-to-gpt/sendToGptYoutubeFlow";
import { generateId } from "@/lib/shared/uuid";
import { normalizeUsage, type ConversationUsageOptions } from "@/lib/shared/tokenStats";
import type { Message } from "@/types/chat";
import type { TaskProtocolEvent } from "@/types/taskProtocol";

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
