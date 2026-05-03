import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LibraryDrawer from "@/components/panels/gpt/LibraryDrawer";
import { LibraryImportControls } from "@/components/panels/gpt/LibraryDrawerControls";
import LibraryItemMetadata from "@/components/panels/gpt/LibraryItemMetadata";
import type { ReferenceLibraryItem } from "@/types/chat";

function renderLibraryDrawer(
  props: Partial<React.ComponentProps<typeof LibraryDrawer>> = {}
) {
  return renderToStaticMarkup(
    <LibraryDrawer
      multipartAssemblies={[]}
      referenceLibraryItems={[]}
      libraryReferenceCount={0}
      imageLibraryReferenceCount={0}
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
      onShowAllLibraryItemsInChat={() => Promise.resolve()}
      onSendAllLibraryItemsToKin={() => Promise.resolve()}
      onUploadLibraryItemToGoogleDrive={() => Promise.resolve()}
      onRenderPresentationPlanToPpt={() => Promise.resolve()}
      onOpenGoogleDriveFolder={() => {}}
      onImportGoogleDriveFile={() => Promise.resolve()}
      onIndexGoogleDriveFolder={() => Promise.resolve()}
      onImportGoogleDriveFolder={() => Promise.resolve()}
      onImportGoogleDriveImageFile={() => Promise.resolve()}
      onImportDeviceFile={() => Promise.resolve()}
      onImportDeviceImageFile={() => Promise.resolve()}
      deviceImportAccept=".txt,.md,.pdf,image/*"
      imageImportAccept="image/*"
      {...props}
    />
  );
}

