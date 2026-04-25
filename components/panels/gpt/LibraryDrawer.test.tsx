import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LibraryDrawer from "@/components/panels/gpt/LibraryDrawer";

describe("LibraryDrawer", () => {
  it("keeps Google Drive and device import actions visible even when the library is empty", () => {
    const html = renderToStaticMarkup(
      <LibraryDrawer
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
        onImportGoogleDriveFile={() => Promise.resolve()}
        onIndexGoogleDriveFolder={() => Promise.resolve()}
        onImportGoogleDriveFolder={() => Promise.resolve()}
        onImportDeviceFile={() => Promise.resolve()}
        deviceImportAccept=".txt,.md,.pdf,image/*"
      />
    );

    expect(html).toContain("Google Drive");
    expect(html).toContain('aria-label="デバイスから取り込む"');
    expect(html).toContain(">デバイス<");
  });

  it("uses mobile-safe wrapping styles for library rows", () => {
    const html = renderToStaticMarkup(
      <LibraryDrawer
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
        onImportGoogleDriveFile={() => Promise.resolve()}
        onIndexGoogleDriveFolder={() => Promise.resolve()}
        onImportGoogleDriveFolder={() => Promise.resolve()}
        onImportDeviceFile={() => Promise.resolve()}
        deviceImportAccept=".txt,.md,.pdf,image/*"
        isMobile
      />
    );

    expect(html).toContain("max-width:100%");
    expect(html).toContain("flex-wrap:wrap");
    expect(html).toContain("width:100%");
  });
});
