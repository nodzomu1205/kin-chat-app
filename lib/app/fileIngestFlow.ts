import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import { formatTaskResultText, runAutoPrepTask } from "@/lib/app/gptTaskClient";
import {
  buildSharedIngestOptions,
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
} from "@/lib/app/ingestClient";
import { buildKinDirectiveLines } from "@/lib/app/transformIntent";
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
import type { TaskDraft } from "@/types/task";
import type { TransformIntent } from "@/lib/app/transformIntent";
import {
  normalizeLibrarySummaryUsage,
  requestGeneratedLibrarySummary,
} from "@/lib/app/librarySummaryClient";
import { cleanImportSummarySource } from "@/lib/app/importSummaryText";
import {
  buildCanonicalDocumentSummary,
  buildCanonicalSummarySource,
} from "@/lib/app/ingestDocumentModel";
import {
  buildAttachCurrentTaskDraftUpdate as buildAttachCurrentTaskDraftUpdateFromBuilders,
  buildAttachCurrentTaskMergedInput as buildAttachCurrentTaskMergedInputFromBuilders,
  buildFileIngestBridgeState as buildFileIngestBridgeStateFromBuilders,
  buildFileIngestSummaryText as buildFileIngestSummaryTextFromBuilders,
  buildIngestKinInjectionBlocks as buildIngestKinInjectionBlocksFromBuilders,
  buildPostIngestTaskDraftUpdate as buildPostIngestTaskDraftUpdateFromBuilders,
  resolveFileIngestTransformResult as resolveFileIngestTransformResultFromBuilders,
  resolveIngestExtractionArtifacts as resolveIngestExtractionArtifactsFromBuilders,
  resolvePostIngestTaskTexts as resolvePostIngestTaskTextsFromBuilders,
} from "@/lib/app/fileIngestFlowBuilders";

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
  autoGenerateFileImportSummary: boolean;
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
  applySummaryUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
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
      sourceType,
    },
  });
}

export {
  buildAttachCurrentTaskDraftUpdate,
  buildAttachCurrentTaskMergedInput,
  buildFileIngestBridgeState,
  buildFileIngestSummaryText,
  buildIngestKinInjectionBlocks,
  buildPostIngestTaskDraftUpdate,
  buildStoredDocumentSummary,
  resolveFileIngestTransformResult,
  resolveIngestExtractionArtifacts,
  resolvePostIngestTaskTexts,
} from "@/lib/app/fileIngestFlowBuilders";

function buildSummaryPrefixedContent(text: string, summary?: string) {
  const normalizedText = text.trim();
  const normalizedSummary = summary?.trim() || "";
  if (!normalizedSummary) return normalizedText;
  if (!normalizedText) return `Summary:\n${normalizedSummary}`;
  return [`Summary: ${normalizedSummary}`, "", normalizedText].join("\n");
}

