"use client";

import React from "react";
import ReceivedDocsDrawer from "@/components/panels/gpt/ReceivedDocsDrawer";
import type {
  GptPanelReferenceProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";

type Props = Pick<
  GptPanelReferenceProps,
  | "multipartAssemblies"
  | "referenceLibraryItems"
  | "selectedTaskLibraryItemId"
  | "onSelectTaskLibraryItem"
  | "onMoveLibraryItem"
  | "onChangeLibraryItemMode"
  | "onStartAskAiModeSearch"
  | "onImportYouTubeTranscript"
  | "onSendYouTubeTranscriptToKin"
  | "onDownloadMultipartAssembly"
  | "onDeleteMultipartAssembly"
  | "onDownloadStoredDocument"
  | "onDeleteStoredDocument"
  | "onDeleteSearchHistoryItem"
  | "onSaveStoredDocument"
  | "onShowLibraryItemInChat"
  | "onSendLibraryItemToKin"
  | "onUploadLibraryItemToGoogleDrive"
> &
  Pick<
    GptPanelSettingsProps,
    | "libraryReferenceCount"
    | "sourceDisplayCount"
    | "onOpenGoogleDriveFolder"
    | "onImportGoogleDriveFile"
    | "onIndexGoogleDriveFolder"
    | "onImportGoogleDriveFolder"
  >;

export default function SearchRawDrawer(props: Props) {
  return (
    <ReceivedDocsDrawer
      {...props}
      initialTab="search"
      onImportDeviceFile={() => Promise.resolve()}
      deviceImportAccept=".txt,.md,.json,.csv,.pdf,image/*"
      deviceImportDisabled
    />
  );
}
