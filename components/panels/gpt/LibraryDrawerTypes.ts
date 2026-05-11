import type {
  GptPanelReferenceProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";
import type { ImageImportSidecarText } from "@/lib/app/image/imageImportFlow";
import type { SetStateAction } from "react";

export type LibraryViewRequest = {
  view: "library" | "images" | "db" | "dbLog";
  key: number;
};

export type LibraryDrawerView = LibraryViewRequest["view"];

export type LibraryDrawerProps = Pick<
  GptPanelReferenceProps,
  | "multipartAssemblies"
  | "referenceLibraryItems"
  | "libraryRagIndexStates"
  | "selectedTaskLibraryItemId"
  | "onSelectTaskLibraryItem"
  | "onMoveLibraryItem"
  | "onChangeLibraryItemMode"
  | "onIndexLibraryItemForRag"
  | "onStartAskAiModeSearch"
  | "onImportYouTubeTranscript"
  | "onSendYouTubeTranscriptToKin"
  | "onDownloadMultipartAssembly"
  | "onDeleteMultipartAssembly"
  | "onDownloadStoredDocument"
  | "onDeleteStoredDocument"
  | "onDeleteSearchHistoryItem"
  | "onSaveSearchHistoryItem"
  | "onSaveStoredDocument"
  | "onShowLibraryItemInChat"
  | "onSendLibraryItemToKin"
  | "onShowAllLibraryItemsInChat"
  | "onSendAllLibraryItemsToKin"
  | "onDownloadLibraryItem"
  | "onUploadLibraryItemToGoogleDrive"
  | "onRenderPresentationPlanToPpt"
> &
  Pick<
    GptPanelSettingsProps,
    | "libraryReferenceCount"
    | "libraryRagCandidateCount"
    | "imageLibraryReferenceCount"
    | "sourceDisplayCount"
    | "onOpenGoogleDriveFolder"
    | "onImportGoogleDriveFile"
    | "onIndexGoogleDriveFolder"
    | "onImportGoogleDriveFolder"
  > & {
    isMobile?: boolean;
    onImportDeviceFile: (
      file: File,
      sidecarText?: ImageImportSidecarText
    ) => void | Promise<void>;
    onImportDeviceImageFile: (
      file: File,
      sidecarText?: ImageImportSidecarText
    ) => void | Promise<void>;
    onImportGoogleDriveImageFile: () => void | Promise<void>;
    deviceImportAccept: string;
    imageImportAccept: string;
    deviceImportDisabled?: boolean;
    libraryViewRequest?: LibraryViewRequest | null;
    activeLibraryView?: LibraryDrawerView;
    onChangeLibraryView?: (view: LibraryDrawerView) => void;
    setGptInputDraft?: (value: SetStateAction<string>) => void;
  };
