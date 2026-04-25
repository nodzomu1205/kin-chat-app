import { generateId } from "@/lib/uuid";
import { buildYoutubeTranscriptRetryBlock } from "@/lib/taskRuntimeProtocol";
import {
  buildTranscriptFailureArtifacts,
  buildTranscriptSuccessArtifacts,
  extractYouTubeVideoIdFromUrl,
  type YouTubeTranscriptApiResponse,
} from "@/lib/app/send-to-gpt/sendToGptTranscriptHelperBuilders";
import type { Message } from "@/types/chat";

export function resolveYoutubeTranscriptFlowContext(args: {
  transcriptUrl: string;
  outputMode?: string;
  taskId?: string;
  currentTaskId: string | null;
  actionId?: string;
}) {
  return {
    transcriptUrl: args.transcriptUrl.trim(),
    videoId: extractYouTubeVideoIdFromUrl(args.transcriptUrl),
    outputMode: args.outputMode || "summary_plus_raw",
    resolvedTaskId: args.taskId || args.currentTaskId || "",
    resolvedActionId: args.actionId || "",
  };
}

export function buildYoutubeTranscriptRequestBody(videoId: string) {
  return { videoId };
}

export function buildYoutubeTranscriptRequestBodyWithOptions(args: {
  videoId: string;
  generateSummary: boolean;
}) {
  return {
    videoId: args.videoId,
    generateSummary: args.generateSummary,
  };
}

export function buildYoutubeTranscriptDocumentRecord(args: {
  artifacts: ReturnType<typeof buildTranscriptSuccessArtifacts>;
  taskId?: string;
  now: string;
}) {
  return {
    title: args.artifacts.title,
    filename: args.artifacts.filename,
    text: args.artifacts.cleanTranscript,
    summary: args.artifacts.summary,
    taskId: args.taskId || undefined,
    charCount: args.artifacts.cleanTranscript.length,
    createdAt: args.now,
    updatedAt: args.now,
  };
}

export function buildYoutubeTranscriptAssistantMessage(text: string): Message {
  return {
    id: generateId(),
    role: "gpt",
    text,
    meta: {
      kind: "task_info",
      sourceType: "file_ingest",
    },
  };
}

export function buildYoutubeTranscriptFailureState(args: {
  taskId: string;
  actionId: string;
  transcriptUrl: string;
  outputMode: string;
}) {
  const failureText = buildTranscriptFailureArtifacts(args);
  const retryBlock = buildYoutubeTranscriptRetryBlock({
    taskId: args.taskId,
    actionId: args.actionId,
    url: args.transcriptUrl,
  });

  return {
    failureText,
    retryBlock,
    message: {
      id: generateId(),
      role: "gpt" as const,
      text: failureText,
      meta: {
        kind: "task_info" as const,
        sourceType: "manual" as const,
      },
    },
  };
}

export function buildYoutubeTranscriptArtifacts(args: {
  data: YouTubeTranscriptApiResponse;
  videoId: string;
  transcriptUrl: string;
  outputMode: string;
  taskId: string;
  actionId: string;
  storedDocumentId: string;
}) {
  return buildTranscriptSuccessArtifacts(args);
}
