import type {
  GptPanelReferenceProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";
import type { ImageImportSidecarText } from "@/lib/app/image/imageImportFlow";

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
  | "onShowAllLibraryItemsInChat"
  | "onSendAllLibraryItemsToKin"
  | "onUploadLibraryItemToGoogleDrive"
  | "onRenderPresentationPlanToPpt"
> &
  Pick<
    GptPanelSettingsProps,
    | "libraryReferenceCount"
    | "imageLibraryReferenceCount"
    | "sourceDisplayCount"
    | "onOpenGoogleDriveFolder"
    | "onImportGoogleDriveFile"
    | "onIndexGoogleDriveFolder"
    | "onImportGoogleDriveFolder"
  > & {
    isMobile?: boolean;
    onImportDeviceFile: (file: File) => void | Promise<void>;
    onImportDeviceImageFile: (
      file: File,
      sidecarText?: ImageImportSidecarText
    ) => void | Promise<void>;
    onImportGoogleDriveImageFile: () => void | Promise<void>;
    deviceImportAccept: string;
    imageImportAccept: string;
    deviceImportDisabled?: boolean;
  };
