import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import {
  buildPrepInputFromIngestResult,
  formatTaskResultText,
  runAutoDeepenTask,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import {
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
  type SharedIngestOptions,
  type SharedIngestResult,
} from "@/lib/app/ingestClient";
import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
} from "@/lib/app/kinStructuredProtocol";
import {
  buildKinDirectiveLines,
  splitTextIntoKinChunks,
} from "@/lib/app/transformIntent";
import { normalizeUsage } from "@/lib/tokenStats";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  ResponseMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { Message } from "@/types/chat";
import type { KinMemoryState } from "@/types/chat";
import type { SearchContext, TaskDraft } from "@/types/task";
import type { TransformIntent } from "@/lib/app/transformIntent";
import {
  buildAttachCurrentTaskDraftUpdate as buildSharedAttachCurrentTaskDraftUpdate,
  buildAttachCurrentTaskMergedInput as buildSharedAttachCurrentTaskMergedInput,
  buildPostIngestTaskDraftUpdate as buildSharedPostIngestTaskDraftUpdate,
} from "@/lib/app/ingestTaskDraftUpdates";

type IngestResult = SharedIngestResult;

type IngestExtractionArtifacts = {
  selectedLines: string[];
  selectedText: string;
  selectedCharCount: number;
  rawIngestText: string;
  rawCharCount: number;
  prepInputBase: string;
  sharedInfoBase: string;
};

type PostIngestDraftTexts = {
  prepTaskText: string;
  deepenTaskText: string;
};

type FileIngestTransformResult = {
  prepInput: string;
  sharedInfoText: string;
  transformFailed: boolean;
};

type IngestFlowArgs = {
  file: File;
  options: {
    kind: UploadKind;
    mode: IngestMode;
    detail: ImageDetail;
    action: PostIngestAction;
    readPolicy: FileReadPolicy;
    compactCharLimit: number;
    simpleImageCharLimit: number;
  };
  ingestLoading: boolean;
  responseMode: ResponseMode;
  gptInput: string;
  currentTaskDraft: TaskDraft;
  autoCopyFileIngestSysInfoToKin: boolean;
  gptStateRef: MutableRefObject<KinMemoryState>;
  chatRecentLimit: number;
  setIngestLoading: Dispatch<SetStateAction<boolean>>;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setKinInput: Dispatch<SetStateAction<string>>;
  setUploadKind: Dispatch<SetStateAction<UploadKind>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptState: Dispatch<SetStateAction<KinMemoryState>>;
  persistCurrentGptState?: (state: KinMemoryState) => void;
  setCurrentTaskDraft: Dispatch<SetStateAction<TaskDraft>>;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applyTaskUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  recordIngestedDocument: (document: {
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
    createdAt: string;
    updatedAt: string;
  }) => unknown;
  resolveTransformIntent: (args: {
    input: string;
    defaultMode: "sys_info" | "sys_task";
    responseMode: "strict" | "creative";
  }) => Promise<{ intent: TransformIntent; usage?: Parameters<typeof normalizeUsage>[0] }>;
  shouldTransformContent: (intent: TransformIntent) => boolean;
  transformTextWithIntent: (args: {
    text: string;
    intent: TransformIntent;
    responseMode: "strict" | "creative";
  }) => Promise<{ text: string; usage?: Parameters<typeof normalizeUsage>[0] }>;
  getTaskBaseText: () => string;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
  resolveTaskTitleFromDraft: (
    draft: TaskDraft,
    params: {
      explicitTitle?: string;
      freeText?: string;
      searchQuery?: string;
      fallback?: string;
    }
  ) => string;
  setActiveTabToKin?: () => void;
};

function appendMessage(
  setGptMessages: Dispatch<SetStateAction<Message[]>>,
  message: Message
) {
  setGptMessages((prev) => [...prev, message]);
}

function appendInfo(
  setGptMessages: Dispatch<SetStateAction<Message[]>>,
  text: string,
  sourceType: Message["meta"] extends infer M
    ? M extends { sourceType?: infer S }
      ? S
      : never
    : never = "file_ingest"
) {
  appendMessage(setGptMessages, {
    id: generateId(),
    role: "gpt",
    text,
    meta: {
      kind: "task_info",
      sourceType: sourceType as any,
    },
  });
}

function buildStoredDocumentSummary(text: string, fallbackTitle: string) {
  const trimmed = text.trim();
  if (!trimmed) return fallbackTitle;
  const normalized = trimmed.replace(/\s+/g, " ").trim();
  const withoutTitle = normalized.startsWith(fallbackTitle)
    ? normalized.slice(fallbackTitle.length).trimStart()
    : normalized;
  const basis = withoutTitle || normalized;
  const sentenceParts = basis
    .split(/(?<=[。．.!?！？])/)
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
  const prepInputBase =
    selectedLines.length > 0
      ? [
          `File: ${params.fileName}`,
          `Title: ${params.fileTitle}`,
          `Content:\n${selectedLines.join("\n")}`,
        ].join("\n\n")
      : buildPrepInputFromIngestResult(params.data, params.fileName);
  const sharedInfoBase =
    selectedText ||
    rawIngestText ||
    prepInputBase
      .replace(new RegExp(`^File:\\s*${params.fileName}\\s*`, "u"), "")
      .replace(new RegExp(`^Title:\\s*${params.fileTitle}\\s*`, "u"), "")
      .replace(/^Content:\s*/u, "")
      .trim();

  return {
    selectedLines,
    selectedText,
    selectedCharCount,
    rawIngestText,
    rawCharCount,
    prepInputBase,
    sharedInfoBase,
  };
}

