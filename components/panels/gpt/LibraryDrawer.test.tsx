import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LibraryDrawer from "@/components/panels/gpt/LibraryDrawer";
import LibraryItemMetadata from "@/components/panels/gpt/LibraryItemMetadata";

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

  it("renders library item labels without mojibake", () => {
    const item = {
      id: "doc:1",
      sourceId: "doc:1",
      itemType: "ingested_file" as const,
      title: "farmers 360 link",
      subtitle: "取込文書 / 04/25 19:01",
      filename: "farmers.txt",
      summary: "要約テキスト",
      excerptText: "本文",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const html = renderToStaticMarkup(
      <>
        <LibraryDrawer
          multipartAssemblies={[]}
          referenceLibraryItems={[item]}
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
        />
        <LibraryItemMetadata item={item} multipartSource={null} />
      </>
    );

    expect(html).toContain("取込文書");
    expect(html).toContain("タスクに使う");
    expect(html).toContain("ダウンロード");
    expect(html).toContain("全設定に従う");
    expect(html).toContain("ファイル名:");
    expect(html).toContain(">↑<");
    expect(html).toContain(">↓<");
    expect(html).toContain(">×<");
    expect(html).toContain(">見<");
    expect(html).toContain(">送<");
    expect(html).toContain(">保<");
    expect(html).not.toMatch(/[繧縺譁荳蜿邵蝨郢陷隴竊﨟隨]/u);
  });
});
