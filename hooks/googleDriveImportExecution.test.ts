import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  runDriveFileImport,
  runDriveFolderImport,
  runDrivePickedDocumentsImport,
  runDriveLibraryItemUpload,
} from "@/hooks/googleDriveImportExecution";
import {
  fetchDriveFileBlob,
  listDriveChildFolders,
  listDriveFolderChildren,
  uploadDriveBlobFile,
  uploadDriveTextFile,
} from "@/lib/app/google-drive/googleDriveApi";
import { requestFileIngest } from "@/lib/app/ingest/ingestClient";
import { resolveGeneratedImportSummary } from "@/lib/app/ingest/importSummaryGeneration";
import { buildLibraryItemDriveExport } from "@/lib/app/reference-library/referenceLibraryItemActions";

vi.mock("@/lib/app/google-drive/googleDriveApi", () => ({
  fetchDriveFileBlob: vi.fn(),
  listDriveChildFolders: vi.fn(),
  listDriveFolderChildren: vi.fn(),
  uploadDriveBlobFile: vi.fn(),
  uploadDriveTextFile: vi.fn(),
}));

vi.mock("@/lib/app/reference-library/referenceLibraryItemActions", () => ({
  buildLibraryItemDriveExport: vi.fn(),
}));

vi.mock("@/lib/app/ingest/ingestClient", () => ({
  requestFileIngest: vi.fn(),
  resolveIngestErrorMessage: vi.fn(({ data, fallback }) => data?.error || fallback),
  resolveIngestFileTitle: vi.fn(({ data, fallback }) => data?.result?.title || fallback),
}));

vi.mock("@/lib/app/ingest/importSummaryGeneration", () => ({
  resolveGeneratedImportSummary: vi.fn(),
}));

const ingestOptions = {
  kind: "text",
  mode: "compact",
  detail: "simple",
  readPolicy: "text_first",
  compactCharLimit: 1200,
  simpleImageCharLimit: 800,
} as const;

describe("runDrivePickedDocumentsImport", () => {
  it("dispatches picked Drive docs to folder and file imports", async () => {
    const importDriveFile = vi.fn(async () => {});
    const importDriveFolder = vi.fn(async () => {});

    await runDrivePickedDocumentsImport({
      mode: "folder_import",
      docs: [
        {
          id: "folder-1",
          name: "Project",
          mimeType: "application/vnd.google-apps.folder",
        },
        {
          id: "file-1",
          name: "notes.txt",
          mimeType: "text/plain",
        },
        {
          id: "image-1",
          name: "image.png",
          mimeType: "image/png",
        },
      ],
      importDriveFile,
      importDriveFolder,
    });

    expect(importDriveFolder).toHaveBeenCalledWith(
      { id: "folder-1", name: "Project" },
      "import"
    );
    expect(importDriveFile).toHaveBeenCalledWith({
      id: "file-1",
      name: "notes.txt",
      mimeType: "text/plain",
    });
    expect(importDriveFile).toHaveBeenCalledTimes(1);
  });
});