export function buildFileIngestBridgeState(params: {
  currentGptState: KinMemoryState;
  fileName: string;
  fileTitle: string;
  resolvedKind: UploadKind;
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

  if (params.action === "inject_only") {
    summaryParts.push("", "--------------------", params.prepInput);
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
  sharedInfoBase: string;
  prepInputBase: string;
  responseMode: ResponseMode;
  shouldTransformContent: (intent: TransformIntent) => boolean;
  transformTextWithIntent: (args: {
    text: string;
    intent: TransformIntent;
    responseMode: "strict" | "creative";
  }) => Promise<{ text: string; usage?: Parameters<typeof normalizeUsage>[0] }>;
  applyTaskUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
}): Promise<FileIngestTransformResult> {
  let prepInput = params.prepInputBase;
  let sharedInfoText = params.sharedInfoBase;

  if (!params.shouldTransformContent(params.intent)) {
    return {
      prepInput,
      sharedInfoText,
      transformFailed: false,
    };
  }

  try {
    const transformed = await params.transformTextWithIntent({
      text:
        params.intent.mode === "sys_info"
          ? params.sharedInfoBase
          : params.prepInputBase,
      intent: params.intent,
      responseMode:
        params.responseMode === "creative" ? "creative" : "strict",
    });

    if (params.intent.mode === "sys_info") {
      sharedInfoText = transformed.text.trim() || params.sharedInfoBase;
    } else {
      prepInput = transformed.text.trim() || params.prepInputBase;
    }
    params.applyTaskUsage(transformed.usage);

    return {
      prepInput,
      sharedInfoText,
      transformFailed: false,
    };
  } catch (error) {
    console.error("file transform failed", error);
    return {
      prepInput,
      sharedInfoText,
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

export async function runFileIngestFlow({
  file,
  options,
  ingestLoading,
  responseMode,
  gptInput,
  currentTaskDraft,
  autoCopyFileIngestSysInfoToKin,
  gptStateRef,
  chatRecentLimit,
  setIngestLoading,
  setGptMessages,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setKinInput,
  setUploadKind,
  setGptInput,
  setGptState,
  persistCurrentGptState,
  setCurrentTaskDraft,
  applyIngestUsage,
  applyTaskUsage,
  recordIngestedDocument,
  resolveTransformIntent,
  shouldTransformContent,
  transformTextWithIntent,
  getTaskBaseText,
  getResolvedTaskTitle,
  resolveTaskTitleFromDraft,
  setActiveTabToKin,
}: IngestFlowArgs) {
  if (ingestLoading) return;

  setIngestLoading(true);

  try {
    const { response, data, resolvedKind } = await requestFileIngest({
      file,
      options: options as SharedIngestOptions,
    });
    if (!response.ok) {
      appendInfo(
        setGptMessages,
        `${resolveIngestErrorMessage({
          data,
          fallback: "File ingest failed.",
        })}\n\nPlease also check the /api/ingest response details.`
      );
      return;
    }

    const fileTitle = resolveIngestFileTitle({
      data,
      fallback: file.name,
    });

    applyIngestUsage(data?.usage);

    const {
      selectedLines,
      selectedText,
      selectedCharCount,
      rawIngestText,
      rawCharCount,
      prepInputBase,
      sharedInfoBase,
    } = resolveIngestExtractionArtifacts({
      data,
      fileName: file.name,
      fileTitle,
    });
    let prepInput = prepInputBase;
    let sharedInfoText = sharedInfoBase;

    const directiveText = gptInput.trim();
    const { intent, usage } = await resolveTransformIntent({
      input: directiveText,
      defaultMode: "sys_info",
      responseMode: responseMode === "creative" ? "creative" : "strict",
    });
    applyTaskUsage(usage);

    const transformResult = await resolveFileIngestTransformResult({
      intent,
      sharedInfoBase,
      prepInputBase,
      responseMode,
      shouldTransformContent,
      transformTextWithIntent,
      applyTaskUsage,
    });
    prepInput = transformResult.prepInput;
    sharedInfoText = transformResult.sharedInfoText;

    if (transformResult.transformFailed) {
      appendInfo(
        setGptMessages,
        "Transforming the ingested file content failed. Continuing with the original extracted content."
      );
    }

    const directiveLines = buildKinDirectiveLines(intent);
    const kinPayloadText =
      intent.mode === "sys_info" ? sharedInfoText : prepInput;
    const blocks = buildIngestKinInjectionBlocks({
      intentMode: intent.mode,
      currentTaskSlot: currentTaskDraft.slot,
      fileTitle,
      fileName: file.name,
      directiveLines,
      kinPayloadText,
    });

    if (blocks.length === 0) {
      appendInfo(setGptMessages, "No Kin injection blocks could be created.");
      return;
    }

    if (autoCopyFileIngestSysInfoToKin) {
      setPendingKinInjectionBlocks(blocks);
      setPendingKinInjectionIndex(0);
      setKinInput(blocks[0]);
      setUploadKind(resolvedKind);
      setGptInput("");
    } else {
      setPendingKinInjectionBlocks([]);
      setPendingKinInjectionIndex(0);
    }

    const { prepTaskText, deepenTaskText } = await resolvePostIngestTaskTexts({
      action: options.action,
      prepInput,
      fileName: file.name,
      applyTaskUsage,
    });

    appendInfo(
      setGptMessages,
      buildFileIngestSummaryText({
        fileTitle,
        resolvedKind,
        readPolicy: options.readPolicy,
        ingestMode: options.mode,
        imageDetail: options.detail,
        action: options.action,
        kinPayloadTextLength: kinPayloadText.length,
        selectedCharCount,
        rawCharCount,
        blocksLength: blocks.length,
        autoCopyFileIngestSysInfoToKin,
        prepInput,
        prepTaskText,
        deepenTaskText,
      })
    );

    const documentCreatedAt = new Date().toISOString();
    recordIngestedDocument({
      title: fileTitle,
      filename: file.name,
      text: prepInput,
      summary: buildStoredDocumentSummary(prepInput, fileTitle),
      taskId: currentTaskDraft.id || undefined,
      charCount: prepInput.length,
      createdAt: documentCreatedAt,
      updatedAt: documentCreatedAt,
    });

    const chatContextBody = selectedText || prepInput.trim();
    const chatContextExcerpt =
      chatContextBody.length > 1600
        ? `${chatContextBody.slice(0, 1600).trimEnd()}...`
        : chatContextBody;

    const currentGptState = gptStateRef.current;
    const { nextGptState } = buildFileIngestBridgeState({
      currentGptState,
      fileName: file.name,
      fileTitle,
      resolvedKind,
      selectedCharCount,
      rawCharCount,
      chatContextExcerpt,
      chatRecentLimit,
      injectedAt: new Date().toISOString(),
    });

    if (persistCurrentGptState) {
      persistCurrentGptState(nextGptState);
    } else {
      setGptState(nextGptState);
      gptStateRef.current = nextGptState;
    }

    if (options.action === "inject_only" && autoCopyFileIngestSysInfoToKin) {
      setActiveTabToKin?.();
      return;
    }

    if (options.action === "attach_to_current_task") {
      const currentTaskText = getTaskBaseText();

      if (!currentTaskText) {
        appendInfo(
          setGptMessages,
          "No current task exists, so the file was only injected. Create or open a task first to attach it."
        );
      } else {
        const mergedInput = buildAttachCurrentTaskMergedInput({
          currentTaskText,
          fileName: file.name,
          prepInput,
          currentTaskDraft,
          fileTitle,
          getResolvedTaskTitle,
        });

        try {
          const mergeData = await runAutoPrepTask(mergedInput, `attach-${file.name}`);
          const mergedTaskText = formatTaskResultText(mergeData?.parsed, mergeData?.raw);
          applyTaskUsage(mergeData?.usage);

          appendMessage(setGptMessages, {
            id: generateId(),
            role: "gpt",
            text: ["Current task updated with file content.", mergedTaskText].join("\n\n"),
            meta: {
              kind: "task_prep",
              sourceType: "file_ingest",
            },
          });

          setCurrentTaskDraft((prev) =>
            buildAttachCurrentTaskDraftUpdate({
              previousDraft: prev,
              fileName: file.name,
              fileTitle,
              prepInput,
              mergedTaskText,
              resolveTaskTitleFromDraft,
            })
          );
        } catch (error) {
          console.error("attach current task failed", error);
          appendInfo(setGptMessages, "Attaching the file to the current task failed.");
        }
      }
    }

    if (options.action === "inject_and_prep" && prepTaskText) {
      setCurrentTaskDraft((prev) =>
        buildPostIngestTaskDraftUpdate({
          previousDraft: prev,
          action: options.action,
          fileName: file.name,
          fileTitle,
          prepInput,
          prepTaskText,
          deepenTaskText,
          getResolvedTaskTitle,
        })
      );
    }

    if (options.action === "inject_prep_deepen") {
      setCurrentTaskDraft((prev) =>
        buildPostIngestTaskDraftUpdate({
          previousDraft: prev,
          action: options.action,
          fileName: file.name,
          fileTitle,
          prepInput,
          prepTaskText,
          deepenTaskText,
          getResolvedTaskTitle,
        })
      );
    }

    if (autoCopyFileIngestSysInfoToKin) {
      setActiveTabToKin?.();
    }
  } catch (error) {
    console.error(error);
    appendInfo(setGptMessages, "File ingest failed.");
  } finally {
    setIngestLoading(false);
  }
}
