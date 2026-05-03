import React, { useEffect } from "react";
import {
  buildLibraryItemChatDisplayText,
  buildLibraryItemDriveExport,
  buildLibraryItemKinSysInfo,
  normalizeLibraryChatDisplayText,
} from "@/lib/app/reference-library/referenceLibraryItemActions";
import {
  buildFramePresentationSpecFromTaskPlan,
  buildPresentationSpecFromTaskPlan,
  buildPresentationTaskPlanFromText,
  hasRenderablePresentationTaskPlan,
} from "@/lib/app/presentation/presentationTaskPlanning";
import { isGeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import { hydrateGeneratedImagePayload } from "@/lib/app/image/imageAssetStorage";
import { buildGeneratedImageDisplayText } from "@/lib/app/image/imageDisplayText";
import {
  buildLibraryItemsAggregateKinSysInfo,
  buildLibraryItemsAggregateText,
  type LibraryBulkActionScope,
  type LibraryBulkActionMode,
} from "@/lib/app/reference-library/libraryItemAggregation";
import {
  type PendingKinInjectionPurpose,
} from "@/lib/app/kin-protocol/kinMultipart";
import { applyKinSysInfoInjection } from "@/lib/app/kin-protocol/kinInfoInjection";
import type { GptMemoryRuntime } from "@/lib/app/ui-state/chatPageGptMemoryControls";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";
import type { ConversationUsageOptions, normalizeUsage } from "@/lib/shared/tokenStats";

type UseReferenceLibraryUiActionsArgs = {
  libraryItems: ReferenceLibraryItem[];
  getLibraryItemById: (itemId: string) => ReferenceLibraryItem | null;
  gptMessages: Message[];
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setKinInput: React.Dispatch<React.SetStateAction<string>>;
  setPendingKinInjectionBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  setPendingKinInjectionIndex: React.Dispatch<React.SetStateAction<number>>;
  setPendingKinInjectionPurpose: React.Dispatch<
    React.SetStateAction<PendingKinInjectionPurpose>
  >;
  focusGptPanel: () => boolean;
  focusKinPanel: () => boolean;
  gptMemoryRuntime: GptMemoryRuntime;
  applyChatUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
  applyCompressionUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  openGoogleDriveFolder: () => boolean;
  importGoogleDriveFilePicker: () => void | Promise<void>;
  indexGoogleDriveFolderPicker: () => void | Promise<void>;
  importGoogleDriveFolderPicker: () => void | Promise<void>;
  uploadLibraryItemToDrivePicker: (
    item: ReferenceLibraryItem
  ) =>
    | "uploaded"
    | "unavailable"
    | "cancelled"
      | Promise<"uploaded" | "unavailable" | "cancelled">;
  updateStoredDocument: (
    documentId: string,
    patch: Partial<
      Pick<StoredDocument, "title" | "text" | "summary" | "structuredPayload">
    >
  ) => void;
};

function createLibraryUiMessage(text: string): Message {
  return {
    id: `library-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "gpt",
    text,
    meta: {
      kind: "task_info",
      sourceType: "manual",
    },
  };
}

function downloadTextFile(fileName: string, text: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function isPresentationTaskPlan(value: unknown): value is PresentationTaskPlan {
  return (
    !!value &&
    typeof value === "object" &&
    (value as PresentationTaskPlan).version === "0.1-presentation-task-plan"
  );
}

function createPresentationBlobUrl(args: {
  contentBase64?: string;
  mimeType?: string;
}) {
  if (!args.contentBase64 || typeof window === "undefined") return "";
  const binary = window.atob(args.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(
    new Blob([bytes], {
      type:
        args.mimeType ||
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
  );
}

function createImageBlobUrl(args: { contentBase64?: string; mimeType?: string }) {
  if (!args.contentBase64 || typeof window === "undefined") return "";
  const binary = window.atob(args.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(
    new Blob([bytes], {
      type: args.mimeType || "image/png",
    })
  );
}

async function buildGeneratedImageChatDisplayText(item: ReferenceLibraryItem) {
  const payload = isGeneratedImageLibraryPayload(item.structuredPayload)
    ? item.structuredPayload
    : null;
  if (!payload) return buildLibraryItemChatDisplayText(item);
  const hydrated = await hydrateGeneratedImagePayload(payload);
  const path = createImageBlobUrl({
    contentBase64: hydrated.base64,
    mimeType: hydrated.mimeType,
  });
  return buildGeneratedImageDisplayText({
    payload: hydrated,
    imagePath: path,
  });
}

function filterLibraryItemsByScope(
  items: ReferenceLibraryItem[],
  scope: LibraryBulkActionScope = "library"
) {
  return scope === "images"
    ? items.filter((item) => item.artifactType === "generated_image")
    : items.filter((item) => item.artifactType !== "generated_image");
}

export function useReferenceLibraryUiActions({
  libraryItems,
  getLibraryItemById,
  gptMessages,
  setGptMessages,
  setKinInput,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setPendingKinInjectionPurpose,
  focusGptPanel,
  focusKinPanel,
  gptMemoryRuntime,
  applyChatUsage,
  applyCompressionUsage,
  openGoogleDriveFolder,
  importGoogleDriveFilePicker,
  indexGoogleDriveFolderPicker,
  importGoogleDriveFolderPicker,
  uploadLibraryItemToDrivePicker,
  updateStoredDocument,
}: UseReferenceLibraryUiActionsArgs) {
  useEffect(() => {
    setGptMessages((prev) => {
      let changed = false;
      const next = prev.map((message) => {
        if (
          message.meta?.kind !== "task_info" ||
          message.meta?.sourceType !== "manual"
        ) {
          return message;
        }
        const normalizedText = normalizeLibraryChatDisplayText(message.text);
        if (normalizedText === message.text) {
          return message;
        }
        changed = true;
        return {
          ...message,
          text: normalizedText,
        };
      });
      return changed ? next : prev;
    });
  }, [setGptMessages]);

  const showLibraryItemInChat = async (itemId: string) => {
    const item = getLibraryItemById(itemId);
    if (!item) return;
    const displayText =
      item.artifactType === "generated_image"
        ? await buildGeneratedImageChatDisplayText(item)
        : buildLibraryItemChatDisplayText(item);
    const nextMessages = [
      ...gptMessages,
      createLibraryUiMessage(displayText),
    ];
    setGptMessages(nextMessages);
    focusGptPanel();
    const updatedRecent = nextMessages.slice(-gptMemoryRuntime.chatRecentLimit);
    const memoryResult = await gptMemoryRuntime.handleGptMemory(updatedRecent, {});
    if (memoryResult.fallbackUsage) {
      applyChatUsage(memoryResult.fallbackUsage, {
        mergeIntoLast: true,
        followupMetrics: memoryResult.fallbackMetrics,
        followupUsageDetails: memoryResult.fallbackUsageDetails,
        followupDebug: memoryResult.fallbackDebug,
      });
    }
    if (memoryResult.compressionUsage) {
      applyCompressionUsage(memoryResult.compressionUsage);
    }
  };

  const showAllLibraryItemsInChat = async (
    mode: LibraryBulkActionMode,
    scope: LibraryBulkActionScope = "library"
  ) => {
    const scopedItems = filterLibraryItemsByScope(libraryItems, scope);
    if (scopedItems.length === 0) return;
    const displayText =
      scope === "images"
        ? (
            await Promise.all(
              scopedItems.map((item) => buildGeneratedImageChatDisplayText(item))
            )
          )
            .join("\n\n---\n\n")
            .trim()
        : buildLibraryItemsAggregateText({ items: scopedItems, mode });
    const nextMessages = [
      ...gptMessages,
      createLibraryUiMessage(displayText),
    ];
    setGptMessages(nextMessages);
    focusGptPanel();
    const updatedRecent = nextMessages.slice(-gptMemoryRuntime.chatRecentLimit);
    const memoryResult = await gptMemoryRuntime.handleGptMemory(updatedRecent, {});
    if (memoryResult.fallbackUsage) {
      applyChatUsage(memoryResult.fallbackUsage, {
        mergeIntoLast: true,
        followupMetrics: memoryResult.fallbackMetrics,
        followupUsageDetails: memoryResult.fallbackUsageDetails,
        followupDebug: memoryResult.fallbackDebug,
      });
    }
    if (memoryResult.compressionUsage) {
      applyCompressionUsage(memoryResult.compressionUsage);
    }
  };

  const applyKinInputBlocks = (text: string) => {
    applyKinSysInfoInjection({
      text,
      setKinInput,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setPendingKinInjectionPurpose,
      purpose: "info_share",
    });
    focusKinPanel();
  };

  const sendLibraryItemToKin = (itemId: string) => {
    const item = getLibraryItemById(itemId);
    if (!item) return;
    applyKinInputBlocks(buildLibraryItemKinSysInfo(item));
  };

  const sendAllLibraryItemsToKin = (
    mode: LibraryBulkActionMode,
    scope: LibraryBulkActionScope = "library"
  ) => {
    const scopedItems = filterLibraryItemsByScope(libraryItems, scope);
    if (scopedItems.length === 0) return;
    applyKinInputBlocks(
      buildLibraryItemsAggregateKinSysInfo({ items: scopedItems, mode, scope })
    );
  };

  const uploadLibraryItemToGoogleDrive = (itemId: string) => {
    const item = getLibraryItemById(itemId);
    if (!item) return;
    const maybeUploaded = uploadLibraryItemToDrivePicker(item);
    if (maybeUploaded instanceof Promise) {
      void maybeUploaded.then((status) => {
        if (status === "uploaded" || status === "cancelled") return;
        const artifact = buildLibraryItemDriveExport(item);
        downloadTextFile(artifact.fileName, artifact.text);
        openGoogleDriveFolder();
      });
      return;
    }
    if (maybeUploaded === "uploaded" || maybeUploaded === "cancelled") return;
    const artifact = buildLibraryItemDriveExport(item);
    downloadTextFile(artifact.fileName, artifact.text);
    openGoogleDriveFolder();
  };

  const renderPresentationPlanToPpt = async (itemId: string) => {
    const item = getLibraryItemById(itemId);
    if (!item || item.artifactType !== "presentation_plan") return;
    const parsedPlan = buildPresentationTaskPlanFromText({
      title: item.title,
      text: item.excerptText,
    });
    const storedPlan = isPresentationTaskPlan(item.structuredPayload)
      ? item.structuredPayload
      : null;
    const plan =
      parsedPlan.slides.length > 0
        ? {
            ...parsedPlan,
            latestPptx: storedPlan?.latestPptx || null,
          }
        : storedPlan || parsedPlan;
    if (!hasRenderablePresentationTaskPlan(plan)) {
      setGptMessages((prev) => [
        ...prev,
        createLibraryUiMessage(
          "PPTX出力に必要なスライド設計JSONがありません。PPT設計書を更新してからPPTX出力してください。"
        ),
      ]);
      focusGptPanel();
      return;
    }
    const frameSpec = buildFramePresentationSpecFromTaskPlan(plan);
    const spec = frameSpec ? null : buildPresentationSpecFromTaskPlan(plan);
    const response = await fetch("/api/presentation-render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: item.sourceId.replace(/[^A-Za-z0-9_-]+/g, "_"),
        ...(frameSpec ? { frameSpec } : { spec }),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      output?: {
        filename?: string;
        path?: string;
        contentBase64?: string;
        mimeType?: string;
        createdAt?: string;
        slideCount?: number;
      };
      error?: unknown;
    };
    if (!response.ok || !data.output) {
      const detail =
        typeof data.error === "string" ? data.error : "PPTX output failed.";
      setGptMessages((prev) => [...prev, createLibraryUiMessage(detail)]);
      return;
    }
    const path =
      data.output.path ||
      createPresentationBlobUrl({
        contentBase64: data.output.contentBase64,
        mimeType: data.output.mimeType,
      });
    const title = frameSpec?.title || spec?.title || item.title;
    const slideCount =
      frameSpec?.slideFrames.length || spec?.slides.length || data.output.slideCount || 0;
    const filename = data.output.filename || `${title}.pptx`;
    const nextPlan: PresentationTaskPlan = {
      ...plan,
      latestPptx: {
        filename,
        path,
        createdAt: data.output.createdAt || new Date().toISOString(),
        slideCount: data.output.slideCount || slideCount,
      },
      updatedAt: new Date().toISOString(),
    };
    updateStoredDocument(item.sourceId, {
      structuredPayload: nextPlan,
      summary: item.summary,
    });
    setGptMessages((prev) => [
      ...prev,
      createLibraryUiMessage(
        [
          "Presentation PPTX created from design plan.",
          "",
          `Title: ${title}`,
          `Slides: ${slideCount}`,
          path ? `PPTX: [${filename}](${path})` : `File: ${filename}`,
        ].join("\n")
      ),
    ]);
    focusGptPanel();
  };

  const importGoogleDriveFile = () => importGoogleDriveFilePicker();

  const indexGoogleDriveFolder = () => indexGoogleDriveFolderPicker();

  const importGoogleDriveFolder = () => importGoogleDriveFolderPicker();

  return {
    showLibraryItemInChat,
    sendLibraryItemToKin,
    showAllLibraryItemsInChat,
    sendAllLibraryItemsToKin,
    uploadLibraryItemToGoogleDrive,
    renderPresentationPlanToPpt,
    importGoogleDriveFile,
    indexGoogleDriveFolder,
    importGoogleDriveFolder,
  };
}

