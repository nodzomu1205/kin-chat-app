import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LibraryDrawer, {
  DbDuplicateGroupsPanel,
  DbOrganizationPanel,
  buildDbCandidateState,
  buildDbDocumentStats,
  filterDbDocuments,
  moveDbDocumentInOrder,
} from "@/components/panels/gpt/LibraryDrawer";
import { LibraryImportControls } from "@/components/panels/gpt/LibraryDrawerControls";
import LibraryItemMetadata from "@/components/panels/gpt/LibraryItemMetadata";
import { GPT_LIBRARY_DRAWER_TEXT } from "@/components/panels/gpt/gptUiText";
import type { ReferenceLibraryItem } from "@/types/chat";

function renderLibraryDrawer(
  props: Partial<React.ComponentProps<typeof LibraryDrawer>> = {}
) {
  return renderToStaticMarkup(
    <LibraryDrawer
      multipartAssemblies={[]}
      referenceLibraryItems={[]}
      libraryRagIndexStates={{}}
      libraryReferenceCount={0}
      libraryRagCandidateCount={100}
      imageLibraryReferenceCount={0}
      sourceDisplayCount={1}
      selectedTaskLibraryItemId=""
      onSelectTaskLibraryItem={() => {}}
      onMoveLibraryItem={() => {}}
      onChangeLibraryItemMode={() => {}}
      onIndexLibraryItemForRag={() => Promise.resolve()}
      onStartAskAiModeSearch={() => Promise.resolve()}
      onImportYouTubeTranscript={() => Promise.resolve()}
      onSendYouTubeTranscriptToKin={() => Promise.resolve()}
      onDownloadMultipartAssembly={() => {}}
      onDeleteMultipartAssembly={() => {}}
      onDownloadStoredDocument={() => {}}
      onDeleteStoredDocument={() => {}}
      onDeleteSearchHistoryItem={() => {}}
      onSaveSearchHistoryItem={() => {}}
      onSaveStoredDocument={() => {}}
      onShowLibraryItemInChat={() => {}}
      onSendLibraryItemToKin={() => Promise.resolve()}
      onShowAllLibraryItemsInChat={() => Promise.resolve()}
      onSendAllLibraryItemsToKin={() => Promise.resolve()}
      onDownloadLibraryItem={() => Promise.resolve()}
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

  it("uses the controlled library view instead of replaying a stale image-view request", () => {
    const items: ReferenceLibraryItem[] = [
      {
        id: "doc:1",
        sourceId: "doc-1",
        itemType: "ingested_file",
        title: "Normal library item",
        subtitle: "Document",
        summary: "Document summary",
        excerptText: "Document detail",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "img:1",
        sourceId: "img-1",
        itemType: "ingested_file",
        artifactType: "generated_image",
        title: "Image library item",
        subtitle: "Image",
        summary: "Image summary",
        excerptText: "Image detail",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const html = renderLibraryDrawer({
      referenceLibraryItems: items,
      activeLibraryView: "library",
      libraryViewRequest: { view: "images", key: 1 },
    });

    expect(html).toContain("Normal library item");
    expect(html).not.toContain("Image library item");
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
    expect(html).toContain(GPT_LIBRARY_DRAWER_TEXT.download);
    expect(html).toContain(GPT_LIBRARY_DRAWER_TEXT.edit);
  });

  it("shows DB indexing state and action for text library cards", () => {
    const item: ReferenceLibraryItem = {
      id: "doc:rag",
      sourceId: "doc:rag",
      itemType: "ingested_file",
      title: "RAG target",
      subtitle: "Document",
      summary: "Summary",
      excerptText: "Body",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const html = renderLibraryDrawer({
      referenceLibraryItems: [item],
      libraryRagIndexStates: {
        [item.id]: {
          status: "indexed",
          itemUpdatedAt: item.updatedAt,
          chunkCount: 3,
        },
      },
    });

    expect(html).toContain("DB登録 3");
    expect(html).toContain(">DBへ送付</button>");
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

  it("summarizes and filters DB documents for scan-friendly DB tab views", () => {
    const documents = [
      {
        id: "doc-1",
        libraryItemId: "library-1",
        sourceId: "source-1",
        itemType: "ingested_file" as const,
        title: "Cotton traceability",
        summary: "Supply chain visibility",
        contentHash: "hash-1",
        chunks: [
          {
            id: "chunk-1",
            documentId: "doc-1",
            chunkIndex: 0,
            content: "farmers 360 link",
            tokenEstimate: 10,
          },
          {
            id: "chunk-2",
            documentId: "doc-1",
            chunkIndex: 1,
            content: "DPP evidence",
            tokenEstimate: 12,
          },
        ],
      },
      {
        id: "doc-2",
        libraryItemId: "library-2",
        sourceId: "source-2",
        itemType: "kin_created" as const,
        title: "School strategy",
        summary: "Returnee student options",
        contentHash: "hash-2",
        chunks: [],
      },
    ];

    expect(
      buildDbDocumentStats(documents, [
        {
          id: "log-1",
          createdAt: new Date().toISOString(),
          query: "cotton",
          usageBucket: "chat",
          contextChars: 10,
          matches: [
            {
              documentId: "doc-1",
              chunkId: "chunk-1",
              libraryItemId: "library-1",
              title: "Cotton traceability",
              chunkIndex: 0,
              contentPreview: "farmers 360 link",
            },
          ],
        },
      ])
    ).toMatchObject({
      documentCount: 2,
      chunkCount: 2,
      referencedDocumentCount: 1,
      referencedChunkCount: 1,
    });
    expect(filterDbDocuments(documents, "farmers")).toHaveLength(1);
    expect(filterDbDocuments(documents, "returnee")[0]?.id).toBe("doc-2");
    expect(filterDbDocuments(documents, "cotton farmers")[0]?.id).toBe("doc-1");
    expect(filterDbDocuments(documents, "cotton returnee")).toHaveLength(0);
  });

  it("marks DB candidate boundaries by cumulative chunk count and moves documents", () => {
    const documents = [
      {
        id: "doc-a",
        libraryItemId: "library-a",
        sourceId: "source-a",
        itemType: "ingested_file" as const,
        title: "A",
        summary: "",
        contentHash: "hash-a",
        chunks: Array.from({ length: 7 }, (_, index) => ({
          id: `a-${index}`,
          documentId: "doc-a",
          chunkIndex: index,
          content: "a",
          tokenEstimate: 1,
        })),
      },
      {
        id: "doc-b",
        libraryItemId: "library-b",
        sourceId: "source-b",
        itemType: "ingested_file" as const,
        title: "B",
        summary: "",
        contentHash: "hash-b",
        chunks: Array.from({ length: 4 }, (_, index) => ({
          id: `b-${index}`,
          documentId: "doc-b",
          chunkIndex: index,
          content: "b",
          tokenEstimate: 1,
        })),
      },
    ];

    const candidateState = buildDbCandidateState(documents, 10);
    expect(candidateState.documents.get("doc-a")).toMatchObject({
      included: true,
      start: 0,
      end: 7,
    });
    expect(candidateState.documents.get("doc-b")).toMatchObject({
      included: true,
      start: 7,
      end: 11,
    });
    expect(candidateState.includedChunkCount).toBe(11);
    expect(
      moveDbDocumentInOrder({
        order: ["doc-a", "doc-b"],
        documents,
        documentId: "doc-b",
        candidateChunkLimit: 10,
        action: "top",
      })
    ).toEqual(["doc-b", "doc-a"]);
    expect(
      moveDbDocumentInOrder({
        order: ["doc-a", "doc-b"],
        documents,
        documentId: "doc-a",
        candidateChunkLimit: 10,
        action: "candidateBottom",
      })
    ).toEqual(["doc-b", "doc-a"]);
  });

  it("keeps DB tab text and pills mobile-safe", () => {
    const html = renderLibraryDrawer({
      activeLibraryView: "db",
      libraryRagCandidateCount: 20,
    });

    expect(html).toContain("総チャンク");
    expect(html).toContain("直近参照");
    expect(html).toContain("min-width:0");
    expect(html).toContain("overflow-wrap:anywhere");
    expect(html).not.toContain("総chunk");
  });

  it("does not hide DB duplicate or organization candidates behind local display caps", () => {
    const duplicateGroups = Array.from({ length: 12 }, (_, index) => ({
      id: `duplicate-${index}`,
      reason: "similar_chunk" as const,
      documentIds: [`doc-${index}`, `doc-${index + 1}`],
      chunkIds: [`chunk-${index}`],
      titles: [`Document ${index}`],
      documentCount: 2,
      chunkCount: 1,
      totalTokenEstimate: 100,
      similarity: 0.8,
    }));
    const organizationGroups = Array.from({ length: 14 }, (_, index) => ({
      id: `organization-${index}`,
      label: `Group ${index}`,
      category: "category",
      theme: "theme",
      documentType: "note",
      entities: [],
      documentIds: [`doc-${index}`, `doc-${index + 1}`],
      sourceDocumentCount: 2,
      sourceChunkCount: 4,
      sourceTokenEstimate: 200,
      targetTitle: `Organized ${index}`,
      suggestedChunkCount: 3,
      rationale: "",
    }));

    const duplicateHtml = renderToStaticMarkup(
      <DbDuplicateGroupsPanel
        groups={duplicateGroups}
        compactingGroupId=""
        onCompactDocuments={() => {}}
      />
    );
    const organizationHtml = renderToStaticMarkup(
      <DbOrganizationPanel
        analysis={{
          configured: true,
          documentsScanned: 14,
          chunksScanned: 56,
          sourceTokenEstimate: 2800,
          groups: organizationGroups,
        }}
        loading={false}
        result={null}
        organizingGroupId=""
        selectionMode
        selectedDocumentCount={14}
        visibleDocumentCount={14}
        allVisibleDocumentsSelected={false}
        onToggleSelectionMode={() => {}}
        onSelectVisibleDocuments={() => {}}
        onAnalyze={() => {}}
        onCreateOrganizedDocument={() => {}}
      />
    );

    expect(duplicateHtml).toContain("Document 11");
    expect(duplicateHtml).not.toContain("他 6 件の候補があります");
    expect(organizationHtml).toContain("Organized 13");
  });
});
