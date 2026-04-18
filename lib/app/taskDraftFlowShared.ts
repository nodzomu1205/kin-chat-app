import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import type { KinMemoryState, Message, MessageMeta } from "@/types/chat";
import { normalizeUsage } from "@/lib/tokenStats";

export type TaskMemoryBridgeArgs = {
  setGptState: Dispatch<SetStateAction<KinMemoryState>>;
  persistCurrentGptState?: (state: KinMemoryState) => void;
  gptStateRef: MutableRefObject<KinMemoryState>;
  recentMessages?: Message[];
  lastUserIntent?: string;
  activeReference?: {
    title: string;
    kind: string;
    sourceId?: string;
    excerpt?: string;
  } | null;
};

export type TaskFlowStartArgs = {
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  userMessage?: Message;
};

export type TaskFlowAssistantResultArgs = {
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  assistantMessage: Message;
} & TaskMemoryBridgeArgs;

export type TaskFlowSummaryArgs = {
  recentMessages: Message[];
  applySummaryUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  handleGptMemory: (
    recent: Message[],
    options?: {
      currentTaskTitleOverride?: string;
      lastUserIntent?: string;
      activeDocument?: Record<string, unknown> | null;
    }
  ) => Promise<{ summaryUsage: Parameters<typeof normalizeUsage>[0] | null }>;
  currentTaskTitleOverride?: string;
  lastUserIntent?: string;
  activeDocument?: Record<string, unknown> | null;
};

export type TaskFlowRecentContextArgs = {
  gptStateRef: MutableRefObject<KinMemoryState>;
  chatRecentLimit: number;
  userMessage?: Message;
};

export type TaskFlowSuccessArgs = {
  assistantMessage: Message;
  requestRecentMessages: Message[];
  chatRecentLimit: number;
  currentTaskTitleOverride?: string;
  activeDocument?: Record<string, unknown> | null;
} & TaskFlowAssistantResultArgs &
  Pick<TaskFlowSummaryArgs, "applySummaryUsage" | "handleGptMemory">;

export function appendTaskInfoMessage(
  setGptMessages: Dispatch<SetStateAction<Message[]>>,
  text: string,
  sourceType: MessageMeta["sourceType"] = "manual"
) {
  setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text,
      meta: {
        kind: "task_info",
        sourceType,
      },
    },
  ]);
}

export function applyTaskMemoryBridge(args: TaskMemoryBridgeArgs) {
  const current = args.gptStateRef.current;
  const currentMemory = current.memory;
  const currentLists = currentMemory.lists || {};
  const nextLists = {
    ...currentLists,
    ...(args.activeReference
      ? {
          activeDocument: {
            title: args.activeReference.title,
            kind: args.activeReference.kind,
            sourceId: args.activeReference.sourceId,
            excerpt: args.activeReference.excerpt,
            importedAt: new Date().toISOString(),
          },
        }
      : {}),
  };

  const nextState = {
    ...current,
    ...(args.recentMessages ? { recentMessages: args.recentMessages } : {}),
    memory: {
      ...currentMemory,
      lists: nextLists,
      context: currentMemory.context || {},
    },
  };

  if (args.persistCurrentGptState) {
    args.persistCurrentGptState(nextState);
    return;
  }
  args.gptStateRef.current = nextState;
  args.setGptState(nextState);
}

export function getTaskFlowRecentMessages(
  gptStateRef: MutableRefObject<KinMemoryState>
) {
  return gptStateRef.current.recentMessages || [];
}

export function appendTaskFlowRecentMessage(
  recentMessages: Message[],
  chatRecentLimit: number,
  message: Message
) {
  return [...recentMessages, message].slice(-chatRecentLimit);
}

export function buildTaskFlowRecentContext(args: TaskFlowRecentContextArgs) {
  const baseRecentMessages = getTaskFlowRecentMessages(args.gptStateRef);
  const requestRecentMessages = args.userMessage
    ? appendTaskFlowRecentMessage(
        baseRecentMessages,
        args.chatRecentLimit,
        args.userMessage
      )
    : baseRecentMessages;

  return {
    baseRecentMessages,
    requestRecentMessages,
  };
}

export function startTaskFlowRequest(args: TaskFlowStartArgs) {
  if (args.userMessage) {
    args.setGptMessages((prev) => [...prev, args.userMessage as Message]);
  }
  args.setGptInput("");
  args.setGptLoading(true);
}

export function appendTaskFlowAssistantResult(args: TaskFlowAssistantResultArgs) {
  args.setGptMessages((prev) => [...prev, args.assistantMessage]);
  applyTaskMemoryBridge({
    setGptState: args.setGptState,
    persistCurrentGptState: args.persistCurrentGptState,
    gptStateRef: args.gptStateRef,
    recentMessages: args.recentMessages,
    lastUserIntent: args.lastUserIntent,
    activeReference: args.activeReference,
  });
}

export async function applyTaskFlowSummaryUsage(args: TaskFlowSummaryArgs) {
  const memoryResult = await args.handleGptMemory(args.recentMessages, {
    currentTaskTitleOverride: args.currentTaskTitleOverride,
    lastUserIntent: args.lastUserIntent,
    activeDocument: args.activeDocument,
  });
  if (memoryResult.summaryUsage) {
    args.applySummaryUsage(memoryResult.summaryUsage);
  }
}

export async function completeTaskFlowSuccess(args: TaskFlowSuccessArgs) {
  const updatedRecentMessages = appendTaskFlowRecentMessage(
    args.requestRecentMessages,
    args.chatRecentLimit,
    args.assistantMessage
  );

  appendTaskFlowAssistantResult({
    setGptMessages: args.setGptMessages,
    assistantMessage: args.assistantMessage,
    setGptState: args.setGptState,
    persistCurrentGptState: args.persistCurrentGptState,
    gptStateRef: args.gptStateRef,
    recentMessages: updatedRecentMessages,
    lastUserIntent: args.lastUserIntent,
    activeReference: args.activeReference,
  });

  await applyTaskFlowSummaryUsage({
    recentMessages: updatedRecentMessages,
    applySummaryUsage: args.applySummaryUsage,
    handleGptMemory: args.handleGptMemory,
    currentTaskTitleOverride: args.currentTaskTitleOverride,
    lastUserIntent: args.lastUserIntent,
    activeDocument: args.activeDocument,
  });

  return updatedRecentMessages;
}
