import type { Dispatch, SetStateAction } from "react";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import { generateId } from "@/lib/shared/uuid";
import { buildYouTubeTranscriptKinBlocks } from "@/lib/app/youtube-transcript/youtubeTranscriptKinBlocks";
import { cleanYouTubeTranscriptText } from "@/lib/app/youtube-transcript/youtubeTranscriptText";
import { normalizeUsage } from "@/lib/shared/tokenStats";
import type { Message, SourceItem, StoredDocument } from "@/types/chat";

type TranscriptUsage = Parameters<typeof normalizeUsage>[0];

type TranscriptResponseData = {
  title?: string;
  filename?: string;
  summary?: string;
  text?: string;
  cleanText?: string;
  usage?: TranscriptUsage;
  error?: string;
};

type SharedTranscriptFlowArgs = {
  source: SourceItem;
  autoGenerateSummary: boolean;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  applyIngestUsage: (usage: TranscriptUsage) => void;
};

function buildTranscriptRequestBody(args: {
  source: SourceItem;
  videoId: string;
  autoGenerateSummary: boolean;
}) {
  return {
    videoId: args.videoId,
    title: args.source.title,
    channelName: args.source.channelName,
    duration: args.source.duration,
    generateSummary: args.autoGenerateSummary,
  };
}

async function requestTranscript(args: {
  source: SourceItem;
  videoId: string;
  autoGenerateSummary: boolean;
}) {
  const response = await fetch("/api/youtube-transcript", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildTranscriptRequestBody(args)),
  });
  const data = (await response.json()) as TranscriptResponseData;
  return { response, data };
}

function appendTranscriptStatusMessage(args: {
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  text: string;
  sourceType: NonNullable<Message["meta"]>["sourceType"];
}) {
  args.setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text: args.text,
      meta: {
        kind: "task_info",
        sourceType: args.sourceType,
      },
    },
  ]);
}

export async function runImportYouTubeTranscriptFlow(
  args: SharedTranscriptFlowArgs & {
    currentTaskId?: string;
    recordIngestedDocument: (
      document: Omit<StoredDocument, "id" | "sourceType">
    ) => StoredDocument;
  }
) {
  const videoId = args.source.videoId?.trim();
  if (!videoId) return;

  args.setGptLoading(true);
  try {
    const { response, data } = await requestTranscript({
      source: args.source,
      videoId,
      autoGenerateSummary: args.autoGenerateSummary,
    });

    if (!response.ok || !data.text) {
      throw new Error(data.error || "transcript import failed");
    }
    args.applyIngestUsage(normalizeUsage(data.usage));

    const cleanTranscript = cleanYouTubeTranscriptText(data.cleanText || data.text);
    args.recordIngestedDocument({
      title: data.title || `${args.source.title} [Transcript]`,
      filename: data.filename || `youtube-${videoId}.txt`,
      text: cleanTranscript,
      summary: data.summary || "",
      taskId: args.currentTaskId || undefined,
      charCount: cleanTranscript.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    appendTranscriptStatusMessage({
      setGptMessages: args.setGptMessages,
      text: `YouTube transcript saved to the library: ${data.title || args.source.title}`,
      sourceType: "file_ingest",
    });
  } catch (error) {
    console.error(error);
    appendTranscriptStatusMessage({
      setGptMessages: args.setGptMessages,
      text: "YouTube transcript import failed.",
      sourceType: "file_ingest",
    });
  } finally {
    args.setGptLoading(false);
  }
}

export async function runSendYouTubeTranscriptToKinFlow(
  args: SharedTranscriptFlowArgs & {
    setKinInput: Dispatch<SetStateAction<string>>;
    setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
    setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
    setPendingKinInjectionPurpose?: Dispatch<
      SetStateAction<PendingKinInjectionPurpose>
    >;
    focusKinPanel: () => boolean;
  }
) {
  const videoId = args.source.videoId?.trim();
  if (!videoId) return;

  args.setGptLoading(true);
  try {
    const { response, data } = await requestTranscript({
      source: args.source,
      videoId,
      autoGenerateSummary: args.autoGenerateSummary,
    });

    if (!response.ok || !(data.cleanText || data.text)) {
      throw new Error(data.error || "transcript kin transfer failed");
    }
    args.applyIngestUsage(normalizeUsage(data.usage));

    const cleanTranscript = cleanYouTubeTranscriptText(
      data.cleanText || data.text || ""
    );
    const blocks = buildYouTubeTranscriptKinBlocks({
      cleanTranscript,
      title: args.source.title,
      channelName: args.source.channelName,
      url: args.source.link,
    });

    args.setKinInput(blocks[0] || "");
    args.setPendingKinInjectionBlocks(blocks.length > 1 ? blocks : []);
    args.setPendingKinInjectionIndex(0);
    args.setPendingKinInjectionPurpose?.(
      blocks.length > 1 ? "info_share" : "none"
    );
    args.focusKinPanel();
  } catch (error) {
    console.error(error);
    appendTranscriptStatusMessage({
      setGptMessages: args.setGptMessages,
      text: "YouTube transcript could not be prepared for Kin.",
      sourceType: "manual",
    });
  } finally {
    args.setGptLoading(false);
  }
}
