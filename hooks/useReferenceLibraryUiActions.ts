import type React from "react";
import { buildLibraryItemChatDisplayText, buildLibraryItemDriveExport, buildLibraryItemKinSysInfo } from "@/lib/app/referenceLibraryItemActions";
import type { Message, ReferenceLibraryItem } from "@/types/chat";

type UseReferenceLibraryUiActionsArgs = {
  getLibraryItemById: (itemId: string) => ReferenceLibraryItem | null;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setKinInput: React.Dispatch<React.SetStateAction<string>>;
  focusGptPanel: () => boolean;
  focusKinPanel: () => boolean;
  openGoogleDriveFolder: () => boolean;
  importFromGoogleDrivePicker: () => void | Promise<void>;
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
  importFromGoogleDrivePicker,
  uploadLibraryItemToDrivePicker,
}: UseReferenceLibraryUiActionsArgs) {
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

  const importFromGoogleDrive = () => {
    return importFromGoogleDrivePicker();
  };

  return {
    showLibraryItemInChat,
    sendLibraryItemToKin,
    uploadLibraryItemToGoogleDrive,
    importFromGoogleDrive,
  };
}