describe("LibraryDrawer", () => {
  it("keeps the collapsible library action launcher visible when the library is empty", () => {
    const html = renderLibraryDrawer();

    expect(html).toContain("ライブラリ操作");
    expect(html).toContain("まだライブラリ項目はありません。");
    expect(html).not.toContain(">Google Drive<");
    expect(html).not.toContain(">デバイス<");
  });

  it("does not render the removed library category switcher", () => {
    const html = renderLibraryDrawer();

    expect(html).toContain("ライブラリ操作");
    expect(html).not.toContain(">すべて<");
    expect(html).not.toContain(">Kin作成文書<");
    expect(html).not.toContain(">取込文書<");
    expect(html).not.toContain(">検索データ<");
  });

  it("renders the expanded action controls with import actions and aggregation modes", () => {
    const html = renderToStaticMarkup(
      <LibraryImportControls
        driveImportMenuOpen={false}
        setDriveImportMenuOpen={() => {}}
        onOpenGoogleDriveFolder={() => {}}
        onImportGoogleDriveFile={() => Promise.resolve()}
        onIndexGoogleDriveFolder={() => Promise.resolve()}
        onImportGoogleDriveFolder={() => Promise.resolve()}
        deviceInputId="device-import-test"
        onImportDeviceFile={() => Promise.resolve()}
        onImportDeviceImageFile={() => Promise.resolve()}
        deviceImportAccept=".txt,.md,.pdf,image/*"
        deviceImportDisabled={false}
        onShowAllLibraryItemsInChat={() => Promise.resolve()}
        onSendAllLibraryItemsToKin={() => Promise.resolve()}
        initialBulkActionsOpen
      />
    );

    expect(html).toContain("Google Drive");
    expect(html).toContain('aria-label="デバイスから取り込む"');
    expect(html).toContain(">デバイス<");
    expect(html).toContain("画面に表示");
    expect(html).toContain("Kinに送信");
    expect(html).toContain("Index");
    expect(html).toContain("Summary");
    expect(html).toContain("Summary + Detail");
    expect(html).not.toContain("Index + Summary");
    expect(html).not.toContain("disabled=\"\"");
  });

  it("uses mobile-safe wrapping styles for library rows", () => {
    const html = renderLibraryDrawer({
      referenceLibraryItems: [
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
      ],
      libraryReferenceCount: 1,
      isMobile: true,
    });

    expect(html).toContain("max-width:100%");
    expect(html).toContain("flex-wrap:wrap");
    expect(html).toContain("width:100%");
  });

  it("renders library item labels without mojibake", () => {
    const item: ReferenceLibraryItem = {
      id: "doc:1",
      sourceId: "doc:1",
      itemType: "ingested_file",
      title: "farmers 360 link",
      subtitle: "取込文書 / 04/25 19:01",
      filename: "farmers.txt",
      summary: "要約テキスト",
      excerptText: "本文",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const html = [
      renderLibraryDrawer({
        referenceLibraryItems: [item],
        libraryReferenceCount: 1,
      }),
      renderToStaticMarkup(
        <LibraryItemMetadata item={item} multipartSource={null} />
      ),
    ].join("");

    expect(html).toContain("取込文書");
    expect(html).toContain("タスクに使う");
    expect(html).toContain("ダウンロード");
    expect(html).toContain("全設定に従う");
    expect(html).toContain("ファイル名");
    expect(html).toContain(">↑<");
    expect(html).toContain(">↓<");
    expect(html).toContain(">×<");
    expect(html).toContain(">見<");
    expect(html).toContain(">送<");
    expect(html).toContain(">保<");
    expect(html).not.toMatch(/[郢ｧ邵ｺ隴∬叉陷ｿ驍ｵ陜ｨ驛｢髯ｷ髫ｴ遶奇ｨ滄圷]/u);
  });

  it("shows PPTX output only for presentation plans with slide design JSON", () => {
    const baseItem: ReferenceLibraryItem = {
      id: "doc:1",
      sourceId: "doc:1",
      itemType: "kin_created",
      artifactType: "presentation_plan",
      title: "PPT Design",
      subtitle: "設計書",
      summary: "summary",
      excerptText: "【PPT設計書】",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const emptyHtml = renderLibraryDrawer({
      referenceLibraryItems: [
        {
          ...baseItem,
          structuredPayload: {
            version: "0.1-presentation-task-plan",
            title: "PPT Design",
            slides: [],
          },
        },
      ],
      libraryReferenceCount: 1,
    });
    const renderableHtml = renderLibraryDrawer({
      referenceLibraryItems: [
        {
          ...baseItem,
          id: "doc:2",
          sourceId: "doc:2",
          structuredPayload: {
            version: "0.1-presentation-task-plan",
            title: "PPT Design",
            slides: [
              {
                slideNumber: 1,
                sectionLabel: "",
                title: "Title",
                keyMessage: "",
                supportingInfo: [],
                keyVisual: "",
                visualSupportingInfo: [],
                placementComposition: "中央にタイトル",
                layoutItems: [{ region: "タイトル", text: "Title" }],
                structuredContent: {
                  title: "Title",
                  mainMessage: "",
                  facts: [],
                  visual: { brief: "", supportingFacts: [] },
                  layout: {
                    instruction: "中央にタイトル",
                    elements: [{ region: "タイトル", text: "Title" }],
                  },
                },
              },
            ],
          },
        },
      ],
      libraryReferenceCount: 1,
    });

    expect(emptyHtml).not.toContain("PPTX出力");
    expect(renderableHtml).toContain("PPTX出力");
  });

  it("renders image library tab and keeps generated images out of the default library view", () => {
    const item: ReferenceLibraryItem = {
      id: "doc:image",
      sourceId: "image",
      itemType: "ingested_file",
      artifactType: "generated_image",
      title: "Image img_test",
      subtitle: "Image ID: img_test",
      summary: "生成画像",
      excerptText: "Image ID: img_test\n\nPrompt:\n生成プロンプト",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      structuredPayload: {
        version: "0.1-generated-image",
        imageId: "img_test",
        mimeType: "image/png",
        base64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        prompt: "生成プロンプト",
        createdAt: new Date().toISOString(),
      },
    };

    const html = renderLibraryDrawer({
      referenceLibraryItems: [item],
      libraryReferenceCount: 1,
    });

    expect(html).toContain(">画像<");
    expect(html).not.toContain("Image ID: img_test");
    expect(html).not.toContain("data:image/png;base64");
  });
});
