import { generateId } from "@/lib/uuid";
import { buildPrepInputFromIngestResult } from "@/lib/app/gptTaskClient";
import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
} from "@/lib/app/kinStructuredProtocol";
import { splitTextIntoKinChunks } from "@/lib/app/transformIntent";
import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/importSummaryText";
import {
  buildTaskPrepEnvelope,
  resolveCanonicalDocumentText,
} from "@/lib/app/ingestDocumentModel";
import type {
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { SharedIngestResult } from "@/lib/app/ingestClient";
import type { Message, KinMemoryState } from "@/types/chat";

type IngestResult = SharedIngestResult;

export type IngestExtractionArtifacts = {
  selectedLines: string[];
  selectedText: string;
  selectedCharCount: number;
  rawIngestText: string;
  rawCharCount: number;
  canonicalDocumentText: string;
  taskPrepEnvelopeBase: string;
};

export function buildStoredDocumentSummary(text: string, fallbackTitle: string) {
  const trimmed = cleanImportSummarySource(text).trim();
  if (!trimmed) return fallbackTitle;
  const normalized = trimmed.replace(/\s+/g, " ").trim();
  const withoutTitle = normalized.startsWith(fallbackTitle)
    ? normalized.slice(fallbackTitle.length).trimStart()
    : normalized;
  const basis = withoutTitle || normalized;
  const sentenceParts = basis
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const summary = (sentenceParts.slice(0, 2).join(" ") || basis).trim();
  return summary.length > 220 ? `${summary.slice(0, 220).trimEnd()}...` : summary;
}

export function resolveIngestExtractionArtifacts(params: {
  data: IngestResult;
  fileName: string;
  fileTitle: string;
}): IngestExtractionArtifacts {
  const selectedLines = Array.isArray(params.data?.result?.selectedLines)
    ? params.data.result.selectedLines.filter(
        (line: unknown): line is string =>
          typeof line === "string" && line.trim().length > 0
      )
    : [];
  const selectedText = selectedLines.join("\n").trim();
  const selectedCharCount = selectedText.length;
  const rawIngestText =
    typeof params.data?.result?.rawText === "string"
      ? params.data.result.rawText.trim()
      : "";
  const rawCharCount = rawIngestText.length;
  const cleanedSelectedText = cleanImportedDocumentText(selectedText);
  const cleanedRawIngestText = cleanImportedDocumentText(rawIngestText);
  const canonicalDocumentText = resolveCanonicalDocumentText({
    selectedText: cleanedSelectedText,
    rawText: cleanedRawIngestText,
  });
  const rawTaskPrepEnvelopeBase =
    selectedLines.length > 0
      ? buildTaskPrepEnvelope({
          fileName: params.fileName,
          title: params.fileTitle,
          content: canonicalDocumentText,
        })
      : buildPrepInputFromIngestResult(params.data, params.fileName);
  const taskPrepEnvelopeBase =
    cleanImportSummarySource(rawTaskPrepEnvelopeBase).trim() ||
    rawTaskPrepEnvelopeBase.trim();

  return {
    selectedLines,
    selectedText: cleanedSelectedText,
    selectedCharCount,
    rawIngestText: cleanedRawIngestText,
    rawCharCount,
    canonicalDocumentText,
    taskPrepEnvelopeBase,
  };
}

export function buildFileIngestBridgeState(params: {
  currentGptState: KinMemoryState;
  fileName: string;
  fileTitle: string;
  resolvedKind: UploadKind;
  summary?: string;
  selectedCharCount: number;
  rawCharCount: number;
  chatContextExcerpt: string;
  chatRecentLimit: number;
  injectedAt: string;
}) {
  const fileContextMessage: Message = {
    id: generateId(),
    role: "gpt",
    text: [
      "[Ingested file context]",
      `File: ${params.fileName}`,
      `Title: ${params.fileTitle}`,
      `Target: ${params.resolvedKind === "text" ? "Text" : "Image / PDF"}`,
      `Extracted characters: ${params.selectedCharCount.toLocaleString()}`,
      params.summary?.trim() ? `Summary:\n${params.summary.trim()}` : "",
      params.chatContextExcerpt ? `Content:\n${params.chatContextExcerpt}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    meta: {
      kind: "task_info",
      sourceType: "file_ingest",
    },
  };

  const recentWithoutPriorFileBridge = (
    params.currentGptState.recentMessages || []
  ).filter(
    (message: Message) =>
      !(
        message.meta?.sourceType === "file_ingest" &&
        message.meta?.kind === "task_info"
      )
  );

  const nextGptState = {
    ...params.currentGptState,
    memory: {
      ...params.currentGptState.memory,
      lists: {
        ...params.currentGptState.memory?.lists,
        activeDocument: {
          title: params.fileTitle,
          fileName: params.fileName,
          kind: params.resolvedKind,
          summary: params.summary?.trim() || "",
          charCount: params.selectedCharCount,
          rawCharCount: params.rawCharCount,
          excerpt: params.chatContextExcerpt,
          injectedAt: params.injectedAt,
        },
      },
      context: params.currentGptState.memory?.context || {},
    },
    recentMessages: [...recentWithoutPriorFileBridge, fileContextMessage].slice(
      -params.chatRecentLimit
    ),
  };

  return {
    fileContextMessage,
    nextGptState,
  };
}

export function buildIngestKinInjectionBlocks(params: {
  intentMode: "sys_info" | "sys_task";
  currentTaskSlot?: number;
  fileTitle: string;
  fileName: string;
  directiveLines: string[];
  kinPayloadText: string;
}) {
  const chunks = splitTextIntoKinChunks(params.kinPayloadText, 3400, 260);

  return chunks.map((chunk, index) =>
    params.intentMode === "sys_task"
      ? buildKinSysTaskBlock({
          taskSlot: params.currentTaskSlot,
          title: params.fileTitle,
          content: chunk,
          directiveLines: params.directiveLines,
          partIndex: index + 1,
          partTotal: chunks.length,
        })
      : buildKinSysInfoBlock({
          taskSlot: params.currentTaskSlot,
          title: params.fileTitle,
          fileName: params.fileName,
          content: chunk,
          directiveLines: params.directiveLines,
          partIndex: index + 1,
          partTotal: chunks.length,
        })
  );
}
