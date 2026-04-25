import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  appendRecentAssistantMessage,
  resolveMemoryUpdateContext,
} from "@/lib/app/send-to-gpt/sendToGptFlowState";
import type { YouTubeTranscriptApiResponse } from "@/lib/app/send-to-gpt/sendToGptTranscriptHelpers";
import {
  buildYoutubeTranscriptArtifacts,
  buildYoutubeTranscriptAssistantMessage,
  buildYoutubeTranscriptDocumentRecord,
  buildYoutubeTranscriptFailureState,
  buildYoutubeTranscriptRequestBody,
  resolveYoutubeTranscriptFlowContext,
} from "@/lib/app/send-to-gpt/sendToGptYoutubeFlowBuilders";
import type { Memory } from "@/lib/memory";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { Message } from "@/types/chat";
import type { TaskProtocolEvent } from "@/types/taskProtocol";
import { normalizeUsage, type ConversationUsageOptions } from "@/lib/tokenStats";

type MemoryResultLike = {
  compressionUsage?: Parameters<typeof normalizeUsage>[0];
  fallbackUsage?: Parameters<typeof normalizeUsage>[0];
  fallbackUsageDetails?: Record<string, unknown> | null;
  fallbackMetrics?: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  fallbackDebug?: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
};

export async function handleYoutubeTranscriptFlow(args: {
  userMsg: Message;
  youtubeTranscriptRequestEvent: TaskProtocolEvent & {
    url?: string;
    outputMode?: string;
    taskId?: string;
    actionId?: string;
  };
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
  gptStateRef: MutableRefObject<{ recentMessages?: Message[]; memory?: Memory }>;
  chatRecentLimit: number;
  handleGptMemory: (
    recent: Message[],
    options?: MemoryUpdateOptions
  ) => Promise<MemoryResultLike>;
  applyChatUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
  applyCompressionUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
}): Promise<boolean> {
  const transcriptUrl = args.youtubeTranscriptRequestEvent.url?.trim();
  if (!transcriptUrl) return false;

  if (args.onHandleYoutubeTranscriptRequest) {
    const handled = await args.onHandleYoutubeTranscriptRequest({
      userMessage: args.userMsg,
      youtubeTranscriptRequestEvent: args.youtubeTranscriptRequestEvent,
      currentTaskId: args.currentTaskId,
    });
    if (handled) return true;
  }

  const flowContext = resolveYoutubeTranscriptFlowContext({
    transcriptUrl,
    outputMode: args.youtubeTranscriptRequestEvent.outputMode,
    taskId: args.youtubeTranscriptRequestEvent.taskId,
    currentTaskId: args.currentTaskId,
    actionId: args.youtubeTranscriptRequestEvent.actionId,
  });

  args.setGptMessages((prev) => [...prev, args.userMsg]);
  args.setGptInput("");
  args.setGptLoading(true);

  try {
    if (!flowContext.videoId) {
      throw new Error("Invalid YouTube URL");
    }

    const response = await fetch("/api/youtube-transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildYoutubeTranscriptRequestBody(flowContext.videoId)
      ),
    });
    const data = (await response.json()) as YouTubeTranscriptApiResponse;

    if (!response.ok || !data.text) {
      throw new Error(data.error || "YouTube transcript fetch failed");
    }
    args.applyIngestUsage(normalizeUsage(data.usage));

    const now = new Date().toISOString();
    const transcriptArtifacts = buildYoutubeTranscriptArtifacts({
      data,
      videoId: flowContext.videoId,
      transcriptUrl,
      outputMode: flowContext.outputMode,
      taskId: flowContext.resolvedTaskId,
      actionId: flowContext.resolvedActionId,
      storedDocumentId: "",
    });
    const storedDocument = args.recordIngestedDocument(
      buildYoutubeTranscriptDocumentRecord({
        artifacts: transcriptArtifacts,
        taskId: flowContext.resolvedTaskId,
        now,
      })
    );
    const finalizedArtifacts = buildYoutubeTranscriptArtifacts({
      data,
      videoId: flowContext.videoId,
      transcriptUrl,
      outputMode: flowContext.outputMode,
      taskId: flowContext.resolvedTaskId,
      actionId: flowContext.resolvedActionId,
      storedDocumentId: storedDocument.id,
    });
    const assistantText = finalizedArtifacts.assistantText;
    const kinBlocks = finalizedArtifacts.kinBlocks;
    const assistantMsg = buildYoutubeTranscriptAssistantMessage(assistantText);

    args.ingestProtocolMessage(assistantText, "gpt_to_kin");
    args.setKinInput(kinBlocks[0] || "");
    args.setPendingKinInjectionBlocks(kinBlocks.length > 1 ? kinBlocks : []);
    args.setPendingKinInjectionIndex(0);
    args.setActiveTabToKin?.();

    const memoryContext = resolveMemoryUpdateContext({
      gptState: args.gptStateRef.current,
      userMessage: args.userMsg,
      chatRecentLimit: args.chatRecentLimit,
    });
    const updatedRecent = appendRecentAssistantMessage({
      recentMessages: memoryContext.recentWithUser,
      assistantMessage: assistantMsg,
      chatRecentLimit: args.chatRecentLimit,
    });

    args.setGptMessages((prev) => [...prev, assistantMsg]);
    const memoryResult = await args.handleGptMemory(updatedRecent, {
      previousCommittedTopic: memoryContext.previousCommittedTopic,
    });
    if (memoryResult.fallbackUsage) {
      args.applyChatUsage(memoryResult.fallbackUsage, {
        mergeIntoLast: true,
        followupMetrics: memoryResult.fallbackMetrics,
        followupUsageDetails: memoryResult.fallbackUsageDetails,
        followupDebug: memoryResult.fallbackDebug,
      });
    }
    if (memoryResult.compressionUsage) {
      args.applyCompressionUsage(memoryResult.compressionUsage);
    }
  } catch (error) {
    console.error(error);
    const failureState = buildYoutubeTranscriptFailureState({
      taskId: flowContext.resolvedTaskId,
      actionId: flowContext.resolvedActionId,
      transcriptUrl,
      outputMode: flowContext.outputMode,
    });
    args.setGptMessages((prev) => [...prev, failureState.message]);
    args.ingestProtocolMessage(failureState.failureText, "gpt_to_kin");
    args.setPendingKinInjectionBlocks([]);
    args.setPendingKinInjectionIndex(0);
    args.setKinInput(failureState.retryBlock);
    args.setActiveTabToKin?.();
  } finally {
    args.setGptLoading(false);
  }

  return true;
}

