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
  buildYoutubeTranscriptRequestBodyWithOptions,
  resolveYoutubeTranscriptFlowContext,
} from "@/lib/app/send-to-gpt/sendToGptYoutubeFlowBuilders";
import type { Memory } from "@/lib/memory-domain/memory";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { MemoryResultLike } from "@/lib/app/send-to-gpt/sendToGptFlowArgTypes";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import type { Message } from "@/types/chat";
import type { TaskProtocolEvent } from "@/types/taskProtocol";
import { normalizeUsage, type ConversationUsageOptions } from "@/lib/shared/tokenStats";

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
  setPendingKinInjectionPurpose?: Dispatch<
    SetStateAction<PendingKinInjectionPurpose>
  >;
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
    args.setPendingKinInjectionPurpose?.(
      kinBlocks.length > 1 ? "task_context" : "none"
    );
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
    args.setPendingKinInjectionPurpose?.("none");
    args.setKinInput(failureState.retryBlock);
    args.setActiveTabToKin?.();
  } finally {
    args.setGptLoading(false);
  }

  return true;
}

export async function runYoutubeTranscriptRequestItemFlow(args: {
  transcriptUrl: string;
  taskId: string;
  actionId: string;
  outputMode: string;
  generateSummary: boolean;
  appendUserMessage?: Message | null;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  setKinInput: Dispatch<SetStateAction<string>>;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setPendingKinInjectionPurpose?: Dispatch<
    SetStateAction<PendingKinInjectionPurpose>
  >;
  focusKinPanel: () => void;
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
}) {
  const flowContext = resolveYoutubeTranscriptFlowContext({
    transcriptUrl: args.transcriptUrl,
    outputMode: args.outputMode,
    taskId: args.taskId,
    currentTaskId: null,
    actionId: args.actionId,
  });
  if (!flowContext.videoId) {
    throw new Error("Invalid YouTube URL");
  }

  if (args.appendUserMessage) {
    args.setGptMessages((prev) => [...prev, args.appendUserMessage as Message]);
  }
  args.setGptInput("");
  args.setGptLoading(true);

  try {
    const response = await fetch("/api/youtube-transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildYoutubeTranscriptRequestBodyWithOptions({
          videoId: flowContext.videoId,
          generateSummary: args.generateSummary,
        })
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
      transcriptUrl: flowContext.transcriptUrl,
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
      transcriptUrl: flowContext.transcriptUrl,
      outputMode: flowContext.outputMode,
      taskId: flowContext.resolvedTaskId,
      actionId: flowContext.resolvedActionId,
      storedDocumentId: storedDocument.id,
    });
    const assistantMsg = buildYoutubeTranscriptAssistantMessage(
      finalizedArtifacts.assistantText
    );

    args.ingestProtocolMessage(finalizedArtifacts.assistantText, "gpt_to_kin");
    args.setKinInput(finalizedArtifacts.kinBlocks[0] || "");
    args.setPendingKinInjectionBlocks(
      finalizedArtifacts.kinBlocks.length > 1 ? finalizedArtifacts.kinBlocks : []
    );
    args.setPendingKinInjectionIndex(0);
    args.setPendingKinInjectionPurpose?.(
      finalizedArtifacts.kinBlocks.length > 1 ? "task_context" : "none"
    );
    args.focusKinPanel();

    args.setGptMessages((prev) => [...prev, assistantMsg]);
    const updatedRecent = [
      ...(args.gptStateRef.current?.recentMessages || []),
      assistantMsg,
    ].slice(-args.chatRecentLimit);
    const memoryResult = await args.handleGptMemory(updatedRecent, {});
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
      transcriptUrl: flowContext.transcriptUrl,
      outputMode: flowContext.outputMode,
    });
    args.setGptMessages((prev) => [...prev, failureState.message]);
    args.ingestProtocolMessage(failureState.failureText, "gpt_to_kin");
    args.setPendingKinInjectionBlocks([]);
    args.setPendingKinInjectionIndex(0);
    args.setPendingKinInjectionPurpose?.("none");
    args.setKinInput(failureState.retryBlock);
    args.focusKinPanel();
  } finally {
    args.setGptLoading(false);
  }
}

