import React, { useEffect } from "react";
import {
  buildLibraryItemChatDisplayText,
  buildLibraryItemDriveExport,
  buildLibraryItemKinSysInfo,
  normalizeLibraryChatDisplayText,
} from "@/lib/app/reference-library/referenceLibraryItemActions";
import {
  buildLibraryItemsAggregateKinSysInfo,
  buildLibraryItemsAggregateText,
  type LibraryBulkActionMode,
} from "@/lib/app/reference-library/libraryItemAggregation";
import {
  type PendingKinInjectionPurpose,
} from "@/lib/app/kin-protocol/kinMultipart";
import { applyKinSysInfoInjection } from "@/lib/app/kin-protocol/kinInfoInjection";
import type { GptMemoryRuntime } from "@/lib/app/ui-state/chatPageGptMemoryControls";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
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
    const nextMessages = [
      ...gptMessages,
      createLibraryUiMessage(buildLibraryItemChatDisplayText(item)),
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

  const showAllLibraryItemsInChat = async (mode: LibraryBulkActionMode) => {
    if (libraryItems.length === 0) return;
    const nextMessages = [
      ...gptMessages,
      createLibraryUiMessage(
        buildLibraryItemsAggregateText({ items: libraryItems, mode })
      ),
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

  const sendAllLibraryItemsToKin = (mode: LibraryBulkActionMode) => {
    if (libraryItems.length === 0) return;
    applyKinInputBlocks(
      buildLibraryItemsAggregateKinSysInfo({ items: libraryItems, mode })
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

  const importGoogleDriveFile = () => importGoogleDriveFilePicker();

  const indexGoogleDriveFolder = () => indexGoogleDriveFolderPicker();

  const importGoogleDriveFolder = () => importGoogleDriveFolderPicker();

  return {
    showLibraryItemInChat,
    sendLibraryItemToKin,
    showAllLibraryItemsInChat,
    sendAllLibraryItemsToKin,
    uploadLibraryItemToGoogleDrive,
    importGoogleDriveFile,
    indexGoogleDriveFolder,
    importGoogleDriveFolder,
  };
}

