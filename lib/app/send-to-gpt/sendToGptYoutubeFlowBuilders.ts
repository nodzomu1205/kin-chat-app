import { generateId } from "@/lib/shared/uuid";
import { buildYoutubeTranscriptRetryBlock } from "@/lib/task/taskRuntimeProtocol";
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

export function resolveYoutubeTranscriptBatchRequest(args: {
  event: {
    taskId?: string;
    actionId?: string;
    outputMode?: string;
    url?: string;
    urls?: string[];
  };
  currentTaskId: string | null;
}) {
  const urls = Array.from(
    new Set(
      (args.event.urls?.length ? args.event.urls : [args.event.url || ""])
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 3);

  if (urls.length === 0) return null;

  const taskId = args.event.taskId || args.currentTaskId || "";
  const outputMode = args.event.outputMode || "summary_plus_raw";
  const actionIdBase = args.event.actionId || "YOUTUBE_TRANSCRIPT";
  const items = urls.map((url, index) => ({
    url,
    actionId: urls.length === 1 ? actionIdBase : `${actionIdBase}-${index + 1}`,
  }));
  const [firstItem, ...remainingItems] = items;

  return {
    taskId,
    outputMode,
    firstItem,
    remainingItems,
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