export async function runFileIngestFlow({
  file,
  options,
  ingestLoading,
  responseMode,
  gptInput,
  currentTaskDraft,
  autoCopyFileIngestSysInfoToKin,
  autoGenerateFileImportSummary,
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
  applySummaryUsage,
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
      options: buildSharedIngestOptions({
        kind: options.kind,
        mode: options.mode,
        detail: options.detail,
        readPolicy: options.readPolicy,
        compactCharLimit: options.compactCharLimit,
        simpleImageCharLimit: options.simpleImageCharLimit,
      }),
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
      selectedCharCount,
      rawCharCount,
      canonicalDocumentText,
      taskPrepEnvelopeBase,
    } = resolveIngestExtractionArtifactsFromBuilders({
      data,
      fileName: file.name,
      fileTitle,
    });
    let taskPrepEnvelope = taskPrepEnvelopeBase;
    let protocolBodyText = canonicalDocumentText;

    const directiveText = gptInput.trim();
    const { intent, usage } = await resolveTransformIntent({
      input: directiveText,
      defaultMode: "sys_info",
      responseMode: responseMode === "creative" ? "creative" : "strict",
    });
    applyTaskUsage(usage);

    const transformResult = await resolveFileIngestTransformResultFromBuilders({
      intent,
      canonicalDocumentText,
      taskPrepEnvelopeBase,
      responseMode,
      shouldTransformContent,
      transformTextWithIntent,
      applyTaskUsage,
    });
    taskPrepEnvelope = transformResult.transformedTaskPrepEnvelope;
    protocolBodyText = transformResult.transformedProtocolBodyText;

    if (transformResult.transformFailed) {
      appendInfo(
        setGptMessages,
        "Transforming the ingested file content failed. Continuing with the original extracted content."
      );
    }

    const summarySourceText = buildCanonicalSummarySource(canonicalDocumentText);
    let documentSummary = buildCanonicalDocumentSummary(
      canonicalDocumentText,
      fileTitle
    );
    if (autoGenerateFileImportSummary && summarySourceText.trim()) {
      try {
        const summaryResult = await requestGeneratedLibrarySummary({
          title: fileTitle,
          text: summarySourceText,
        });
        if (summaryResult.summary?.trim()) {
          documentSummary = cleanImportSummarySource(
            summaryResult.summary
          ).trim();
        }
        applySummaryUsage(normalizeLibrarySummaryUsage(summaryResult.usage));
      } catch (error) {
        console.warn("File import summary generation failed", error);
      }
    }

    const directiveLines = buildKinDirectiveLines(intent);
    const kinPayloadText =
      intent.mode === "sys_info"
        ? buildSummaryPrefixedContent(protocolBodyText, documentSummary)
        : buildSummaryPrefixedContent(taskPrepEnvelope, documentSummary);
    const blocks = buildIngestKinInjectionBlocksFromBuilders({
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

    const { prepTaskText, deepenTaskText } =
      await resolvePostIngestTaskTextsFromBuilders({
        action: options.action,
        prepInput: taskPrepEnvelope,
        fileName: file.name,
        applyTaskUsage,
      });

    appendInfo(
      setGptMessages,
      buildFileIngestSummaryTextFromBuilders({
        fileTitle,
        storedDocumentSummary: documentSummary,
        canonicalDocumentText,
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
        prepInput: taskPrepEnvelope,
        prepTaskText,
        deepenTaskText,
      })
    );

    const documentCreatedAt = new Date().toISOString();
    const storedDocumentText = canonicalDocumentText.trim();
    recordIngestedDocument({
      title: fileTitle,
      filename: file.name,
      text: storedDocumentText,
      summary: documentSummary,
      taskId: currentTaskDraft.id || undefined,
      charCount: storedDocumentText.length,
      createdAt: documentCreatedAt,
      updatedAt: documentCreatedAt,
    });

    const chatContextBody = buildSummaryPrefixedContent(
      storedDocumentText,
      documentSummary
    );
    const chatContextExcerpt =
      chatContextBody.length > 1600
        ? `${chatContextBody.slice(0, 1600).trimEnd()}...`
        : chatContextBody;

    const currentGptState = gptStateRef.current;
    const { nextGptState } = buildFileIngestBridgeStateFromBuilders({
      currentGptState,
      fileName: file.name,
      fileTitle,
      resolvedKind,
      summary: documentSummary,
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
        const mergedInput = buildAttachCurrentTaskMergedInputFromBuilders({
          currentTaskText,
          fileName: file.name,
          prepInput: taskPrepEnvelope,
          currentTaskDraft,
          fileTitle,
          getResolvedTaskTitle,
        });

        try {
          const mergeData = await runAutoPrepTask(
            mergedInput,
            `attach-${file.name}`
          );
          const mergedTaskText = formatTaskResultText(
            mergeData?.parsed,
            mergeData?.raw
          );
          applyTaskUsage(mergeData?.usage);

          appendMessage(setGptMessages, {
            id: generateId(),
            role: "gpt",
            text: ["Current task updated with file content.", mergedTaskText].join(
              "\n\n"
            ),
            meta: {
              kind: "task_prep",
              sourceType: "file_ingest",
            },
          });

          setCurrentTaskDraft((prev) =>
            buildAttachCurrentTaskDraftUpdateFromBuilders({
              previousDraft: prev,
              fileName: file.name,
              fileTitle,
              prepInput: taskPrepEnvelope,
              mergedTaskText,
              resolveTaskTitleFromDraft,
            })
          );
        } catch (error) {
          console.error("attach current task failed", error);
          appendInfo(
            setGptMessages,
            "Attaching the file to the current task failed."
          );
        }
      }
    }

    if (options.action === "inject_and_prep" && prepTaskText) {
      setCurrentTaskDraft((prev) =>
        buildPostIngestTaskDraftUpdateFromBuilders({
          previousDraft: prev,
          action: options.action,
          fileName: file.name,
          fileTitle,
          prepInput: taskPrepEnvelope,
          prepTaskText,
          deepenTaskText,
          getResolvedTaskTitle,
        })
      );
    }

    if (options.action === "inject_prep_deepen") {
      setCurrentTaskDraft((prev) =>
        buildPostIngestTaskDraftUpdateFromBuilders({
          previousDraft: prev,
          action: options.action,
          fileName: file.name,
          fileTitle,
          prepInput: taskPrepEnvelope,
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