describe("runDriveFileImport", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("imports a Drive file through the shared ingest and document path", async () => {
    vi.mocked(fetchDriveFileBlob).mockResolvedValue(
      new Blob(["alpha beta"], { type: "text/plain" })
    );
    vi.mocked(requestFileIngest).mockResolvedValue({
      response: new Response("{}", { status: 200 }),
      data: {
        result: {
          title: "Parsed title",
          selectedLines: ["alpha", "beta"],
          kinCompact: ["compact summary"],
        },
        usage: {
          inputTokens: 3,
          outputTokens: 4,
          totalTokens: 7,
        },
      },
      resolvedKind: "text",
    });
    vi.mocked(resolveGeneratedImportSummary).mockResolvedValue({
      summary: "generated summary",
      summarySourceText: "alpha\nbeta",
      totalUsage: {
        inputTokens: 8,
        outputTokens: 9,
        totalTokens: 17,
      },
    });

    const recordIngestedDocument = vi.fn((document) => ({
      ...document,
      id: "stored-1",
      sourceType: "ingested_file" as const,
    }));
    const appendUiMessage = vi.fn();
    const applyIngestUsage = vi.fn();
    const focusGptPanel = vi.fn(() => true);

    await runDriveFileImport({
      file: {
        id: "drive-file-1",
        name: "notes.txt",
        mimeType: "text/plain",
      },
      ensureAccessToken: vi.fn(async () => "token-1"),
      ingestOptions,
      autoGenerateLibrarySummary: true,
      currentTaskId: "task-1",
      recordIngestedDocument,
      appendUiMessage,
      applyIngestUsage,
      focusGptPanel,
    });

    expect(fetchDriveFileBlob).toHaveBeenCalledWith({
      fileId: "drive-file-1",
      mimeType: "text/plain",
      accessToken: "token-1",
    });
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Parsed title",
        filename: "Parsed title",
        text: "alpha\nbeta",
        summary: "generated summary",
        taskId: "task-1",
      })
    );
    expect(applyIngestUsage).toHaveBeenCalledWith({
      inputTokens: 8,
      outputTokens: 9,
      totalTokens: 17,
    });
    expect(appendUiMessage).toHaveBeenCalledWith(
      "Google Driveファイルをライブラリに保存しました: Parsed title\n抽出文字数: 10 chars",
      "file_ingest"
    );
    expect(focusGptPanel).toHaveBeenCalled();
  });

  it("posts a Drive import failure message when ingest fails", async () => {
    vi.mocked(fetchDriveFileBlob).mockResolvedValue(
      new Blob(["alpha beta"], { type: "text/plain" })
    );
    vi.mocked(requestFileIngest).mockResolvedValue({
      response: new Response("{}", { status: 500 }),
      data: {
        error: "Drive ingest exploded.",
      },
      resolvedKind: "text",
    });

    const appendUiMessage = vi.fn();
    const applyIngestUsage = vi.fn();
    const recordIngestedDocument = vi.fn();
    const focusGptPanel = vi.fn(() => true);

    await runDriveFileImport({
      file: {
        id: "drive-file-2",
        name: "broken.txt",
        mimeType: "text/plain",
      },
      ensureAccessToken: vi.fn(async () => "token-2"),
      ingestOptions,
      autoGenerateLibrarySummary: true,
      recordIngestedDocument,
      appendUiMessage,
      applyIngestUsage,
      focusGptPanel,
    });

    expect(appendUiMessage).toHaveBeenCalledWith(
      "Google Drive import failed: Drive ingest exploded."
    );
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(applyIngestUsage).not.toHaveBeenCalled();
    expect(resolveGeneratedImportSummary).not.toHaveBeenCalled();
    expect(focusGptPanel).toHaveBeenCalled();
  });
});

describe("runDriveFolderImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("indexes a Drive folder without importing files in index mode", async () => {
    vi.mocked(listDriveFolderChildren).mockResolvedValue([
      {
        id: "folder-child",
        name: "Drafts",
        mimeType: "application/vnd.google-apps.folder",
        path: "Project/Drafts",
      },
      {
        id: "file-1",
        name: "notes.txt",
        mimeType: "text/plain",
        path: "Project/notes.txt",
      },
    ]);

    const appendUiMessage = vi.fn();
    const importDriveFile = vi.fn();
    const focusGptPanel = vi.fn(() => true);

    await runDriveFolderImport({
      folder: {
        id: "folder-1",
        name: "Project",
      },
      mode: "index",
      ensureAccessToken: vi.fn(async () => "token-folder"),
      appendUiMessage,
      importDriveFile,
      focusGptPanel,
    });

    expect(listDriveFolderChildren).toHaveBeenCalledWith({
      accessToken: "token-folder",
      folderId: "folder-1",
      currentPath: "Project",
    });
    expect(appendUiMessage.mock.calls[0]?.[0]).toContain(
      "Google Drive folder index: Project"
    );
    expect(importDriveFile).not.toHaveBeenCalled();
    expect(focusGptPanel).toHaveBeenCalled();
  });

  it("imports only importable files after posting the folder index", async () => {
    vi.mocked(listDriveFolderChildren).mockResolvedValue([
      {
        id: "file-1",
        name: "notes.txt",
        mimeType: "text/plain",
        path: "Project/notes.txt",
      },
      {
        id: "file-2",
        name: "image.png",
        mimeType: "image/png",
        path: "Project/image.png",
      },
      {
        id: "file-3",
        name: "doc.pdf",
        mimeType: "application/pdf",
        path: "Project/doc.pdf",
      },
    ]);

    const importDriveFile = vi.fn(async () => {});

    await runDriveFolderImport({
      folder: {
        id: "folder-2",
        name: "Project",
      },
      mode: "import",
      ensureAccessToken: vi.fn(async () => "token-folder"),
      appendUiMessage: vi.fn(),
      importDriveFile,
      focusGptPanel: vi.fn(() => true),
    });

    expect(importDriveFile).toHaveBeenCalledTimes(2);
    expect(importDriveFile).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: "file-1" }),
      { manageLoading: false }
    );
    expect(importDriveFile).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: "file-3" }),
      { manageLoading: false }
    );
  });
});

