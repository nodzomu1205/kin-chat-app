import { generateId } from "@/lib/uuid";
import {
  buildPrepInputFromIngestResult,
  formatTaskResultText,
  runAutoDeepenTask,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
} from "@/lib/app/kinStructuredProtocol";
import { splitTextIntoKinChunks } from "@/lib/app/transformIntent";
import {
  buildAttachCurrentTaskDraftUpdate as buildSharedAttachCurrentTaskDraftUpdate,
  buildAttachCurrentTaskMergedInput as buildSharedAttachCurrentTaskMergedInput,
  buildPostIngestTaskDraftUpdate as buildSharedPostIngestTaskDraftUpdate,
} from "@/lib/app/ingestTaskDraftUpdates";
import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/importSummaryText";
import {
  buildTaskPrepEnvelope,
  resolveCanonicalDocumentText,
} from "@/lib/app/ingestDocumentModel";
import { normalizeUsage } from "@/lib/tokenStats";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  ResponseMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { SharedIngestResult } from "@/lib/app/ingestClient";
import type { Message, KinMemoryState } from "@/types/chat";
import type { TaskDraft } from "@/types/task";
import type { TransformIntent } from "@/lib/app/transformIntent";

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

export type FileIngestTransformResult = {
  transformedTaskPrepEnvelope: string;
  transformedProtocolBodyText: string;
  transformFailed: boolean;
};

