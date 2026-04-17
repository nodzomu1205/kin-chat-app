import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReceivedDocsDrawer from "@/components/panels/gpt/ReceivedDocsDrawer";

describe("ReceivedDocsDrawer", () => {
  it("keeps Google Drive actions visible even when the library is empty", () => {
    const html = renderToStaticMarkup(
      <ReceivedDocsDrawer
        multipartAssemblies={[]}
        referenceLibraryItems={[]}
        libraryReferenceCount={0}
        sourceDisplayCount={1}
        selectedTaskLibraryItemId=""
        onSelectTaskLibraryItem={() => {}}
        onMoveLibraryItem={() => {}}
        onChangeLibraryItemMode={() => {}}
        onStartAskAiModeSearch={() => Promise.resolve()}
        onImportYouTubeTranscript={() => Promise.resolve()}
        onSendYouTubeTranscriptToKin={() => Promise.resolve()}
        onDownloadMultipartAssembly={() => {}}
        onDeleteMultipartAssembly={() => {}}
        onDownloadStoredDocument={() => {}}
        onDeleteStoredDocument={() => {}}
        onDeleteSearchHistoryItem={() => {}}
        onSaveStoredDocument={() => {}}
        onShowLibraryItemInChat={() => {}}
        onSendLibraryItemToKin={() => Promise.resolve()}
        onUploadLibraryItemToGoogleDrive={() => Promise.resolve()}
        onOpenGoogleDriveFolder={() => {}}
        onImportFromGoogleDrive={() => Promise.resolve()}
      />
    );

    expect(html).toContain("Google Driveフォルダーを開く");
    expect(html).toContain("Google Driveからのファイルインポート");
  });

  it("uses mobile-safe wrapping styles for expanded content", () => {
    const html = renderToStaticMarkup(
      <ReceivedDocsDrawer
        multipartAssemblies={[]}
        referenceLibraryItems={[
          {
            id: "search:1",
            sourceId: "1",
            itemType: "search",
            title: "Long title",
            subtitle: "Long subtitle",
            summary: "Summary",
            excerptText: "Long excerpt",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            rawResultId: "RAW-1",
            sources: [
              {
                title: "Source",
                link: "https://example.com/really/long/path/that/should/wrap",
              },
            ],
          },
        ]}
        libraryReferenceCount={1}
        sourceDisplayCount={1}
        selectedTaskLibraryItemId=""
        onSelectTaskLibraryItem={() => {}}
        onMoveLibraryItem={() => {}}
        onChangeLibraryItemMode={() => {}}
        onStartAskAiModeSearch={() => Promise.resolve()}
        onImportYouTubeTranscript={() => Promise.resolve()}
        onSendYouTubeTranscriptToKin={() => Promise.resolve()}
        onDownloadMultipartAssembly={() => {}}
        onDeleteMultipartAssembly={() => {}}
        onDownloadStoredDocument={() => {}}
        onDeleteStoredDocument={() => {}}
        onDeleteSearchHistoryItem={() => {}}
        onSaveStoredDocument={() => {}}
        onShowLibraryItemInChat={() => {}}
        onSendLibraryItemToKin={() => Promise.resolve()}
        onUploadLibraryItemToGoogleDrive={() => Promise.resolve()}
        onOpenGoogleDriveFolder={() => {}}
        onImportFromGoogleDrive={() => Promise.resolve()}
        isMobile
      />
    );

    expect(html).toContain("overflow-wrap:anywhere");
    expect(html).toContain("max-width:100%");
  });
});