describe("runDriveLibraryItemUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildLibraryItemDriveExport).mockReturnValue({
      fileName: "Project notes.txt",
      text: "export body",
    });
    vi.mocked(uploadDriveTextFile).mockResolvedValue({
      id: "upload-1",
      name: "Project notes.txt",
      webViewLink: "https://drive.example/upload-1",
    });
    vi.mocked(uploadDriveBlobFile).mockResolvedValue({
      id: "upload-2",
      name: "Project deck.pptx",
      webViewLink: "https://drive.example/upload-2",
    });
  });

  it("uploads to the configured parent folder when no child folders exist", async () => {
    vi.mocked(listDriveChildFolders).mockResolvedValue([]);
    const appendUiMessage = vi.fn();
    const focusGptPanel = vi.fn(() => true);

    const result = await runDriveLibraryItemUpload({
      item: { id: "item-1", title: "Project notes" } as never,
      folderId: "parent-folder",
      ensureAccessToken: vi.fn(async () => "upload-token"),
      promptForDestination: vi.fn(),
      appendUiMessage,
      focusGptPanel,
    });

    expect(result).toBe("uploaded");
    expect(uploadDriveTextFile).toHaveBeenCalledWith({
      accessToken: "upload-token",
      folderId: "parent-folder",
      fileName: "Project notes.txt",
      text: "export body",
    });
    expect(appendUiMessage).toHaveBeenCalledWith(
      "Google Drive uploaded: Project notes.txt -> configured folder"
    );
    expect(focusGptPanel).toHaveBeenCalled();
  });

  it("uploads presentation JSON and the latest generated PPTX", async () => {
    vi.mocked(listDriveChildFolders).mockResolvedValue([]);
    vi.mocked(buildLibraryItemDriveExport).mockReturnValue({
      fileName: "pres_1.presentation.json",
      text: "{\"kind\":\"kin.presentation\"}\n",
      mimeType: "application/json",
    });
    vi.mocked(uploadDriveTextFile).mockResolvedValue({
      id: "upload-json",
      name: "pres_1.presentation.json",
      webViewLink: "https://drive.example/upload-json",
    });
    const pptxBlob = new Blob(["pptx bytes"], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const fetchMock = vi.fn(async () => new Response(pptxBlob));
    vi.stubGlobal("fetch", fetchMock);

    const appendUiMessage = vi.fn();

    const result = await runDriveLibraryItemUpload({
      item: {
        id: "item-presentation",
        title: "Project deck",
        artifactType: "presentation",
        excerptText: JSON.stringify({
          kind: "kin.presentation",
          version: "0.1",
          documentId: "pres_1",
          status: "rendered",
          spec: {
            version: "0.1",
            title: "Project deck",
            slides: [{ type: "title", title: "Project deck" }],
          },
          patches: [],
          outputs: [
            {
              id: "pptx_1",
              format: "pptx",
              filename: "Project deck.pptx",
              path: "blob:https://app.example/pptx-1",
              createdAt: "2026-04-29T00:00:00.000Z",
              slideCount: 1,
            },
          ],
          previewText: "Slides: 1",
          summary: "Project deck",
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z",
        }),
      } as never,
      folderId: "parent-folder",
      ensureAccessToken: vi.fn(async () => "upload-token"),
      promptForDestination: vi.fn(),
      appendUiMessage,
      focusGptPanel: vi.fn(() => true),
    });

    expect(result).toBe("uploaded");
    expect(fetchMock).toHaveBeenCalledWith("blob:https://app.example/pptx-1");
    expect(uploadDriveTextFile).toHaveBeenCalledWith({
      accessToken: "upload-token",
      folderId: "parent-folder",
      fileName: "pres_1.presentation.json",
      text: "{\"kind\":\"kin.presentation\"}\n",
      mimeType: "application/json",
    });
    expect(uploadDriveBlobFile).toHaveBeenCalledWith({
      accessToken: "upload-token",
      folderId: "parent-folder",
      fileName: "Project deck.pptx",
      blob: pptxBlob,
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    expect(appendUiMessage).toHaveBeenCalledWith(
      "Google Drive uploaded: pres_1.presentation.json, Project deck.pptx -> configured folder"
    );
  });

  it("regenerates presentation PPTX when the stored Blob URL is unavailable", async () => {
    vi.mocked(listDriveChildFolders).mockResolvedValue([]);
    vi.mocked(buildLibraryItemDriveExport).mockReturnValue({
      fileName: "pres_2.presentation.json",
      text: "{\"kind\":\"kin.presentation\"}\n",
      mimeType: "application/json",
    });
    vi.mocked(uploadDriveTextFile).mockResolvedValue({
      id: "upload-json",
      name: "pres_2.presentation.json",
      webViewLink: "https://drive.example/upload-json",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: {
              contentBase64: Buffer.from("regenerated pptx").toString("base64"),
              mimeType:
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            },
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    await runDriveLibraryItemUpload({
      item: {
        id: "item-presentation",
        title: "Project deck",
        artifactType: "presentation",
        excerptText: JSON.stringify({
          kind: "kin.presentation",
          version: "0.1",
          documentId: "pres_2",
          status: "rendered",
          spec: {
            version: "0.1",
            title: "Project deck",
            slides: [{ type: "title", title: "Project deck" }],
          },
          patches: [],
          outputs: [
            {
              id: "pptx_1",
              format: "pptx",
              filename: "Project deck.pptx",
              path: "blob:https://app.example/expired",
              createdAt: "2026-04-29T00:00:00.000Z",
              slideCount: 1,
            },
          ],
          previewText: "Slides: 1",
          summary: "Project deck",
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z",
        }),
      } as never,
      folderId: "parent-folder",
      ensureAccessToken: vi.fn(async () => "upload-token"),
      promptForDestination: vi.fn(),
      appendUiMessage: vi.fn(),
      focusGptPanel: vi.fn(() => true),
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "blob:https://app.example/expired");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/presentation-render",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(uploadDriveBlobFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "Project deck.pptx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      })
    );
    const blob = vi.mocked(uploadDriveBlobFile).mock.calls[0]?.[0].blob;
    await expect(blob?.text()).resolves.toBe("regenerated pptx");
  });

  it("uploads presentation plan text and generated PPTX", async () => {
    vi.mocked(listDriveChildFolders).mockResolvedValue([]);
    vi.mocked(buildLibraryItemDriveExport).mockReturnValue({
      fileName: "PPT Design - Cotton.txt",
      text: "presentation plan text",
      mimeType: "text/plain",
    });
    vi.mocked(uploadDriveTextFile).mockResolvedValue({
      id: "upload-plan",
      name: "PPT Design - Cotton.txt",
      webViewLink: "https://drive.example/upload-plan",
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: {
            contentBase64: Buffer.from("plan pptx").toString("base64"),
            mimeType:
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runDriveLibraryItemUpload({
      item: {
        id: "item-plan",
        sourceId: "ingest:plan-1",
        title: "PPT Design - Cotton",
        artifactType: "presentation_plan",
        excerptText: [
          "【PPT設計書】",
          "概要: Cotton",
          "",
          "■ スライド設計",
          "- 1. タイトルスライド",
          "- - タイトル：Cotton",
          "- - キーメッセージ：Overview",
          "- - ビジュアル：Cotton field",
          "- - 配置：タイトル中央",
        ].join("\n"),
      } as never,
      folderId: "parent-folder",
      ensureAccessToken: vi.fn(async () => "upload-token"),
      promptForDestination: vi.fn(),
      appendUiMessage: vi.fn(),
      focusGptPanel: vi.fn(() => true),
    });

    expect(result).toBe("uploaded");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/presentation-render",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(uploadDriveTextFile).toHaveBeenCalledWith({
      accessToken: "upload-token",
      folderId: "parent-folder",
      fileName: "PPT Design - Cotton.txt",
      text: "presentation plan text",
      mimeType: "text/plain",
    });
    expect(uploadDriveBlobFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "PPT Design - Cotton.pptx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      })
    );
    const blob = vi.mocked(uploadDriveBlobFile).mock.calls[0]?.[0].blob;
    await expect(blob?.text()).resolves.toBe("plan pptx");
  });

  it("uploads to a selected child folder", async () => {
    vi.mocked(listDriveChildFolders).mockResolvedValue([
      {
        id: "child-1",
        name: "Drafts",
        mimeType: "application/vnd.google-apps.folder",
        path: "Drafts",
      },
      {
        id: "child-2",
        name: "Published",
        mimeType: "application/vnd.google-apps.folder",
        path: "Published",
      },
    ]);

    const result = await runDriveLibraryItemUpload({
      item: { id: "item-2", title: "Project notes" } as never,
      folderId: "parent-folder",
      ensureAccessToken: vi.fn(async () => "upload-token"),
      promptForDestination: vi.fn(() => "2"),
      appendUiMessage: vi.fn(),
      focusGptPanel: vi.fn(() => true),
    });

    expect(result).toBe("uploaded");
    expect(uploadDriveTextFile).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "child-2",
      })
    );
  });

  it("cancels upload when child-folder selection is cancelled", async () => {
    vi.mocked(listDriveChildFolders).mockResolvedValue([
      {
        id: "child-1",
        name: "Drafts",
        mimeType: "application/vnd.google-apps.folder",
        path: "Drafts",
      },
    ]);

    const appendUiMessage = vi.fn();
    const result = await runDriveLibraryItemUpload({
      item: { id: "item-3", title: "Project notes" } as never,
      folderId: "parent-folder",
      ensureAccessToken: vi.fn(async () => "upload-token"),
      promptForDestination: vi.fn(() => null),
      appendUiMessage,
      focusGptPanel: vi.fn(() => true),
    });

    expect(result).toBe("cancelled");
    expect(uploadDriveTextFile).not.toHaveBeenCalled();
    expect(appendUiMessage).toHaveBeenCalledWith("Google Drive upload cancelled.");
  });

  it("cancels upload when child-folder selection is invalid", async () => {
    vi.mocked(listDriveChildFolders).mockResolvedValue([
      {
        id: "child-1",
        name: "Drafts",
        mimeType: "application/vnd.google-apps.folder",
        path: "Drafts",
      },
    ]);

    const appendUiMessage = vi.fn();
    const result = await runDriveLibraryItemUpload({
      item: { id: "item-4", title: "Project notes" } as never,
      folderId: "parent-folder",
      ensureAccessToken: vi.fn(async () => "upload-token"),
      promptForDestination: vi.fn(() => "9"),
      appendUiMessage,
      focusGptPanel: vi.fn(() => true),
    });

    expect(result).toBe("cancelled");
    expect(uploadDriveTextFile).not.toHaveBeenCalled();
    expect(appendUiMessage).toHaveBeenCalledWith(
      "Google Drive upload cancelled: invalid child-folder selection."
    );
  });
});
