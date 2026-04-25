import type {
  GptPanelReferenceProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";

export type LibraryTab = "all" | "kin" | "ingest" | "search";

export type LibraryDrawerProps = Pick<
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
  > & {
    initialTab?: LibraryTab;
    isMobile?: boolean;
    onImportDeviceFile: (file: File) => void | Promise<void>;
    deviceImportAccept: string;
    deviceImportDisabled?: boolean;
  };
