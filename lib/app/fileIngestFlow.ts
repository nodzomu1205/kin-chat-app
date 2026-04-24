import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import {
  buildSharedIngestOptions,
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
} from "@/lib/app/ingestClient";
import { addUsage, normalizeUsage } from "@/lib/tokenStats";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { Message } from "@/types/chat";
import type { KinMemoryState } from "@/types/chat";
import type { TaskDraft } from "@/types/task";
import {
  normalizeLibrarySummaryUsage,
  requestGeneratedLibrarySummary,
} from "@/lib/app/librarySummaryClient";
import { cleanImportSummarySource } from "@/lib/app/importSummaryText";
import {
  buildIngestedDocumentFilename,
  buildCanonicalSummarySource,
} from "@/lib/app/ingestDocumentModel";
import {
  buildFileIngestBridgeState as buildFileIngestBridgeStateFromBuilders,
  buildIngestKinInjectionBlocks as buildIngestKinInjectionBlocksFromBuilders,
  resolveIngestExtractionArtifacts as resolveIngestExtractionArtifactsFromBuilders,
} from "@/lib/app/fileIngestFlowBuilders";

type IngestFlowArgs = {
  file: File;
  options: {
    kind: UploadKind;
    mode: IngestMode;
    detail: ImageDetail;
    readPolicy: FileReadPolicy;
    compactCharLimit: number;
    simpleImageCharLimit: number;
  };
  ingestLoading: boolean;
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
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
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
  buildFileIngestBridgeState,
  buildIngestKinInjectionBlocks,
  buildStoredDocumentSummary,
  resolveIngestExtractionArtifacts,
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
  applyIngestUsage,
  recordIngestedDocument,
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
    const storedFilename = buildIngestedDocumentFilename({
      title: fileTitle,
      fallbackFilename: file.name,
    });
    let totalIngestUsage = normalizeUsage(data?.usage);

    const {
      selectedCharCount,
      rawCharCount,
      canonicalDocumentText,
    } = resolveIngestExtractionArtifactsFromBuilders({
      data,
      fileName: file.name,
      fileTitle,
    });

    const summarySourceText = buildCanonicalSummarySource(canonicalDocumentText);
    let documentSummary = "";
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
        totalIngestUsage = addUsage(
          totalIngestUsage,
          normalizeUsage(normalizeLibrarySummaryUsage(summaryResult.usage))
        );
      } catch (error) {
        console.warn("File import summary generation failed", error);
      }
    }

    applyIngestUsage(totalIngestUsage);

    const kinPayloadText = buildSummaryPrefixedContent(
      canonicalDocumentText,
      documentSummary
    );
    const blocks = buildIngestKinInjectionBlocksFromBuilders({
      intentMode: "sys_info",
      currentTaskSlot: currentTaskDraft.slot,
      fileTitle,
      fileName: file.name,
      directiveLines: [],
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

    const documentCreatedAt = new Date().toISOString();
    const storedDocumentText = canonicalDocumentText.trim();
    recordIngestedDocument({
      title: fileTitle,
      filename: storedFilename,
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

    if (autoCopyFileIngestSysInfoToKin) {
      setActiveTabToKin?.();
      return;
    }
  } catch (error) {
    console.error(error);
    appendInfo(setGptMessages, "File ingest failed.");
  } finally {
    setIngestLoading(false);
  }
}