type PostIngestDraftTexts = {
  prepTaskText: string;
  deepenTaskText: string;
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

export function buildPostIngestTaskDraftUpdate(params: {
  previousDraft: TaskDraft;
  action: PostIngestAction;
  fileName: string;
  fileTitle: string;
  prepInput: string;
  prepTaskText: string;
  deepenTaskText: string;
  getResolvedTaskTitle: (args: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
}) {
  return buildSharedPostIngestTaskDraftUpdate(params);
}

export function buildFileIngestSummaryText(params: {
  fileTitle: string;
  storedDocumentSummary?: string;
  canonicalDocumentText?: string;
  resolvedKind: UploadKind;
  readPolicy: FileReadPolicy;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  action: PostIngestAction;
  kinPayloadTextLength: number;
  selectedCharCount: number;
  rawCharCount: number;
  blocksLength: number;
  autoCopyFileIngestSysInfoToKin: boolean;
  prepInput: string;
  prepTaskText: string;
  deepenTaskText: string;
}) {
  const actionLabel =
    params.action === "inject_only"
      ? "Inject only"
      : params.action === "inject_and_prep"
        ? "Inject + prep"
        : params.action === "inject_prep_deepen"
          ? "Inject + prep + deepen"
          : "Attach to current task";

  const summaryParts = [
    "File converted into Kin-ready text.",
    `Title: ${params.fileTitle}`,
    ...(params.storedDocumentSummary?.trim()
      ? [`Summary: ${params.storedDocumentSummary.trim()}`]
      : []),
    `Target: ${params.resolvedKind === "text" ? "Text" : "Image / PDF"}`,
    `Read policy: ${params.readPolicy}`,
    `${params.resolvedKind === "text" ? "Text ingest" : "Image detail"}: ${
      params.resolvedKind === "text" ? params.ingestMode : params.imageDetail
    }`,
    `Post-ingest action: ${actionLabel}`,
    `Injection characters: ${params.kinPayloadTextLength.toLocaleString()}`,
    `Extracted characters: ${params.selectedCharCount.toLocaleString()}`,
    ...(params.rawCharCount > 0 &&
    params.rawCharCount !== params.selectedCharCount
      ? [`Raw characters: ${params.rawCharCount.toLocaleString()}`]
      : []),
    `Blocks: ${params.blocksLength}`,
    "",
    params.autoCopyFileIngestSysInfoToKin
      ? `Set block 1/${params.blocksLength} to Kin input. After sending, the next part will be queued automatically.`
      : "Auto transfer to Kin input is OFF. The file was ingested and stored, but no SYS_INFO draft was set to Kin input.",
  ];
  if (params.action === "inject_only" && params.canonicalDocumentText?.trim()) {
    summaryParts.push("", "--------------------", params.canonicalDocumentText.trim());
  }
  if (params.action !== "inject_only" && params.prepTaskText) {
    summaryParts.push("", "--------------------", params.prepTaskText);
  }
  if (params.action === "inject_prep_deepen" && params.deepenTaskText) {
    summaryParts.push(
      "",
      "====================",
      "Deepened task result",
      params.deepenTaskText
    );
  }

  return summaryParts.join("\n");
}

export function buildAttachCurrentTaskMergedInput(params: {
  currentTaskText: string;
  fileName: string;
  prepInput: string;
  currentTaskDraft: TaskDraft;
  fileTitle: string;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
}) {
  return buildSharedAttachCurrentTaskMergedInput(params);
}

export function buildAttachCurrentTaskDraftUpdate(params: {
  previousDraft: TaskDraft;
  fileName: string;
  fileTitle: string;
  prepInput: string;
  mergedTaskText: string;
  resolveTaskTitleFromDraft: (
    draft: TaskDraft,
    params: {
      explicitTitle?: string;
      freeText?: string;
      searchQuery?: string;
      fallback?: string;
    }
  ) => string;
}) {
  return buildSharedAttachCurrentTaskDraftUpdate(params);
}

export async function resolveFileIngestTransformResult(params: {
  intent: TransformIntent;
  canonicalDocumentText: string;
  taskPrepEnvelopeBase: string;
  responseMode: ResponseMode;
  shouldTransformContent: (intent: TransformIntent) => boolean;
  transformTextWithIntent: (args: {
    text: string;
    intent: TransformIntent;
    responseMode: "strict" | "creative";
  }) => Promise<{ text: string; usage?: Parameters<typeof normalizeUsage>[0] }>;
  applyTaskUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
}): Promise<FileIngestTransformResult> {
  let transformedTaskPrepEnvelope = params.taskPrepEnvelopeBase;
  let transformedProtocolBodyText = params.canonicalDocumentText;

  if (!params.shouldTransformContent(params.intent)) {
    return {
      transformedTaskPrepEnvelope,
      transformedProtocolBodyText,
      transformFailed: false,
    };
  }

  try {
    const transformed = await params.transformTextWithIntent({
      text:
        params.intent.mode === "sys_info"
          ? params.canonicalDocumentText
          : params.taskPrepEnvelopeBase,
      intent: params.intent,
      responseMode:
        params.responseMode === "creative" ? "creative" : "strict",
    });

    if (params.intent.mode === "sys_info") {
      transformedProtocolBodyText =
        transformed.text.trim() || params.canonicalDocumentText;
    } else {
      transformedTaskPrepEnvelope =
        transformed.text.trim() || params.taskPrepEnvelopeBase;
    }
    params.applyTaskUsage(transformed.usage);

    return {
      transformedTaskPrepEnvelope,
      transformedProtocolBodyText,
      transformFailed: false,
    };
  } catch (error) {
    console.error("file transform failed", error);
    return {
      transformedTaskPrepEnvelope,
      transformedProtocolBodyText,
      transformFailed: true,
    };
  }
}

export async function resolvePostIngestTaskTexts(params: {
  action: PostIngestAction;
  prepInput: string;
  fileName: string;
  applyTaskUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
}) {
  const result: PostIngestDraftTexts = {
    prepTaskText: "",
    deepenTaskText: "",
  };

  if (
    params.action !== "inject_and_prep" &&
    params.action !== "inject_prep_deepen"
  ) {
    return result;
  }

  try {
    const prepData = await runAutoPrepTask(
      params.prepInput,
      `ingest-${params.fileName}`
    );
    result.prepTaskText = formatTaskResultText(prepData?.parsed, prepData?.raw);
    params.applyTaskUsage(prepData?.usage);

    if (params.action === "inject_prep_deepen") {
      try {
        const deepenData = await runAutoDeepenTask(
          result.prepTaskText,
          `prep-${params.fileName}`
        );
        result.deepenTaskText = formatTaskResultText(
          deepenData?.parsed,
          deepenData?.raw
        );
        params.applyTaskUsage(deepenData?.usage);
      } catch (error) {
        console.error("auto deepen task failed", error);
        result.deepenTaskText = "Auto deepen failed.";
      }
    }
  } catch (error) {
    console.error("auto prep task failed", error);
    result.prepTaskText = "Auto prep failed.";
  }

  return result;
}
