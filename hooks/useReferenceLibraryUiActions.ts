import React, { useEffect } from "react";
import {
  buildLibraryItemChatDisplayText,
  buildLibraryItemDriveExport,
  buildLibraryItemKinSysInfo,
  normalizeLibraryChatDisplayText,
} from "@/lib/app/referenceLibraryItemActions";
import type { Message, ReferenceLibraryItem } from "@/types/chat";

type UseReferenceLibraryUiActionsArgs = {
  getLibraryItemById: (itemId: string) => ReferenceLibraryItem | null;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setKinInput: React.Dispatch<React.SetStateAction<string>>;
  focusGptPanel: () => boolean;
  focusKinPanel: () => boolean;
  openGoogleDriveFolder: () => boolean;
  importGoogleDriveFilePicker: () => void | Promise<void>;
  indexGoogleDriveFolderPicker: () => void | Promise<void>;
  importGoogleDriveFolderPicker: () => void | Promise<void>;
  uploadLibraryItemToDrivePicker: (
    item: ReferenceLibraryItem
  ) => boolean | Promise<boolean>;
};

function createLibraryUiMessage(text: string): Message {
  return {
    id: `library-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
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
  getLibraryItemById,
  setGptMessages,
  setKinInput,
  focusGptPanel,
  focusKinPanel,
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
          message.role !== "user" ||
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

  const showLibraryItemInChat = (itemId: string) => {
    const item = getLibraryItemById(itemId);
    if (!item) return;
    setGptMessages((prev) => [
      ...prev,
      createLibraryUiMessage(buildLibraryItemChatDisplayText(item)),
    ]);
    focusGptPanel();
  };

  const sendLibraryItemToKin = (itemId: string) => {
    const item = getLibraryItemById(itemId);
    if (!item) return;
    setKinInput(buildLibraryItemKinSysInfo(item));
    focusKinPanel();
  };

  const uploadLibraryItemToGoogleDrive = (itemId: string) => {
    const item = getLibraryItemById(itemId);
    if (!item) return;
    const maybeUploaded = uploadLibraryItemToDrivePicker(item);
    if (maybeUploaded instanceof Promise) {
      void maybeUploaded.then((uploaded) => {
        if (uploaded) return;
        const artifact = buildLibraryItemDriveExport(item);
        downloadTextFile(artifact.fileName, artifact.text);
        openGoogleDriveFolder();
      });
      return;
    }
    if (maybeUploaded) return;
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
    uploadLibraryItemToGoogleDrive,
    importGoogleDriveFile,
    indexGoogleDriveFolder,
    importGoogleDriveFolder,
  };
}
