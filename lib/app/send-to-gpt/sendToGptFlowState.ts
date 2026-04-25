import type { Memory } from "@/lib/memory-domain/memory";
import type {
  GptStateSnapshotLike,
  PendingRequestLike,
} from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import type {
  SendToGptImplicitSearchArtifactsArgs,
  SendToGptMemoryPreparation,
} from "@/lib/app/send-to-gpt/sendToGptFlowArtifactTypes";
import type { Message } from "@/types/chat";
import type { SourceItem } from "@/types/chat";
import { generateId } from "@/lib/shared/uuid";
import {
  buildImplicitSearchRecordArgs,
  buildMemoryUpdateContext,
  buildRequestMemory,
} from "@/lib/app/send-to-gpt/sendToGptFlowStateBuilders";

export function resolveMemoryUpdateContext(params: {
  gptState: GptStateSnapshotLike;
  userMessage: Message;
  chatRecentLimit: number;
}) {
  return buildMemoryUpdateContext(params);
}

export function resolveRequestMemory(params: {
  gptState: GptStateSnapshotLike;
}): Memory {
  return buildRequestMemory(params);
}

export function prepareSendToGptMemoryContext(params: {
  gptState: GptStateSnapshotLike;
  userMessage: Message;
  chatRecentLimit: number;
}): SendToGptMemoryPreparation {
  return {
    memoryContext: resolveMemoryUpdateContext({
      gptState: params.gptState,
      userMessage: params.userMessage,
      chatRecentLimit: params.chatRecentLimit,
    }),
    requestMemory: resolveRequestMemory({
      gptState: params.gptState,
    }),
  };
}

export function appendRecentAssistantMessage(params: {
  recentMessages: Message[];
  assistantMessage: Message;
  chatRecentLimit: number;
}) {
  return [...params.recentMessages, params.assistantMessage].slice(
    -params.chatRecentLimit
  );
}

export function createGptAssistantMessage(params: {
  assistantText: string;
  normalizedSources?: SourceItem[];
  sourceType: "search" | "gpt_input" | "manual";
  kind?: "normal" | "task_info";
}): Message {
  return {
    id: generateId(),
    role: "gpt",
    text: params.assistantText,
    sources: params.normalizedSources,
    meta: {
      kind: params.kind ?? "normal",
      sourceType: params.sourceType,
    },
  };
}

export function applySendToGptRequestStart(params: {
  userMessage: Message;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setGptInput: React.Dispatch<React.SetStateAction<string>>;
  setGptLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  params.setGptMessages((prev) => [...prev, params.userMessage]);
  params.setGptInput("");
  params.setGptLoading(true);
}

export function appendSendToGptFailureMessage(params: {
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  messageText?: string;
}) {
  const assistantMessage = createGptAssistantMessage({
    assistantText: params.messageText ?? "GPT request failed.",
    sourceType: "manual",
  });

  params.setGptMessages((prev) => [...prev, assistantMessage]);
}

export function handleImplicitSearchArtifacts(
  params: SendToGptImplicitSearchArtifactsArgs
) {
  if (params.data.searchUsed && !params.searchRequestEvent) {
    if (params.data.promptMetrics) {
      params.applyChatUsage(null, {
        promptMetrics: params.data.promptMetrics,
        usageDetails: params.data.usageDetails,
      });
    }
    params.applySearchUsage(params.data.usage);
    params.recordSearchContext(buildImplicitSearchRecordArgs(params));
    return;
  }

  if (!params.searchRequestEvent) {
    params.applyChatUsage(params.data.usage, {
      promptMetrics: params.data.promptMetrics,
      usageDetails: params.data.usageDetails,
    });
  }
}

export function applyProtocolAssistantSideEffects(params: {
  assistantText: string;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  taskProtocolAnswerPendingRequest: (requestId: string, answerText: string) => void;
}) {
  params.ingestProtocolMessage(params.assistantText, "gpt_to_kin");

  if (params.requestToAnswer && params.requestAnswerBody) {
    params.taskProtocolAnswerPendingRequest(
      params.requestToAnswer.id,
      params.requestAnswerBody
    );
  }
}
