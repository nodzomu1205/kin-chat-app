import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import { buildYoutubeTranscriptRetryBlock } from "@/lib/taskRuntimeProtocol";
import {
  appendRecentAssistantMessage,
  resolveMemoryUpdateContext,
} from "@/lib/app/sendToGptFlowHelpers";
import {
  buildYoutubeTranscriptFailureText,
  buildYoutubeTranscriptSuccessArtifacts,
  extractYouTubeVideoIdFromUrl,
  type YouTubeTranscriptApiResponse,
} from "@/lib/app/sendToGptTranscriptHelpers";
import type { Memory } from "@/lib/memory";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { Message } from "@/types/chat";
import type { TaskProtocolEvent } from "@/types/taskProtocol";
import { normalizeUsage } from "@/lib/tokenStats";

type MemoryResultLike = {
  summaryUsage?: Parameters<typeof normalizeUsage>[0];
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
  applySummaryUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
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

  const videoId = extractYouTubeVideoIdFromUrl(transcriptUrl);
  const outputMode =
    args.youtubeTranscriptRequestEvent.outputMode || "summary_plus_raw";

  args.setGptMessages((prev) => [...prev, args.userMsg]);
  args.setGptInput("");
  args.setGptLoading(true);

  try {
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    const response = await fetch("/api/youtube-transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoId }),
    });
    const data = (await response.json()) as YouTubeTranscriptApiResponse;

    if (!response.ok || !data.text || !videoId) {
      throw new Error(data.error || "YouTube transcript fetch failed");
    }

    const now = new Date().toISOString();
    const transcriptArtifacts = buildYoutubeTranscriptSuccessArtifacts({
      data,
      videoId,
      transcriptUrl,
      outputMode,
      taskId: args.youtubeTranscriptRequestEvent.taskId || args.currentTaskId || "",
      actionId: args.youtubeTranscriptRequestEvent.actionId || "",
      storedDocumentId: "",
    });
    const storedDocument = args.recordIngestedDocument({
      title: transcriptArtifacts.title,
      filename: transcriptArtifacts.filename,
      text: transcriptArtifacts.cleanTranscript,
      summary: transcriptArtifacts.summary,
      taskId: args.youtubeTranscriptRequestEvent.taskId || args.currentTaskId || undefined,
      charCount: transcriptArtifacts.cleanTranscript.length,
      createdAt: now,
      updatedAt: now,
    });
    const finalizedArtifacts = buildYoutubeTranscriptSuccessArtifacts({
      data,
      videoId,
      transcriptUrl,
      outputMode,
      taskId: args.youtubeTranscriptRequestEvent.taskId || args.currentTaskId || "",
      actionId: args.youtubeTranscriptRequestEvent.actionId || "",
      storedDocumentId: storedDocument.id,
    });
    const assistantText = finalizedArtifacts.assistantText;
    const kinBlocks = finalizedArtifacts.kinBlocks;

    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: assistantText,
      meta: {
        kind: "task_info",
        sourceType: "file_ingest",
      },
    };

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
    args.applySummaryUsage(memoryResult.summaryUsage);
  } catch (error) {
    console.error(error);
    const failureText = buildYoutubeTranscriptFailureText({
      taskId: args.youtubeTranscriptRequestEvent.taskId || args.currentTaskId || "",
      actionId: args.youtubeTranscriptRequestEvent.actionId || "",
      transcriptUrl,
      outputMode,
    });
    const retryBlock = buildYoutubeTranscriptRetryBlock({
      taskId: args.youtubeTranscriptRequestEvent.taskId || args.currentTaskId || "",
      actionId: args.youtubeTranscriptRequestEvent.actionId || "",
      url: transcriptUrl,
    });
    args.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: failureText,
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      },
    ]);
    args.ingestProtocolMessage(failureText, "gpt_to_kin");
    args.setPendingKinInjectionBlocks([]);
    args.setPendingKinInjectionIndex(0);
    args.setKinInput(retryBlock);
    args.setActiveTabToKin?.();
  } finally {
    args.setGptLoading(false);
  }

  return true;
}
